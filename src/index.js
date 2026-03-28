require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

// // MIDDLEWARE
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(
  require('cors')({
    origin: process.env.FRONTEND_URL,
    credentials: true, // required for httpOnly cookies to flow cross-origin
  })
);

// // ROUTES
app.use('/auth', require('./routes/auth'));
app.use('/attestation', require('./routes/attestation'));

// // HEALTH
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shipledger-backend' });
});

// // GLOBAL_ERROR_HANDLER
app.use((err, req, res, next) => {
  console.error('// UNHANDLED_ERROR', err.message);
  res.status(500).json({ error: 'internal_server_error' });
});

// // START
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`// SHIPLEDGER_BACKEND running on port ${PORT}`);
});
