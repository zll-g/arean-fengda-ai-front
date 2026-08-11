import { onMounted, onUnmounted, ref } from 'vue';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

// 快捷键管理组合式函数
export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  const activeKeys = ref<Set<string>>(new Set());

  const handleKeyDown = (event: KeyboardEvent) => {
    activeKeys.value.add(event.key.toLowerCase());

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        // 排除在输入框中的部分快捷键
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        // 这些快捷键在输入框中也生效
        const globalShortcuts = ['Escape', 'Enter'];
        const needsModifier = shortcut.ctrl || shortcut.alt || shortcut.meta;

        if (isInput && !globalShortcuts.includes(shortcut.key) && !needsModifier) {
          continue;
        }

        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    activeKeys.value.delete(event.key.toLowerCase());
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  });

  return {
    activeKeys,
  };
}

// 预定义的快捷键配置
export function getDefaultShortcuts(actions: {
  newChat: () => void;
  toggleSidebar: () => void;
  focusInput: () => void;
  sendMessage: () => void;
  cancelStream: () => void;
  toggleTheme: () => void;
  showShortcuts: () => void;
  searchConversations: () => void;
}): KeyboardShortcut[] {
  return [
    {
      key: 'n',
      ctrl: true,
      description: '新建对话',
      action: actions.newChat,
    },
    {
      key: 'b',
      ctrl: true,
      description: '切换侧边栏',
      action: actions.toggleSidebar,
    },
    {
      key: '/',
      ctrl: true,
      description: '聚焦输入框',
      action: actions.focusInput,
    },
    {
      key: 'Enter',
      ctrl: true,
      description: '发送消息',
      action: actions.sendMessage,
    },
    {
      key: 'Escape',
      description: '取消生成',
      action: actions.cancelStream,
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      description: '切换主题',
      action: actions.toggleTheme,
    },
    {
      key: '?',
      ctrl: true,
      description: '显示快捷键',
      action: actions.showShortcuts,
    },
    {
      key: 'k',
      ctrl: true,
      description: '搜索对话',
      action: actions.searchConversations,
    },
  ];
}
