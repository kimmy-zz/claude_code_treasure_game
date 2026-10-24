import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, LogOut, Trash2 } from 'lucide-react';
import { api, type User } from '../api';

const AVATAR_SIZE = 256;

// Center-crop the picked image to a square and shrink it, so uploads stay small
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = AVATAR_SIZE;
      canvas.getContext('2d')!.drawImage(
        img,
        (img.width - side) / 2, (img.height - side) / 2, side, side,
        0, 0, AVATAR_SIZE, AVATAR_SIZE,
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a readable image.'));
    };
    img.src = url;
  });
}

interface AvatarProps {
  username: string;
  url: string | null;
  size: number;
}

// Round profile photo, or the user's initial on a gray gradient like Contacts
export function Avatar({ username, url, size }: AvatarProps) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {url ? <img src={url} alt="" /> : username.charAt(0).toUpperCase()}
    </span>
  );
}

interface ProfileAvatarProps {
  user: User;
  onChange: (user: User) => void;
  onSignOut: () => void;
}

// Avatar button in the nav bar that opens the account menu (photo + sign out)
export function ProfileAvatar({ user, onChange, onSignOut }: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  // Close the menu on an outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await api.uploadAvatar(await resizeToDataUrl(file)));
      setToast('Photo Updated');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setMenuOpen(false);
    try {
      onChange(await api.removeAvatar());
      setToast('Photo Removed');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not remove the photo.');
    }
  };

  const pickPhoto = () => {
    setMenuOpen(false);
    inputRef.current?.click();
  };

  return (
    <div className="account" ref={rootRef}>
      <motion.button
        type="button"
        className="avatar-button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        style={{ opacity: busy ? 0.5 : 1 }}
      >
        <Avatar username={user.username} url={user.avatarUrl} size={32} />
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="menu"
            role="menu"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          >
            <div className="menu-header">
              <Avatar username={user.username} url={user.avatarUrl} size={44} />
              <div>
                <div className="menu-name">{user.username}</div>
                <div className="menu-caption">Treasure Hunt Account</div>
              </div>
            </div>
            <button type="button" role="menuitem" className="menu-item" onClick={pickPhoto}>
              <Camera size={16} />
              {user.avatarUrl ? 'Change Photo…' : 'Add Photo…'}
            </button>
            {user.avatarUrl && (
              <button type="button" role="menuitem" className="menu-item is-destructive" onClick={handleRemove}>
                <Trash2 size={16} />
                Remove Photo
              </button>
            )}
            <div className="menu-divider" />
            <button type="button" role="menuitem" className="menu-item" onClick={onSignOut}>
              <LogOut size={16} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -16, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
