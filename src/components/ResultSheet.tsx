import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Equal, Skull, Trophy } from 'lucide-react';
import { formatMoney } from '../format';

interface ResultSheetProps {
  open: boolean;
  score: number;
  tries: number;
  foundTreasure: boolean;
  saved: boolean;
  onPlayAgain: () => void;
  onDismiss: () => void;
}

const sheetSpring = { type: 'spring', stiffness: 380, damping: 34 } as const;

// Describe the round in one friendly line, based on how many chests it took
function summary(foundTreasure: boolean, tries: number) {
  if (!foundTreasure) return 'No treasure this time.';
  if (tries === 1) return 'First try. Impressive.';
  if (tries === 2) return 'Found it on the second try.';
  return 'Found it in the very last chest.';
}

// End-of-game card that slides up like an iOS sheet over a blurred board
export function ResultSheet({ open, score, tries, foundTreasure, saved, onPlayAgain, onDismiss }: ResultSheetProps) {
  const outcome = score > 0 ? 'win' : score < 0 ? 'loss' : 'tie';
  const title = { win: 'You Win', loss: 'You Lose', tie: 'It’s a Tie' }[outcome];
  const Icon = { win: Trophy, loss: Skull, tie: Equal }[outcome];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="scrim"
            onClick={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div key="sheet" className="sheet-wrap">
            <motion.div
              className="sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="result-title"
              initial={{ y: '110%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '110%', opacity: 0.6, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
              transition={sheetSpring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) onDismiss();
              }}
            >
              <div className="sheet-grabber" />
              <motion.div
                className={`sheet-icon ${outcome}`}
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.12 }}
              >
                <Icon size={36} strokeWidth={2.2} />
              </motion.div>
              <h2 id="result-title" className="sheet-title">{title}</h2>
              <p className="sheet-body">{summary(foundTreasure, tries)}</p>
              <div className={`sheet-score ${score > 0 ? 'text-gain' : score < 0 ? 'text-loss' : ''}`}>
                {formatMoney(score)}
              </div>
              <p className="sheet-body" style={{ fontSize: 13, marginTop: 6 }}>
                {saved ? 'Saved to your games.' : 'Guest scores aren’t saved.'}
              </p>
              <div className="sheet-actions">
                <motion.button
                  type="button"
                  className="btn btn-primary btn-large btn-block"
                  onClick={onPlayAgain}
                  whileTap={{ scale: 0.97 }}
                  autoFocus
                >
                  Play Again
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-secondary btn-large btn-block"
                  onClick={onDismiss}
                  whileTap={{ scale: 0.97 }}
                >
                  View Board
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
