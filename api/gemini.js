// api/gemini.js
// Vercel serverless function. Keeps the Gemini API key off the client.
//
// Set GEMINI_API_KEY as an environment variable in your Vercel project
// (Project Settings > Environment Variables) — do NOT hardcode it here.
// Optionally set GEMINI_MODEL to override the default model.

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "ai" ? "model" : "user",
    parts: [{ text: m.text }],
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages, customKey } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages is required" });
    return;
  }

  const apiKey = (customKey && customKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "No Gemini API key configured on the server." });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: toGeminiContents(messages) }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Gemini request failed", reply: null });
      return;
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Server error contacting Gemini." });
  }
}
