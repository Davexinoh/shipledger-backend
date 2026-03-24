const express = require('express');
const router = express.Router();
const axios = require('axios');

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
    return res.status(400).json({ error: 'missing_code' });
  }

  try {
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
      return res.status(400).json({ error: error || 'token_exchange_failed' });
    }

    // // GET_GITHUB_USER
    const userRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const { login, id, avatar_url } = userRes.data;

    // // REDIRECT_TO_FRONTEND_WITH_TOKEN
    const params = new URLSearchParams({
      username: login,
      github_id: id,
      avatar: avatar_url,
      token: access_token,
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/connect/success?${params}`
    );
  } catch (err) {
    console.error('// AUTH_ERROR', err.message);
    res.status(500).json({ error: 'auth_failed' });
  }
});

module.exports = router;