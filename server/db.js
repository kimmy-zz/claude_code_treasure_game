const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'tie')),
    found_treasure INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id, played_at);
  CREATE INDEX IF NOT EXISTS idx_games_score ON games(score);
`);

// Migration: profile image columns (added after the initial schema)
const userColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userColumns.includes('avatar')) {
  db.exec(`
    ALTER TABLE users ADD COLUMN avatar BLOB;
    ALTER TABLE users ADD COLUMN avatar_type TEXT;
    ALTER TABLE users ADD COLUMN avatar_updated_at INTEGER;
  `);
}

module.exports = db;
