const express = require('express');
const router = express.Router();
const { getGithubActivity } = require('../services/github');
const { createAttestation } = require('../services/eas');

// // GET_PROFILE
router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const activity = await getGithubActivity(username, req.query.token);
    res.json({ username, activity, fetched_at: Date.now() });
  } catch (err) {
    console.error('// PROFILE_ERROR', err.message);
    res.status(500).json({ error: 'profile_fetch_failed' });
  }
});

// // CREATE_ATTESTATION
router.post('/attest', async (req, res) => {
  const { username, token } = req.body;

  if (!username || !token) {
    return res.status(400).json({ error: 'missing_username_or_token' });
  }

  try {
    const activity = await getGithubActivity(username, token);
    const attestation = await createAttestation(username, activity);
    res.json({ success: true, attestation, fetched_at: Date.now() });
  } catch (err) {
    console.error('// ATTEST_ERROR', err.message);
    res.status(500).json({ error: 'attestation_failed' });
  }
});

// // GET_ATTESTATIONS
router.get('/history/:username', async (req, res) => {
  res.json({
    username: req.params.username,
    attestations: [],
    note: 'EAS query coming in v1.1',
    fetched_at: Date.now(),
  });
});

module.exports = router;