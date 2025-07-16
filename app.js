const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // קבצי האתר

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const apiKey = process.env.OPENAI_API_KEY; // נקרא מהסביבה ב-Render

  if (!apiKey) {
    console.error("API KEY לא מוגדר ב-Environment!");
    return res.status(500).json({ error: "לא מוגדר מפתח API בשרת. בדוק את Render Environment Variables." });
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

    // לוג לבדיקת תשובה מה-API
    console.log('OpenAI Response:', JSON.stringify(response.data));

    // בדוק שהתשובה קיימת
    if (
      response.data &&
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message &&
      response.data.choices[0].message.content
    ) {
      res.json({ reply: response.data.choices[0].message.content });
    } else {
      // טיפול במקרה שאין תשובה תקינה
      console.error('No reply from OpenAI!', response.data);
      res.json({ reply: "מצטער, לא הצלחתי לקבל תשובה. נסה שוב או פנה לשירות." });
    }
  } catch (err) {
    // לוג שגיאה מפורט
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
