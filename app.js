require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let sitemapLinks = [];
let indexedData = [];

// -- טעינת sitemap index וכל תתי המפות --
async function loadSitemap() {
  try {
    const resp = await axios.get('https://compassgrill.co.il/sitemap.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const result = await xml2js.parseStringPromise(resp.data);

    let allUrls = [];

    // אם זה אינדקס מפות (sitemapindex)
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      // טען כל sitemap משני
      for (const sm of result.sitemapindex.sitemap) {
        if (sm.loc && sm.loc[0]) {
          try {
            const smResp = await axios.get(sm.loc[0], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            const smRes = await xml2js.parseStringPromise(smResp.data);
            if (smRes.urlset && smRes.urlset.url) {
              const urls = smRes.urlset.url.map(u => u.loc[0]);
              allUrls.push(...urls);
            }
          } catch (ex) {
            console.error('Error loading sub-sitemap:', sm.loc[0]);
          }
        }
      }
    }
    // או urlset רגיל
    else if (result.urlset && result.urlset.url) {
      allUrls = result.urlset.url.map(u => u.loc[0]);
    }

    sitemapLinks = allUrls;

    indexedData = allUrls.map(url => {
      let cleanName = url.replace('https://compassgrill.co.il/', '').replace(/[-_]/g, ' ').replace(/\/$/, '');
      cleanName = decodeURIComponent(cleanName).replace(/product|category|blog|sale|faq|contact|about/gi, '');
      return {
        url,
        words: cleanName.split(/[\s/]/).filter(Boolean).map(w => w.toLowerCase()),
        label: cleanName
      };
    });
    console.log(`Loaded ${allUrls.length} links from sitemap`);
  } catch (e) {
    console.error('Could not load sitemap:', e.message);
  }
}
loadSitemap();
setInterval(loadSitemap, 6 * 60 * 60 * 1000);

// -- פונקציית חיפוש חכמה --
function findBestMatch(userMsg) {
  const msg = userMsg.toLowerCase();

  if (msg.includes('מבצע') || msg.includes('sale')) {
    return `מחפש מבצעים? הנה כל הדילים באתר: <a href="https://compassgrill.co.il/sale/" target="_blank">https://compassgrill.co.il/sale/</a>`;
  }
  if (msg.match(/(\d+)\s*להבות/)) {
    return `רוצה גריל לפי מספר להבות? ראה כאן: <a href="https://compassgrill.co.il/product-category/gas-grills/" target="_blank">גרילי גז</a>`;
  }
  if (msg.match(/(משפחה|קטן|גדול|ליחיד)/)) {
    return `מחפש מוצר לפי גודל? ממליץ להסתכל על כל סוגי הגרילים, ניתן לסנן לפי גודל באתר: <a href="https://compassgrill.co.il/product-category/gas-grills/" target="_blank">גרילים</a>`;
  }
  if (msg.includes('אביזר') || msg.includes('אביזרים')) {
    return `מגוון אביזרים לגריל — ראה כאן: <a href="https://compassgrill.co.il/product-category/accessories/" target="_blank">אביזרים</a>`;
  }
  if (msg.includes('בשר') || msg.includes('בקר')) {
    return `לכל מוצרי הבשר: <a href="https://compassgrill.co.il/product-category/beef/" target="_blank">בשר בקר</a>`;
  }
  if (msg.includes('עוף') || msg.includes('פרגית')) {
    return `למוצרי העוף: <a href="https://compassgrill.co.il/product-category/chicken/" target="_blank">עוף ופרגיות</a>`;
  }
  if (msg.includes('בלוג') || msg.includes('מתכון')) {
    return `לטיפים ומתכונים: <a href="https://compassgrill.co.il/blog/" target="_blank">בלוג מתכונים וטיפים</a>`;
  }

  let scored = indexedData.map(item => {
    let score = 0;
    for (let word of msg.split(' ')) {
      if (word.length < 2) continue;
      if (item.words.includes(word)) score += 3;
      if (item.label.includes(word)) score += 2;
      if (item.url.includes(word)) score += 1;
    }
    return { ...item, score };
  }).filter(item => item.score > 0);

  if (scored.length) {
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    return `מצאתי משהו שיכול להתאים: <a href="${best.url}" target="_blank">${best.label}</a>`;
  }

  return null;
}

// -- מסלול הצ'אט --
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  const answer = findBestMatch(userMessage);
  if (answer) {
    return res.json({ reply: `😊 ${answer}` });
  } else {
    return res.json({ reply: "מצטער, לא מצאתי מוצר מתאים באתר שלנו. אשמח לעזור לך לבחור אם תפרט מה התקציב, למה זה מיועד, או איזה מוצר חיפשת." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
