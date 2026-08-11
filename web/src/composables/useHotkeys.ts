import { onMounted, onUnmounted } from 'vue';

export interface HotkeyMap {
  [combo: string]: (e: KeyboardEvent) => void;
}

export function useHotkeys(hotkeys: HotkeyMap) {
  function handler(e: KeyboardEvent) {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    let key = e.key.toLowerCase();
    if (key === 'enter') key = 'enter';
    else if (key === 'escape') key = 'escape';
    else if (key === 'backspace') key = 'backspace';
    parts.push(key);

    const combo = parts.join('+');
    const fn = hotkeys[combo];
    if (fn) {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    }
  }

  onMounted(() => document.addEventListener('keydown', handler));
  onUnmounted(() => document.removeEventListener('keydown', handler));
}
