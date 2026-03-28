# ShipLedger Backend

GitHub activity attestation engine on Base via EAS.

## Folder Structure

```
shipledger-backend/
├── src/
│   ├── index.js              # Express app entry point
│   ├── routes/
│   │   ├── auth.js           # GitHub OAuth flow
│   │   └── attestation.js    # Activity + EAS attestation routes
│   └── services/
│       ├── github.js         # Octokit GitHub data fetcher
│       └── eas.js            # EAS on-chain attestation writer
├── .env.example
├── package.json
└── README.md
```

## Setup

```bash
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/github` | — | Start OAuth flow |
| GET | `/auth/github/callback` | — | OAuth callback (sets httpOnly cookie) |
| GET | `/auth/me` | cookie | Check session status |
| POST | `/auth/logout` | cookie | Clear session |
| GET | `/attestation/profile/:username` | cookie | Fetch GitHub activity |
| POST | `/attestation/attest` | cookie | Create on-chain attestation |
| GET | `/attestation/history/:username` | — | Attestation history (v1.1) |
| GET | `/health` | — | Health check |

## Frontend Integration

### 1. Trigger OAuth Login

```js
// Redirect the user to start the GitHub OAuth flow
window.location.href = 'http://localhost:4000/auth/github';
```

### 2. Handle OAuth Callback (`/connect/success` page)

```js
// The backend redirects here after OAuth.
// Token is stored in httpOnly cookie automatically — you don't touch it.
// Only non-sensitive display data is in the URL.

const params = new URLSearchParams(window.location.search);
const user = {
  username: params.get('username'),
  github_id: params.get('github_id'),
  avatar: params.get('avatar'),
};

// Store display data in your state manager (Zustand, Context, localStorage, etc.)
localStorage.setItem('shipledger_user', JSON.stringify(user));
```

### 3. Make Authenticated API Calls

```js
// CRITICAL: Always include credentials: 'include' so the httpOnly cookie is sent
const BASE_URL = 'http://localhost:4000';

// Check if user is authenticated
const checkAuth = async () => {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    credentials: 'include',
  });
  return res.ok; // true = authenticated
};

// Fetch GitHub activity profile
const fetchProfile = async (username) => {
  const res = await fetch(`${BASE_URL}/attestation/profile/${username}`, {
    credentials: 'include',
  });
  return res.json();
};

// Create attestation (on-chain write — takes a few seconds)
const attest = async (username) => {
  const res = await fetch(`${BASE_URL}/attestation/attest`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json();
};

// Logout
const logout = async () => {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  localStorage.removeItem('shipledger_user');
};
```

### 4. React Example (Vite + React)

```jsx
// src/api/shipledger.js
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const api = (path, opts = {}) =>
  fetch(`${BASE}${path}`, { credentials: 'include', ...opts });

export const login = () => (window.location.href = `${BASE}/auth/github`);
export const logout = () => api('/auth/logout', { method: 'POST' });
export const getMe = () => api('/auth/me').then((r) => r.json());
export const getProfile = (u) => api(`/attestation/profile/${u}`).then((r) => r.json());
export const attest = (username) =>
  api('/attestation/attest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  }).then((r) => r.json());
```

```jsx
// src/pages/connect/success.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConnectSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const user = {
      username: params.get('username'),
      github_id: params.get('github_id'),
      avatar: params.get('avatar'),
    };
    localStorage.setItem('shipledger_user', JSON.stringify(user));
    navigate('/dashboard');
  }, [navigate]);

  return <p>Connecting...</p>;
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | From your GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From your GitHub OAuth App |
| `GITHUB_REDIRECT_URI` | Must match exactly what's registered in GitHub |
| `RPC_URL` | Base Sepolia RPC (default: `https://sepolia.base.org`) |
| `EAS_CONTRACT_ADDRESS` | EAS contract on Base Sepolia |
| `SCHEMA_UID` | Your registered schema UID on EAS |
| `ATTESTER_PRIVATE_KEY` | Wallet that signs attestations (fund with testnet ETH) |
| `PORT` | Server port (default: 4000) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Your frontend origin (exact — used for CORS + redirects) |
