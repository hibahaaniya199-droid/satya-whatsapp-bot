require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

console.log("SATYA Starting... GROQ exists:", !!GROQ_KEY);

async function askSatya(text) {
  const low = text.toLowerCase();
  if (low.includes("who created") || low.includes("who made") || low.includes("chatgpt") || low.includes("who are you")) {
    return "I was created by HIBA HAANIYA.F — Founder & CEO of SATYA 🛡️ I am SATYA real-time truth agent.";
  }
  if (!groq) return "Add GROQ_API_KEY in Railway Variables please — SATYA by HIBA HAANIYA.F";
  try {
    const chat = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You are SATYA by HIBA HAANIYA.F. Real-time truth checker. Verdict first TRUE/FALSE/HALF-TRUE/BREAKING/NOT VERIFIED. Max 4 lines with proof." },
        { role: "user", content: text }
      ],
      temperature: 0.2,
      max_tokens: 350
    });
    return chat.choices[0].message.content;
  } catch (e) {
    console.log("Groq Error:", e.message);
    return "SATYA busy, try again — by HIBA HAANIYA.F";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      console.log("=== SCAN THIS QR WITH WHATSAPP ===");
      qrcode.generate(qr, { small: false });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('SATYA WHATSAPP CONNECTED ✅');
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (!m.message || m.key.fromMe) continue;
      const txt = m.message.conversation || m.message.extendedTextMessage?.text;
      if (!txt) continue;
      const jid = m.key.remoteJid;
      console.log("Got:", txt);
      await sock.sendPresenceUpdate('composing', jid);
      const reply = await askSatya(txt);
      await sock.sendMessage(jid, { text: reply });
    }
  });
}

startBot();
