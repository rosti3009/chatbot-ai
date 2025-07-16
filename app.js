require('dotenv').config(); // מוסיף את משתני הסביבה מקובץ .env

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const apiKey = process.env.OPENAI_API_KEY; // נשלף מהסביבה/קובץ .env

  if (!apiKey) {
    console.error("לא מוגדר OPENAI_API_KEY בקובץ .env או ב־Environment.");
    return res.status(500).json({ error: "מפתח API לא מוגדר בשרת." });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "אתה בוט שירות לקוחות חכם של [שם העסק שלך] בעברית. ענה ללקוחות בשפה ידידותית, ותן עצות ומידע." },
          { role: "user", content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (
      response.data &&
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message &&
      response.data.choices[0].message.content
    ) {
      res.json({ reply: response.data.choices[0].message.content });
    } else {
      console.error('לא התקבלה תשובה תקינה מ-OpenAI:', response.data);
      res.json({ reply: "מצטער, לא הצלחתי לקבל תשובה. נסה שוב או פנה לשירות." });
    }
  } catch (err) {
    if (err.response) {
      console.error('OpenAI API Error:', err.response.data);
      res.status(500).json({
        error: 'שגיאה בתקשורת עם OpenAI',
        details: err.response.data
      });
    } else {
      console.error('Error:', err.message);
      res.status(500).json({
        error: 'שגיאת מערכת',
        details: err.message
      });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
