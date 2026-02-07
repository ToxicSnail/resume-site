const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*')) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'GET'],
  })
);

app.use(express.json({ limit: '10kb' }));

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, subject, message, page } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }

  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  const text =
    `Новая заявка с сайта:\n` +
    `Имя: ${name}\n` +
    `Email: ${email}\n` +
    `Тема: ${subject}\n` +
    `Сообщение: ${message}\n` +
    `Страница: ${page || 'n/a'}`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(502).json({ ok: false, error: 'Telegram error' });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
