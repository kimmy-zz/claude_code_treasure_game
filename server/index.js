const crypto = require('node:crypto');
const express = require('express');
const db = require('./db');

const PORT = process.env.PORT || 3001;
const SESSION_DAYS = 7;

const app = express();
// Large enough for a resized profile image sent as a data URL
app.use(express.json({ limit: '1mb' }));

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 512 * 1024;

// --- Password hashing (scrypt, stored as "salt:hash") ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// --- Sessions ---
function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, Date.now() + maxAge);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge });
}

function currentUser(req) {
  const token = getCookie(req, 'sid');
  if (!token) return null;
  return db.prepare(`
    SELECT u.id, u.username, u.avatar_updated_at FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now()) || null;
}

function publicUser(user) {
  return {
    username: user.username,
    avatarUrl: user.avatar_updated_at
      ? `/api/users/${encodeURIComponent(user.username)}/avatar?v=${user.avatar_updated_at}`
      : null,
  };
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in first.' });
  req.user = user;
  next();
}

function validateCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 letters, numbers or underscores.' };
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  return { username, password };
}

// --- Auth routes ---
app.post('/api/signup', (req, res) => {
  const creds = validateCredentials(req.body);
  if (creds.error) return res.status(400).json({ error: creds.error });

  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(creds.username);
  if (exists) return res.status(409).json({ error: 'That username is already taken.' });

  const { lastInsertRowid } = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(creds.username, hashPassword(creds.password));
  startSession(res, Number(lastInsertRowid));
  res.status(201).json(publicUser({ username: creds.username }));
});

app.post('/api/signin', (req, res) => {
  const creds = validateCredentials(req.body);
  const user = creds.error ? null : db.prepare('SELECT * FROM users WHERE username = ?').get(creds.username);
  if (!user || !verifyPassword(creds.password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  startSession(res, user.id);
  res.json(publicUser(user));
});

app.post('/api/signout', (req, res) => {
  const token = getCookie(req, 'sid');
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

// --- Profile image ---
app.put('/api/me/avatar', requireUser, (req, res) => {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(req.body?.image || '');
  if (!match || !AVATAR_TYPES.includes(match[1])) {
    return res.status(400).json({ error: 'Please upload a PNG, JPEG or WebP image.' });
  }
  const data = Buffer.from(match[2], 'base64');
  if (data.length > MAX_AVATAR_BYTES) {
    return res.status(413).json({ error: 'Image is too large (max 512 KB).' });
  }
  const updatedAt = Date.now();
  db.prepare('UPDATE users SET avatar = ?, avatar_type = ?, avatar_updated_at = ? WHERE id = ?')
    .run(data, match[1], updatedAt, req.user.id);
  res.json(publicUser({ username: req.user.username, avatar_updated_at: updatedAt }));
});

app.delete('/api/me/avatar', requireUser, (req, res) => {
  db.prepare('UPDATE users SET avatar = NULL, avatar_type = NULL, avatar_updated_at = NULL WHERE id = ?')
    .run(req.user.id);
  res.json(publicUser({ username: req.user.username }));
});

app.get('/api/users/:username/avatar', (req, res) => {
  const row = db.prepare('SELECT avatar, avatar_type FROM users WHERE username = ?').get(req.params.username);
  if (!row?.avatar) return res.status(404).end();
  // URLs carry ?v=<timestamp>, so a new upload gets a new URL
  res.set({ 'Content-Type': row.avatar_type, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(Buffer.from(row.avatar));
});

// --- Game history & leaderboard ---
app.post('/api/games', requireUser, (req, res) => {
  const { score, foundTreasure } = req.body || {};
  if (!Number.isInteger(score) || typeof foundTreasure !== 'boolean') {
    return res.status(400).json({ error: 'Invalid game result.' });
  }
  const result = score > 0 ? 'win' : score < 0 ? 'loss' : 'tie';
  db.prepare('INSERT INTO games (user_id, score, result, found_treasure) VALUES (?, ?, ?, ?)')
    .run(req.user.id, score, result, foundTreasure ? 1 : 0);
  res.status(201).json({ ok: true });
});

app.get('/api/games', requireUser, (req, res) => {
  const games = db.prepare(`
    SELECT id, score, result, found_treasure AS foundTreasure, played_at AS playedAt
    FROM games WHERE user_id = ? ORDER BY id DESC LIMIT 20
  `).all(req.user.id);
  const stats = db.prepare(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(result = 'win'), 0) AS wins,
           COALESCE(SUM(result = 'loss'), 0) AS losses,
           COALESCE(SUM(result = 'tie'), 0) AS ties,
           MAX(score) AS best
    FROM games WHERE user_id = ?
  `).get(req.user.id);
  res.json({ games, stats });
});

app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.username, u.avatar_updated_at, g.score, g.played_at AS playedAt
    FROM games g JOIN users u ON u.id = g.user_id
    ORDER BY g.score DESC, g.played_at ASC LIMIT 10
  `).all();
  const leaderboard = rows.map(row => ({
    ...publicUser(row),
    score: row.score,
    playedAt: row.playedAt,
  }));
  res.json({ leaderboard });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
