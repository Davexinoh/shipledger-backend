const express = require('express');
const router = express.Router();
const { getGithubActivity } = require('../services/github');
const { createAttestation } = require('../services/eas');

const COOKIE_NAME = 'gh_token';

// // AUTH_GUARD — blocks unauthenticated requests before they can trigger on-chain writes
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  req.ghToken = token; // attach to request for downstream use
  next();
}

// // GET_PROFILE — public read, no auth needed
// token is read from cookie, not from query params (avoids logging in access logs)
router.get('/profile/:username', requireAuth, async (req, res) => {
  const { username } = req.params;

  try {
    const activity = await getGithubActivity(username, req.ghToken);
    res.json({ username, activity, fetched_at: Date.now() });
  } catch (err) {
    console.error('// PROFILE_ERROR', err.message);
    res.status(500).json({ error: 'profile_fetch_failed' });
  }
});

// // CREATE_ATTESTATION — requires auth, triggers on-chain write
router.post('/attest', requireAuth, async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'missing_or_invalid_username' });
  }

  try {
    const activity = await getGithubActivity(username.trim(), req.ghToken);
    const attestation = await createAttestation(username.trim(), activity);
    res.json({ success: true, attestation, fetched_at: Date.now() });
  } catch (err) {
    console.error('// ATTEST_ERROR', err.message);
    res.status(500).json({ error: 'attestation_failed', detail: err.message });
  }
});

// // GET_ATTESTATION_HISTORY
router.get('/history/:username', async (req, res) => {
  res.json({
    username: req.params.username,
    attestations: [],
    note: 'EAS GraphQL query coming in v1.1',
    fetched_at: Date.now(),
  });
});

module.exports = router;
