require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const Groq = require('groq-sdk');

const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
const PHONE_NUMBER = process.env.PHONE_NUMBER; // Your 【entity-WhatsApp¦canonical_name=WhatsApp】 number like 919876543210
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;

console.log("SATYA Starting... PHONE:", PHONE_NUMBER);

async function askSatya(text) {
  const low = text.toLowerCase();
  if (low.includes("who created") || low.includes("who made") || low.includes("chatgpt") || low.includes("who are you")) {
    return "I was created by HIBA HAANIYA.F — Founder & CEO of SATYA 🛡️ I am SATYA real-time truth agent.";
  }
  if (!groq) return "Add GROQ_API_KEY in Railway — SATYA by HIBA HAANIYA.F";
  try {
    const chat = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You are SATYA by HIBA HAANIYA.F. Real-time truth checker. Verdict first TRUE/FALSE etc. Max 4 lines." },
        { role: "user", content: text }
      ],
      max_tokens: 350
    });
    return chat.choices[0].message.content;
  } catch (e) {
    console.log(e.message);
    return "Try again bestie — SATYA by HIBA HAANIYA.F";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false });
  sock.ev.on('creds.update', saveCreds);

  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log("==========================================");
        console.log("YOUR WHATSAPP PAIRING CODE IS:", code);
        console.log("Go to WhatsApp > Linked Devices > Link with phone number > Enter this code");
        console.log("==========================================");
      } catch (e) { console.log("Pairing code error:", e.message); }
    }, 3000);
  }

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
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
