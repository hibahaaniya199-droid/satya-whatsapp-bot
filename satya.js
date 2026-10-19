require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const 【entity-axios¦canonical_name=axios】 = require('【entity-axios¦canonical_name=axios】');

// Accept BOTH spellings so it never crashes
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY || process.env.GROQ_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;

console.log("GROQ Key found:", !!GROQ_KEY);
console.log("TAVILY Key found:", !!TAVILY_KEY);

if (!GROQ_KEY) {
  console.log("WARNING: GROQ_API_KEY missing! Add it in Railway Variables");
}

const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

async function askSatya(text) {
  const low = text.toLowerCase();
  if (low.includes("who created") || low.includes("who made") || low.includes("are you chatgpt")) {
    return "I was created by HIBA HAANIYA.F — Founder & CEO of SATYA. I am SATYA 🛡️";
  }
  try {
    let searchText = "";
    if (TAVILY_KEY) {
      const res = await axios.post('https://api.tavily.com/search', {
        api_key: TAVILY_KEY,
        query: text,
        max_results: 2,
        include_answer: true
      });
      if (res.data.answer) searchText += res.data.answer + "\n";
    }
    if (!groq) return "SATYA is starting, please add GROQ_API_KEY in Railway! — by HIBA HAANIYA.F";
    
    const chat = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You are SATYA by HIBA HAANIYA.F. Real-time truth agent. Verdict first: TRUE/FALSE/HALF-TRUE etc. Max 4 lines." },
        { role: "user", content: `USER: ${text}\nSEARCH: ${searchText}` }
      ],
      max_tokens: 350
    });
    return chat.choices[0].message.content;
  } catch (e) {
    console.log("Error:", e.message);
    return "Try again bestie — SATYA by HIBA HAANIYA.F";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("SCAN THIS QR:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed, reconnect:", shouldReconnect);
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
      console.log(`Message: ${text}`);
      await sock.sendPresenceUpdate('composing', jid);
      const reply = await askSatya(text);
      await sock.sendMessage(jid, { text: reply });
    }
  });
}

console.log("Starting SATYA WhatsApp...");
startBot();
