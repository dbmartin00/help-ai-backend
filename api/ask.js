// File: api/ask.js
import fetch from "node-fetch";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_API = process.env.DATA_API;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { question } = req.body;

    // Fetch your data
    const response = await fetch(DATA_API);
    const data = await response.json();

    // Aggregate data
    const aggregated = data.reduce((acc, item) => {
      const { splitName, impression_date, impression_count } = item;
      if (!acc[splitName]) acc[splitName] = [];
      acc[splitName].push({
        date: impression_date,
        count: Number(impression_count),
      });
      return acc;
    }, {});

    const dataString = JSON.stringify(aggregated);

    // Query OpenAI
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a data analyst assistant. Answer questions about feature flag impressions.",
        },
        { role: "user", content: `Data: ${dataString}\nQuestion: ${question}` },
      ],
      max_completion_tokens: 400,
    });

    // Return the answer
    res.status(200).json({ answer: gptResponse.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}

