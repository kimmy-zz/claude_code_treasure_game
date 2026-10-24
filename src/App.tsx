import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, MotionConfig, motion, useSpring, useTransform } from 'motion/react';
import { AuthScreen } from './components/AuthScreen';
import { ChestTile, preloadChestArt } from './components/ChestTile';
import { HistoryPanel } from './components/HistoryPanel';
import { ProfileAvatar } from './components/ProfileAvatar';
import { ResultSheet } from './components/ResultSheet';
import { api, type User } from './api';
import { formatMoney } from './format';
import closedChest from './assets/treasure_closed.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

// Wait for the last chest's reveal animation before sliding up the result sheet
const RESULT_SHEET_DELAY_MS = 1300;

// Large score readout that counts smoothly to each new value
function ScoreValue({ score }: { score: number }) {
  const value = useSpring(score, { stiffness: 140, damping: 22 });
  const text = useTransform(value, v => formatMoney(Math.round(v)));

  useEffect(() => {
    value.set(score);
  }, [score, value]);

  return (
    <>
      <motion.span
        className={`score-value ${score > 0 ? 'text-gain' : score < 0 ? 'text-loss' : ''}`}
        aria-hidden="true"
      >
        {text}
      </motion.span>
      <span className="sr-only" aria-live="polite">{formatMoney(score)}</span>
    </>
  );
}

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  // Bumped each new game so the chest tiles remount and replay their entrance
  const [round, setRound] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  // null = not signed in yet, 'guest' = playing without saving
  const [user, setUser] = useState<User | 'guest' | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const savedRef = useRef(false);

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));

    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
    setSheetOpen(false);
    setRound(r => r + 1);
    savedRef.current = false;
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
    preloadChestArt();
  }, []);

  // Restore an existing session (cookie) on load
  useEffect(() => {
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  // Save each finished game once for signed-in players (guests are not saved)
  useEffect(() => {
    if (!gameEnded || savedRef.current || !user || user === 'guest') return;
    savedRef.current = true;
    const foundTreasure = boxes.some(box => box.isOpen && box.hasTreasure);
    api.saveGame(score, foundTreasure)
      .then(() => setHistoryKey(k => k + 1))
      .catch(err => console.error('Failed to save game:', err));
  }, [gameEnded, user, score, boxes]);

  // Present the result sheet once the reveal animations have played
  useEffect(() => {
    if (!gameEnded) return;
    const timer = setTimeout(() => setSheetOpen(true), RESULT_SHEET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [gameEnded]);

  const openBox = (boxId: number) => {
    if (gameEnded) return;
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.isOpen) return;

    new Audio(box.hasTreasure ? chestOpenSound : evilLaughSound).play();
    // A light haptic tap where supported (Android browsers)
    navigator.vibrate?.(box.hasTreasure ? [12, 60, 12] : 24);

    const updatedBoxes = boxes.map(b => (b.id === boxId ? { ...b, isOpen: true } : b));
    setBoxes(updatedBoxes);
    setScore(s => s + (box.hasTreasure ? 100 : -50));

    // Check if treasure is found or all boxes are opened
    if (box.hasTreasure || updatedBoxes.every(b => b.isOpen)) {
      setGameEnded(true);
    }
  };

  const dismissSheet = useCallback(() => setSheetOpen(false), []);

  const handleSignOut = async () => {
    if (user !== 'guest') await api.signOut().catch(() => {});
    setUser(null);
    initializeGame();
  };

  if (!authChecked) return null;

  return (
    <MotionConfig reducedMotion="user">
      {!user ? (
        <AuthScreen
          onSignedIn={signedIn => { setUser(signedIn); initializeGame(); }}
          onGuest={() => { setUser('guest'); initializeGame(); }}
        />
      ) : (
        <>
          <nav className="nav">
            <div className="nav-inner">
              <div className="nav-brand">
                <img src={closedChest} alt="" />
                Treasure Hunt
              </div>
              <div className="nav-trailing">
                {user === 'guest' ? (
                  <>
                    <span>Guest</span>
                    <motion.button
                      type="button"
                      className="btn btn-primary btn-small"
                      onClick={handleSignOut}
                      whileTap={{ scale: 0.95 }}
                    >
                      Sign In
                    </motion.button>
                  </>
                ) : (
                  <ProfileAvatar user={user} onChange={setUser} onSignOut={handleSignOut} />
                )}
              </div>
            </div>
          </nav>

          <main className="page">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow">Three chests. One treasure.</p>
              <h1 className="headline">Find the gold.</h1>
              <p className="subhead">
                One chest is full of treasure. The other two are home to something less friendly.
              </p>
              <div className="chips">
                <span className="chip">
                  <span className="chip-dot" style={{ background: 'linear-gradient(180deg, #ffd60a, #ff9f0a)' }} />
                  Treasure +$100
                </span>
                <span className="chip">
                  <span className="chip-dot" style={{ background: '#8e8e93' }} />
                  Skeleton −$50
                </span>
              </div>
            </motion.div>

            <div className="score">
              <div className="score-label">Score</div>
              <ScoreValue score={score} />
            </div>

            <div className="board">
              {boxes.map((box, index) => (
                <motion.div
                  key={`${round}-${box.id}`}
                  initial={{ opacity: 0, y: 28, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.08 + index * 0.07 }}
                >
                  <ChestTile
                    index={index}
                    hasTreasure={box.hasTreasure}
                    isOpen={box.isOpen}
                    gameEnded={gameEnded}
                    onOpen={() => openBox(box.id)}
                  />
                </motion.div>
              ))}
            </div>

            <div style={{ minHeight: 76, marginTop: 28 }}>
              <AnimatePresence>
                {gameEnded && !sheetOpen && (
                  <motion.button
                    type="button"
                    className="btn btn-primary btn-large"
                    style={{ minWidth: 200 }}
                    onClick={initializeGame}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
                  >
                    Play Again
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {user === 'guest' ? (
              <p className="subhead" style={{ fontSize: 15, marginTop: 40 }}>
                You’re playing as a guest.{' '}
                <button type="button" className="link" style={{ fontSize: 15 }} onClick={handleSignOut}>
                  Sign in
                </button>{' '}
                to save your scores.
              </p>
            ) : (
              <HistoryPanel username={user.username} refreshKey={historyKey} />
            )}
          </main>

          <ResultSheet
            open={sheetOpen}
            score={score}
            tries={boxes.filter(b => b.isOpen).length}
            foundTreasure={boxes.some(b => b.isOpen && b.hasTreasure)}
            saved={user !== 'guest'}
            onPlayAgain={initializeGame}
            onDismiss={dismissSheet}
          />
        </>
      )}
    </MotionConfig>
  );
}
