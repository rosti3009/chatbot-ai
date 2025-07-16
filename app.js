const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // קבצי האתר

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const apiKey = 'const apiKey = process.env.OPENAI_API_KEY;
'; // הכנס כאן את המפתח שלך

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "אתה בוט שירות לקוחות חכם של [שם העסק שלך] בעברית. ענה ללקוחות בשפה ידידותית, ותן עצות ומידע." },
        { role: "user", content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'Error talking to OpenAI', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
