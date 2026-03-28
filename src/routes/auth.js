const express = require('express');
const router = express.Router();
const axios = require('axios');

const COOKIE_NAME = 'gh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,        // JS cannot read this — prevents XSS token theft
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in prod
  sameSite: 'lax',       // prevents CSRF while allowing OAuth redirect
  maxAge: 1000 * 60 * 60 * 8, // 8 hours
};

// // GITHUB_OAUTH_INIT
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: 'read:user repo',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// // GITHUB_OAUTH_CALLBACK
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/connect/error?reason=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token, error } = tokenRes.data;

    if (error || !access_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/connect/error?reason=${error || 'token_exchange_failed'}`
      );
    }

    // // GET_GITHUB_USER
    const userRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const { login, id, avatar_url } = userRes.data;

    // // STORE_TOKEN_IN_HTTPONLY_COOKIE — token never touches the URL
    res.cookie(COOKIE_NAME, access_token, COOKIE_OPTIONS);

    // Redirect with only non-sensitive display data in the URL
    const params = new URLSearchParams({
      username: login,
      github_id: id,
      avatar: avatar_url,
    });

    res.redirect(`${process.env.FRONTEND_URL}/connect/success?${params}`);
  } catch (err) {
    console.error('// AUTH_ERROR', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/connect/error?reason=auth_failed`);
  }
});

// // GET_CURRENT_USER — frontend calls this after OAuth to confirm session
router.get('/me', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  // Return session confirmation — token stays on server side
  res.json({ authenticated: true });
});

// // LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ success: true });
});

module.exports = router;
