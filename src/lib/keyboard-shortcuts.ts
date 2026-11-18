'use client';

/**
 * Keyboard shortcuts for Genius Sound.
 * Register shortcuts in components using useKeyboardShortcuts hook.
 */

type KeyCombo = string; // "cmd+s", "ctrl+z", "shift+delete", etc.
type ShortcutHandler = (e: KeyboardEvent) => void;

const shortcuts = new Map<KeyCombo, ShortcutHandler[]>();

/** Normalize key combo (Cmd vs Ctrl cross-platform) */
function normalizeKey(combo: string): string {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return combo.replace(/^cmd/, isMac ? 'cmd' : 'ctrl');
}

/** Get key combo from KeyboardEvent */
function getKeyCombo(e: KeyboardEvent): string {
  const keys: string[] = [];
  if (e.ctrlKey) keys.push('ctrl');
  if (e.shiftKey) keys.push('shift');
  if (e.altKey) keys.push('alt');
  if (e.metaKey && !e.ctrlKey) keys.push('cmd');

  const key = e.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(e.key.toLowerCase())) {
    keys.push(key === 'enter' ? 'return' : key);
  }

  return keys.join('+');
}

/** Register a keyboard shortcut */
export function registerShortcut(combo: KeyCombo, handler: ShortcutHandler): () => void {
  const normalized = normalizeKey(combo);
  if (!shortcuts.has(normalized)) {
    shortcuts.set(normalized, []);
  }
  shortcuts.get(normalized)!.push(handler);

  // Return unregister function
  return () => {
    const handlers = shortcuts.get(normalized);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  };
}

/** Global keyboard event listener */
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
      return;
    }

    const combo = getKeyCombo(e);
    const handlers = shortcuts.get(combo);

    if (handlers && handlers.length > 0) {
      e.preventDefault();
      handlers.forEach(h => h(e));
    }
  });
}

/** Common shortcuts */
export const common = {
  SAVE: 'cmd+s',
  UNDO: 'cmd+z',
  REDO: 'cmd+shift+z',
  DELETE: 'delete',
  ESCAPE: 'escape',
  ENTER: 'return',
  SPACE: ' ',
  ARROW_UP: 'arrowup',
  ARROW_DOWN: 'arrowdown',
  ARROW_LEFT: 'arrowleft',
  ARROW_RIGHT: 'arrowright',
};

/** React hook for using keyboard shortcuts in components */
export function useKeyboardShortcuts(shortcuts: { [key: string]: () => void }) {
  if (typeof window === 'undefined') return;

  React.useEffect(() => {
    const unregister = Object.entries(shortcuts).map(([combo, handler]) => {
      return registerShortcut(combo, () => handler());
    });

    return () => unregister.forEach(fn => fn());
  }, [shortcuts]);
}

/** Get display string for keyboard shortcut */
export function getShortcutDisplay(combo: KeyCombo): string {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const parts = combo.split('+').map(p => {
    if (p === 'cmd') return isMac ? '⌘' : 'Ctrl';
    if (p === 'ctrl') return 'Ctrl';
    if (p === 'shift') return '⇧';
    if (p === 'alt') return isMac ? '⌥' : 'Alt';
    if (p === 'return') return '↵';
    if (p === 'arrowup') return '↑';
    if (p === 'arrowdown') return '↓';
    if (p === 'arrowleft') return '←';
    if (p === 'arrowright') return '→';
    return p.toUpperCase();
  });
  return parts.join(' ');
}
