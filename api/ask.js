import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_API = process.env.DATA_API;

app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    const response = await fetch(DATA_API);
    const data = await response.json();

    const aggregated = data.reduce((acc, item) => {
      const { splitName, impression_date, impression_count } = item;
      if (!acc[splitName]) acc[splitName] = [];
      acc[splitName].push({
        date: impression_date,
        count: Number(impression_count)
      });
      return acc;
    }, {});

    const dataString = JSON.stringify(aggregated);

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a data analyst assistant. Answer questions about feature flag impressions." },
        { role: "user", content: `Data: ${dataString}\nQuestion: ${question}` }
      ],
      max_completion_tokens: 400
    });

    res.json({ answer: gptResponse.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default app;

