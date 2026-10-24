import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Equal, Skull, Trophy } from 'lucide-react';
import { api, type GameRecord, type GameStats, type LeaderboardRow } from '../api';
import { formatMoney, formatPlayedAt } from '../format';
import { Avatar } from './ProfileAvatar';
import { SegmentedControl } from './SegmentedControl';

interface HistoryPanelProps {
  username: string;
  // Bump this to refetch after a game is saved
  refreshKey: number;
}

type Tab = 'games' | 'leaderboard';

const resultInfo = {
  win: { label: 'Won', Icon: Trophy },
  loss: { label: 'Lost', Icon: Skull },
  tie: { label: 'Tie', Icon: Equal },
} as const;

// Number of recent games shown before "Show All"
const COLLAPSED_GAMES = 5;

// Pick the green/red text class for a score
function scoreClass(score: number) {
  return score > 0 ? 'text-gain' : score < 0 ? 'text-loss' : '';
}

export function HistoryPanel({ username, refreshKey }: HistoryPanelProps) {
  const [tab, setTab] = useState<Tab>('games');
  const [games, setGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.myGames(), api.leaderboard()])
      .then(([mine, board]) => {
        setGames(mine.games);
        setStats(mine.stats);
        setLeaderboard(board.leaderboard);
        setError('');
      })
      .catch(err => setError(err.message));
  }, [refreshKey]);

  const visibleGames = showAll ? games : games.slice(0, COLLAPSED_GAMES);

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{tab === 'games' ? 'Your Games' : 'Leaderboard'}</h2>
        <SegmentedControl
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'games', label: 'My Games' },
            { value: 'leaderboard', label: 'Top 10' },
          ]}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {tab === 'games' ? (
            <>
              {stats && (
                <div className="stats">
                  <div className="stat">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Played</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{stats.wins}</div>
                    <div className="stat-label">Won</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">
                      {stats.total ? `${Math.round((stats.wins / stats.total) * 100)}%` : '–'}
                    </div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{stats.best !== null ? formatMoney(stats.best) : '–'}</div>
                    <div className="stat-label">Best</div>
                  </div>
                </div>
              )}

              {games.length === 0 ? (
                <div className="list empty">No games yet. Open a chest to get started.</div>
              ) : (
                <ul className="list">
                  {visibleGames.map(g => {
                    const { label, Icon } = resultInfo[g.result];
                    return (
                      <li key={g.id} className="row">
                        <span className={`row-icon ${g.result}`}>
                          <Icon size={18} strokeWidth={2.4} />
                        </span>
                        <div className="row-main">
                          <div className="row-title">{label}</div>
                          <div className="row-subtitle">{formatPlayedAt(g.playedAt)}</div>
                        </div>
                        <span className={`row-trailing ${scoreClass(g.score)}`}>{formatMoney(g.score)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {games.length > COLLAPSED_GAMES && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button type="button" className="link" style={{ fontSize: 15 }} onClick={() => setShowAll(s => !s)}>
                    {showAll ? 'Show Less' : `Show All ${games.length}`}
                  </button>
                </div>
              )}
            </>
          ) : leaderboard.length === 0 ? (
            <div className="list empty">No scores yet. Be the first.</div>
          ) : (
            <ul className="list is-ranked">
              {leaderboard.map((row, i) => {
                const isMe = row.username === username;
                return (
                  <li key={`${row.username}-${row.playedAt}-${i}`} className={`row${isMe ? ' is-me' : ''}`}>
                    <span className={`rank${i === 0 ? ' is-first' : ''}`}>{i + 1}</span>
                    <Avatar username={row.username} url={row.avatarUrl} size={32} />
                    <div className="row-main">
                      <div className="row-title">
                        {row.username}
                        {isMe && <span className="tag">You</span>}
                      </div>
                      <div className="row-subtitle">{formatPlayedAt(row.playedAt)}</div>
                    </div>
                    <span className={`row-trailing ${scoreClass(row.score)}`}>{formatMoney(row.score)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
