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

    // אינדקס מפות
    if (result.sitemapindex && result.sitemapindex.sitemap) {
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
    } else if (result.urlset && result.urlset.url) {
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

// -- פונקציית בינה אנושית משודרגת --
function findBestMatch(userMsg) {
  const msg = userMsg.toLowerCase().trim();

  // ברכות/פנייה אישית
  const greetings = [
    "שלום", "היי", "הי", "hi", "hello", "ערב טוב", "בוקר טוב", "צהריים טובים",
    "מה נשמע", "מה קורה", "מה שלומך", "מה העניינים", "הכל טוב", "מה המצב", "תודה"
  ];
  if (greetings.some(greet => msg.includes(greet))) {
    return "שלום! 😊 כאן COMPASSBOT של קומפס גריל. אשמח לעזור עם כל שאלה על מוצרים, מבצעים או המלצה אישית!";
  }

  // מי אתה/מה אתה
  if (msg.includes("בוט") || msg.includes("מי אתה") || msg.includes("מה אתה") || msg.includes("צ'אט") || msg.includes("האם אתה אמיתי")) {
    return "אני הבוט החכם של קומפס גריל – נותן ייעוץ ומידע אמיתי על כל מה שיש אצלנו באתר. שאל אותי על מוצרים, מבצעים, גרילים, בשרים, מתכונים ועוד!";
  }

  // שאלה כללית לעזרה
  if (msg.includes("עזרה") || msg.includes("צריך עזרה") || msg.includes("ממליץ") || msg.includes("מומלץ") || msg.includes("איזה לקנות") || msg.includes("מה כדאי")) {
    return `אשמח להמליץ! אפשר לשאול לפי קטגוריה (גריל, בשר, אביזרים), לפי תקציב, או לפי גודל (משפחה/יחיד). רוצה לראות מבצעים? <a href="https://compassgrill.co.il/sale/" target="_blank">לחץ כאן</a>, או תספר לי מה מעניין אותך!`;
  }

  // שאלות שכיחות — לוגיקה חכמה (משפחה/תקציב/שימוש)
  if (msg.includes('משפחה') || msg.includes('גדול')) {
    return `מחפש גריל למשפחה? ממליץ על גרילי גז 4–6 להבות. ראה מגוון כאן: <a href="https://compassgrill.co.il/product-category/gas-grills/" target="_blank">גרילים למשפחה</a>. אפשר לסנן לפי גודל ותקציב.`;
  }
  if (msg.includes('יחיד') || msg.includes('קטן') || msg.includes('קומפקטי')) {
    return `צריך גריל קטן או קומפקטי? יש לנו גם דגמים מצוינים ליחיד או למרפסת קטנה: <a href="https://compassgrill.co.il/product-category/gas-grills/" target="_blank">גרילים קטנים</a>.`;
  }
  if (msg.includes('תקציב')) {
    return `לכל תקציב יש פתרון! אם תגיד מה התקציב, אמליץ לך על דגמים מומלצים.`;
  }
  if (msg.includes('אביזר') || msg.includes('אביזרים')) {
    return `מחפש אביזרים לגריל? ראה את כל האביזרים כאן: <a href="https://compassgrill.co.il/product-category/accessories/" target="_blank">אביזרים</a>.`;
  }
  if (msg.includes('בשר') || msg.includes('בקר')) {
    return `רוצה להזמין בשר? כל מוצרי הבשר שלנו כאן: <a href="https://compassgrill.co.il/product-category/beef/" target="_blank">בשר בקר</a>.`;
  }
  if (msg.includes('עוף') || msg.includes('פרגית')) {
    return `רוצה להזמין עוף? עיין בכל מוצרי העוף והפרגית שלנו: <a href="https://compassgrill.co.il/product-category/chicken/" target="_blank">עוף ופרגיות</a>.`;
  }
  if (msg.includes('מבצע') || msg.includes('sale')) {
    return `רוצה מבצעים? ראה כאן: <a href="https://compassgrill.co.il/sale/" target="_blank">מבצעי החודש</a>.`;
  }
  if (msg.match(/(\d+)\s*להבות/)) {
    return `מחפש גריל לפי מספר להבות? ראה כאן: <a href="https://compassgrill.co.il/product-category/gas-grills/" target="_blank">גרילי גז</a>.`;
  }
  if (msg.includes('מתכון') || msg.includes('בלוג') || msg.includes('טיפ')) {
    return `רוצה מתכונים וטיפים? כנס לבלוג שלנו: <a href="https://compassgrill.co.il/blog/" target="_blank">בלוג מתכונים וטיפים</a>.`;
  }

  // חיפוש במפת האתר ע"פ מילים
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
    return `מצאתי מוצר/עמוד שיכול להתאים למה שחיפשת: <a href="${best.url}" target="_blank">${best.label}</a>`;
  }

  // ברירת מחדל – מענה אנושי
  return "לא הצלחתי להבין בדיוק למה אתה מתכוון. אשמח לעזור! תוכל לכתוב לי מה התקציב, איזה מוצר אתה מחפש, או אם יש משהו מסוים באתר שעניין אותך? 😊";
}

// -- מסלול הצ'אט --
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  const answer = findBestMatch(userMessage);
  res.json({ reply: answer });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
