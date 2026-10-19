require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const axios = require('axios');

const GROQ_KEY = process.env.GROQ_API_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY;
const groq = new Groq({ apiKey: GROQ_KEY });

async function askSatya(text) {
  const low = text.toLowerCase();
  if (low.includes("who created") || low.includes("who made") || low.includes("are you chatgpt") || low.includes("who are you")) {
    return "I was created by HIBA HAANIYA.F — Founder & CEO of SATYA. I am SATYA, your real-time truth agent 🛡️";
  }
  try {
    let searchText = "";
    if (TAVILY_KEY) {
      const res = await axios.post('https://api.tavily.com/search', {
        api_key: TAVILY_KEY,
        query: text,
        max_results: 3,
        include_answer: true
      });
      if (res.data.answer) searchText += res.data.answer + "\n";
      if (res.data.results) searchText += res.data.results.map(r => r.content.slice(0,300)).join("\n");
    }
    const chat = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You are SATYA by HIBA HAANIYA.F. Real-time truth agent. Verdict first: TRUE, FALSE, HALF-TRUE, BREAKING, NOT VERIFIED. Max 4 lines with proof." },
        { role: "user", content: `USER: ${text}\nSEARCH DATA: ${searchText}` }
      ],
      temperature: 0.2,
      max_tokens: 350
    });
    return chat.choices[0].message.content;
  } catch (e) {
    return "SATYA by HIBA HAANIYA.F is busy, try again bestie!";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("SCAN THIS QR WITH WHATSAPP:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('SATYA WHATSAPP CONNECTED ✅');
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!text) continue;
      const jid = msg.key.remoteJid;
      console.log(`Got: ${text}`);
      await sock.sendPresenceUpdate('composing', jid);
      const reply = await askSatya(text);
      await
