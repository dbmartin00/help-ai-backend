import express from "express";
import OpenAI from "openai";
import cors from "cors";
import { SplitFactory } from '@splitsoftware/splitio';

const factory = SplitFactory({
  core: {
    authorizationKey: process.env.SPLIT_AUTHORIZATION_KEY
  }
});

const client = factory.client();

await client.ready();
console.log('treatment', client.getTreatment('dmartin-ai', 'ai_prompts'));

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_API = process.env.DATA_API;

app.post("/ask", async (req, res) => {
  console.log("/ask called");

  const smoke = client.getTreatmentWithConfig('dmartin-ai', 'ai_prompts');
  const smokeJson = JSON.parse(smoke.config);
  console.log('smokeJson', smokeJson);

  try {
    const { question } = req.body;

    console.log("fetching impression data...");
    const response = await fetch(DATA_API);
    const data = await response.json();

    const aggregated = data.reduce((acc, item) => {
      const { splitName, impression_date, impression_count } = item;
      if (!acc[splitName]) acc[splitName] = [];
      acc[splitName].push({ date: impression_date, count: Number(impression_count) });
      return acc;
    }, {});

    const dataString = JSON.stringify(aggregated);

//    const gptResponse = await openai.chat.completions.create({
//      model: "gpt-4.1-mini",
//      messages: [
//        { role: "system", content: "You are a data analyst assistant. Answer questions about feature flag impressions." },
//        { role: "user", content: `Data: ${dataString}\nQuestion: ${question}` }
//      ],
//      max_completion_tokens: 400
//    });

    const result = client.getTreatmentWithConfig('dmartin-ai', 'ai_prompts');
    const json = JSON.parse(result.config);

    json.messages[1].content =
      `Data: ${dataString}\nQuestion: ${question}`;

    console.log('final json', json);

    const gptResponse = await openai.chat.completions.create(json);

    const answer = gptResponse.choices[0].message.content;
    console.log("answer:", answer);

    res.json({ answer });
  } catch (err) {
    console.error("Error in /ask:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default app;

//const PORT = process.env.PORT || 3000;

//app.listen(PORT, () => {
//  console.log(`Server running on http://localhost:${PORT}`);
//});
