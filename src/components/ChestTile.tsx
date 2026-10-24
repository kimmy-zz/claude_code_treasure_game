import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import closedChest from '../assets/treasure_closed.png';
import treasureChest from '../assets/treasure_opened.png';
import skeletonChest from '../assets/treasure_opened_skeleton.png';
import keyCursor from '../assets/key.png';

interface ChestTileProps {
  index: number;
  hasTreasure: boolean;
  isOpen: boolean;
  // The game is over: unopened chests can't be clicked and show what they held
  gameEnded: boolean;
  onOpen: () => void;
}

// How long the chest wiggles before its lid "opens"
const ANTICIPATION_MS = 260;
// Unopened chests reveal their contents after the opened one has finished animating
const REVEAL_MS = 900;

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const distance = 70 + (i % 3) * 22;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
});

const popSpring = { type: 'spring', stiffness: 520, damping: 24 } as const;

// One chest card: lifts on hover, wiggles when tapped, then pops open with a glow
export function ChestTile({ index, hasTreasure, isOpen, gameEnded, onOpen }: ChestTileProps) {
  const reduceMotion = useReducedMotion();
  const revealed = gameEnded && !isOpen;
  const [showInside, setShowInside] = useState(false);

  useEffect(() => {
    if (!isOpen && !revealed) return;
    const timer = setTimeout(() => setShowInside(true), isOpen ? ANTICIPATION_MS : REVEAL_MS);
    return () => clearTimeout(timer);
  }, [isOpen, revealed]);

  const interactive = !isOpen && !gameEnded;
  const celebrate = isOpen && showInside && hasTreasure;
  const art = showInside ? (hasTreasure ? treasureChest : skeletonChest) : closedChest;

  let artAnimation;
  if (!isOpen || reduceMotion) artAnimation = { rotate: 0, scale: 1, x: 0 };
  else if (!showInside) artAnimation = { rotate: [0, -6, 6, -4, 0], scale: [1, 1.05, 1.05, 1.03, 1] };
  else if (hasTreasure) artAnimation = { rotate: 0, scale: [1, 1.08, 1], x: 0 };
  else artAnimation = { rotate: 0, scale: 1, x: [0, -9, 9, -6, 6, -3, 0] };

  let caption: { key: string; text: string; className: string };
  if (isOpen && showInside) {
    caption = hasTreasure
      ? { key: 'gain', text: '+$100', className: 'is-gain' }
      : { key: 'loss', text: '−$50', className: 'is-loss' };
  } else if (revealed && showInside) {
    caption = { key: 'revealed', text: hasTreasure ? 'Treasure' : 'Skeleton', className: 'is-hint' };
  } else {
    caption = { key: 'hint', text: interactive ? 'Open' : ' ', className: 'is-hint' };
  }

  const label = showInside
    ? `Chest ${index + 1}: ${hasTreasure ? 'treasure' : 'skeleton'}`
    : `Open chest ${index + 1}`;

  return (
    <motion.button
      type="button"
      className={`tile${interactive ? ' is-closed' : ''}`}
      style={{ cursor: interactive ? `url(${keyCursor}) 24 24, pointer` : 'default' }}
      aria-label={label}
      disabled={!interactive}
      onClick={onOpen}
      animate={{ opacity: revealed && showInside ? 0.5 : 1 }}
      whileHover={interactive ? { y: -6 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28, opacity: { duration: 0.5 } }}
    >
      <AnimatePresence>
        {isOpen && showInside && (
          <motion.div
            className="tile-glow"
            style={{
              background: hasTreasure
                ? 'radial-gradient(circle at 50% 42%, var(--gold-glow), transparent 62%)'
                : 'radial-gradient(circle at 50% 42%, var(--red-fill), transparent 62%)',
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {celebrate && !reduceMotion && (
        <motion.div
          className="tile-shine"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      <motion.div
        className="tile-art"
        animate={artAnimation}
        transition={{ duration: showInside ? 0.45 : ANTICIPATION_MS / 1000, ease: 'easeInOut' }}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={art}
            src={art}
            alt=""
            draggable={false}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={popSpring}
          />
        </AnimatePresence>

        {celebrate && !reduceMotion && PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="particle"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.02 }}
          />
        ))}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={caption.key}
          className={`tile-caption ${caption.className}`}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={popSpring}
        >
          {caption.text}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

// Warm the browser cache so the opened-chest art is ready the instant a lid pops
export function preloadChestArt() {
  [treasureChest, skeletonChest].forEach(src => {
    new Image().src = src;
  });
}
