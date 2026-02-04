// server.js (or api/index.js for Vercel)
import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your data API endpoint
const DATA_API = process.env.DATA_API;

// POST /ask endpoint
app.post("/ask", async (req, res) => {
  console.log("/ask called");

  try {
    const { question } = req.body;

    // 1️⃣ Fetch the 180-day data
    console.log("fetching impression data...");
    const response = await fetch(DATA_API);
    console.log("fetched");
    const data = await response.json();
    console.log("parsed JSON");

    // 2️⃣ Aggregate data by splitName
    const aggregated = data.reduce((acc, item) => {
      const { splitName, impression_date, impression_count } = item;
      if (!acc[splitName]) acc[splitName] = [];
      acc[splitName].push({
        date: impression_date,
        count: Number(impression_count),
      });
      return acc;
    }, {});
    console.log("aggregated");

    // 3️⃣ Convert aggregated data to string
    const dataString = JSON.stringify(aggregated);
    console.log("converted to string for LLM");

    // 4️⃣ Ask OpenAI
    console.log("sending request to OpenAI...");
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // or gpt-5-mini
      messages: [
        {
          role: "system",
          content:
            "You are a data analyst assistant. Answer questions about feature flag impressions.",
        },
        {
          role: "user",
          content: `Data: ${dataString}\n\nQuestion: ${question}`,
        },
      ],
      max_completion_tokens: 400,
    });
    console.log("OpenAI response received");

    // 5️⃣ Return answer
    const answer = gptResponse.choices[0].message.content;
    console.log("answer:", answer);

    res.json({ answer });
  } catch (err) {
    console.error("Error in /ask:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/*
  ✅ IMPORTANT:
  Do NOT call app.listen() on Vercel.
  Just export the app.
*/

export default app;

