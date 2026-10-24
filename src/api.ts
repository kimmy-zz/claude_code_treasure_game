export interface User {
  username: string;
  avatarUrl: string | null;
}

export interface GameRecord {
  id: number;
  score: number;
  result: 'win' | 'loss' | 'tie';
  foundTreasure: number;
  playedAt: string;
}

export interface GameStats {
  total: number;
  wins: number;
  losses: number;
  ties: number;
  best: number | null;
}

export interface LeaderboardRow {
  username: string;
  avatarUrl: string | null;
  score: number;
  playedAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  me: () => request<{ user: User | null }>('/me'),
  signUp: (username: string, password: string) =>
    request<User>('/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signIn: (username: string, password: string) =>
    request<User>('/signin', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signOut: () => request<{ ok: true }>('/signout', { method: 'POST' }),
  saveGame: (score: number, foundTreasure: boolean) =>
    request<{ ok: true }>('/games', { method: 'POST', body: JSON.stringify({ score, foundTreasure }) }),
  uploadAvatar: (image: string) =>
    request<User>('/me/avatar', { method: 'PUT', body: JSON.stringify({ image }) }),
  removeAvatar: () => request<User>('/me/avatar', { method: 'DELETE' }),
  myGames: () => request<{ games: GameRecord[]; stats: GameStats }>('/games'),
  leaderboard: () => request<{ leaderboard: LeaderboardRow[] }>('/leaderboard'),
};
