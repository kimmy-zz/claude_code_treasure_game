import { useState, type FormEvent } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { api, type User } from '../api';
import closedChest from '../assets/treasure_closed.png';
import { SegmentedControl } from './SegmentedControl';

interface AuthScreenProps {
  onSignedIn: (user: User) => void;
  onGuest: () => void;
}

type Mode = 'signin' | 'signup';

export function AuthScreen({ onSignedIn, onGuest }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formRef, animate] = useAnimate<HTMLFormElement>();
  const reduceMotion = useReducedMotion();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = mode === 'signin'
        ? await api.signIn(username, password)
        : await api.signUp(username, password);
      onSignedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      // The classic macOS "wrong password" head-shake
      if (!reduceMotion) animate(formRef.current, { x: [0, -14, 12, -9, 6, -3, 0] }, { duration: 0.45 });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  return (
    <div className="auth">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <motion.div
          className="app-icon"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
        >
          <img src={closedChest} alt="" />
        </motion.div>

        <h1 className="auth-title">{mode === 'signin' ? 'Sign in to Treasure Hunt' : 'Create Your Account'}</h1>
        <p className="auth-subtitle">Save your scores and climb the leaderboard.</p>

        <SegmentedControl
          label="Account"
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'signin', label: 'Sign In' },
            { value: 'signup', label: 'Create Account' },
          ]}
        />

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="field-group">
            <div className="field">
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder=" "
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <label htmlFor="username">Username</label>
            </div>
            <div className="field">
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder=" "
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <label htmlFor="password">Password</label>
            </div>
          </div>

          {error ? (
            <p className="form-error" role="alert">{error}</p>
          ) : mode === 'signup' && (
            <p className="form-error" style={{ color: 'var(--label-2)' }}>
              Use 3–20 letters, numbers or underscores, and a password of at least 6 characters.
            </p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-large btn-block"
            style={{ marginTop: 20 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <span className="spinner" aria-label="Loading" /> : mode === 'signin' ? 'Continue' : 'Create Account'}
          </motion.button>
        </form>

        <div className="auth-guest">
          <button type="button" className="link" onClick={onGuest}>
            Continue as Guest
          </button>
          Your scores won’t be saved.
        </div>
      </motion.div>
    </div>
  );
}
