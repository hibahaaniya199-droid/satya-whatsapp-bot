require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const 【entity-axios¦canonical_name=axios】 = require('【entity-axios¦canonical_name=axios】');

const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
const groq = new Groq({ apiKey: GROQ_KEY });

const PROMPT = `You are SATYA — ULTRA SMART TRUTH AGENT by HIBA HAANIYA.F, Founder & CEO of SATYA. NOT OpenAI/Google/【entity-Meta¦canonical_name=Meta】. Current Date: ${new Date().toLocaleString('en-IN')}. JOB: Real-time truth checker. Verdict FIRST: TRUE, FALSE, HALF-TRUE, BREAKING, NOT VERIFIED. Then short 2-line proof with source/date. Max 4 lines. Gen-Z bestie. If asked who made you: I was created by HIBA HAANIYA.F — Founder & CEO of SATYA. I am SATYA by HIBA HAANIYA.F`;

async function searchRealTime(query) {
    if (!TAVILY_KEY) return "";
    try {
        const res = await 【entity-axios¦canonical_name=axios】.post('https://api.tavily.com/search', {
            api_key: TAVILY_KEY,
            query: query,
            max_results: 4,
            search_depth: "advanced",
            include_answer: true,
            time_range: "day"
        });
        let text = "";
        if (res.data.answer) text += `SUMMARY: ${res.data.answer}\n`;
        if (res.data.results) text += res.data.results.map(r => `${r.title}: ${r.content.slice(0,350)}`).join("\n");
        return text;
    } catch (e) { return ""; }
}

async function askSatya(userText) {
    const low = userText.toLowerCase();
    if (low.includes("who created you") || low.includes("who made you") || low.includes("are you chatgpt")) {
        return "I was created by HIBA HAANIYA.F — Founder & CEO of SATYA. I am SATYA, your real-time truth agent by HIBA HAANIYA.F 🛡️";
    }
    let search = "";
    if (low.includes("weather")) search = await searchRealTime(`${userText} Chilakaluripet Andhra Pradesh weather today`);
    else if (low.includes("latest news") || low.includes("breaking news")) search = await searchRealTime("breaking news today India");
    else search = await searchRealTime(`fact check ${userText}`);

    for (let model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"]) {
        try {
            const chat = await groq.chat.completions.create({
                model,
                messages: [{ role: "system", content: PROMPT }, { role: "user", content: `USER: ${userText}\nSEARCH:\n${search}` }],
                temperature: 0.2,
                max_tokens: 300
            });
            return chat.choices[0].message.content;
        } catch (e) {}
    }
    return "Try again bestie! SATYA by HIBA HAANIYA.F busy!";
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { console.log("SCAN THIS QR:"); qrcode.generate(qr, { small: true }); }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') console.log('SATYA WHATSAPP CONNECTED! ✅');
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
