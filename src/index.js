require('dotenv').config();
const express = require('express');
const app = express();

// // MIDDLEWARE
app.use(express.json());
app.use(require('cors')({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// // ROUTES
app.use('/auth', require('./routes/auth'));
app.use('/attestation', require('./routes/attestation'));

// // HEALTH
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shipledger-backend' });
});

// // START
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`// SHIPLEDGER_BACKEND running on port ${PORT}`);
});