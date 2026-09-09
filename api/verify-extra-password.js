// api/verify-extra-password.js
// Vercel serverless function. Checks a submitted password against the
// EXTRA_PASSWORD environment variable, and lets the client re-verify a
// previously granted access without ever seeing the real password.
//
// Set EXTRA_PASSWORD as an environment variable in your Vercel project.
// If you ever change it, everyone's saved access is automatically invalidated
// (the stored hash from the old password no longer matches).

import { createHash } from "crypto";

function hash(str) {
  return createHash("sha256").update(str).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const correct = process.env.EXTRA_PASSWORD || "";
  const { action, password, hash: submittedHash } = req.body || {};

  if (action === "submit") {
    if (!correct) { res.status(500).json({ ok: false, error: "EXTRA_PASSWORD is not set on the server." }); return; }
    if (password === correct) {
      res.status(200).json({ ok: true, hash: hash(correct) });
    } else {
      res.status(200).json({ ok: false });
    }
    return;
  }

  if (action === "check") {
    const ok = !!correct && submittedHash === hash(correct);
    res.status(200).json({ ok });
    return;
  }

  res.status(400).json({ ok: false });
}
