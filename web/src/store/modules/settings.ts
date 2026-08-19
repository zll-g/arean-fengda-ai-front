import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppSettings, AIModel } from '@/types/chat';

export const useSettingsStore = defineStore('settings', () => {
  // 默认设置
  const defaultSettings: AppSettings = {
    // 外观设置
    theme: 'system',
    language: 'zh-CN',
    fontSize: 'medium',

    // 对话设置
    sendOnEnter: false,
    showTimestamp: true,
    compactMode: false,

    // AI 默认设置
    defaultModel: 'gpt-4',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
    defaultSystemPrompt: '你是一个有帮助的 AI 助手。',

    // 功能设置
    enableSound: true,
    enableNotification: true,
    autoSaveInterval: 30,

    // 隐私设置
    saveHistory: true,
    shareAnalytics: false,
  };

  // 可用的 AI 模型
  const availableModels: AIModel[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: '最强大的模型，适合复杂任务',
      maxTokens: 8192,
      provider: 'OpenAI',
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: '更快的响应速度，128K 上下文',
      maxTokens: 128000,
      provider: 'OpenAI',
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: '快速高效，适合日常对话',
      maxTokens: 16384,
      provider: 'OpenAI',
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      description: '优秀的长文本处理能力',
      maxTokens: 200000,
      provider: 'Anthropic',
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      description: '平衡性能与成本',
      maxTokens: 200000,
      provider: 'Anthropic',
    },
  ];

  // 状态
  const settings = ref<AppSettings>({ ...defaultSettings });
  const sidebarCollapsed = ref(false);
  const sidebarWidth = ref(260);
  const showShortcutsModal = ref(false);
  const showSearchModal = ref(false);
  const showSettingsModal = ref(false);
  const showConversationSettingsModal = ref(false);

  // 主题相关
  function applyTheme(theme: AppSettings['theme']) {
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  function toggleTheme() {
    const themes: AppSettings['theme'][] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.value.theme);
    settings.value.theme = themes[(currentIndex + 1) % themes.length];
    applyTheme(settings.value.theme);
    saveToStorage();
  }

  function setTheme(theme: AppSettings['theme']) {
    settings.value.theme = theme;
    applyTheme(theme);
    saveToStorage();
  }

  // 字体大小
  function applyFontSize(size: AppSettings['fontSize']) {
    const root = document.documentElement;
    const sizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--base-font-size', sizeMap[size]);
  }

  function setFontSize(size: AppSettings['fontSize']) {
    settings.value.fontSize = size;
    applyFontSize(size);
    saveToStorage();
  }

  // 侧边栏
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    saveToStorage();
  }

  function setSidebarWidth(width: number) {
    sidebarWidth.value = Math.max(200, Math.min(400, width));
    saveToStorage();
  }

  // 模态框
  function openShortcutsModal() {
    showShortcutsModal.value = true;
  }

  function closeShortcutsModal() {
    showShortcutsModal.value = false;
  }

  function openSearchModal() {
    showSearchModal.value = true;
  }

  function closeSearchModal() {
    showSearchModal.value = false;
  }

  function openSettingsModal() {
    showSettingsModal.value = true;
  }

  function closeSettingsModal() {
    showSettingsModal.value = false;
  }

  function openConversationSettingsModal() {
    showConversationSettingsModal.value = true;
  }

  function closeConversationSettingsModal() {
    showConversationSettingsModal.value = false;
  }

  // 更新设置
  function updateSettings(updates: Partial<AppSettings>) {
    Object.assign(settings.value, updates);

    if (updates.theme) {
      applyTheme(updates.theme);
    }

    if (updates.fontSize) {
      applyFontSize(updates.fontSize);
    }

    saveToStorage();
  }

  // 重置设置
  function resetSettings() {
    settings.value = { ...defaultSettings };
    applyTheme(settings.value.theme);
    applyFontSize(settings.value.fontSize);
    saveToStorage();
  }

  // 导出设置
  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2);
  }

  // 导入设置
  function importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      settings.value = { ...defaultSettings, ...imported };
      applyTheme(settings.value.theme);
      applyFontSize(settings.value.fontSize);
      saveToStorage();
      return true;
    } catch {
      return false;
    }
  }

  // 存储
  function saveToStorage() {
    try {
      localStorage.setItem('chat-settings', JSON.stringify(settings.value));
      localStorage.setItem('chat-sidebar-collapsed', JSON.stringify(sidebarCollapsed.value));
      localStorage.setItem('chat-sidebar-width', JSON.stringify(sidebarWidth.value));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem('chat-settings');
      if (stored) {
        settings.value = { ...defaultSettings, ...JSON.parse(stored) };
      }

      const collapsedStored = localStorage.getItem('chat-sidebar-collapsed');
      if (collapsedStored) {
        sidebarCollapsed.value = JSON.parse(collapsedStored);
      }

      const widthStored = localStorage.getItem('chat-sidebar-width');
      if (widthStored) {
        sidebarWidth.value = JSON.parse(widthStored);
      }

      // 应用主题和字体
      applyTheme(settings.value.theme);
      applyFontSize(settings.value.fontSize);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (settings.value.theme === 'system') {
        applyTheme('system');
      }
    });
  }

  // 初始化
  loadFromStorage();

  return {
    // 状态
    settings,
    sidebarCollapsed,
    sidebarWidth,
    showShortcutsModal,
    showSearchModal,
    showSettingsModal,
    showConversationSettingsModal,
    availableModels,

    // 方法
    toggleTheme,
    setTheme,
    setFontSize,
    toggleSidebar,
    setSidebarWidth,
    openShortcutsModal,
    closeShortcutsModal,
    openSearchModal,
    closeSearchModal,
    openSettingsModal,
    closeSettingsModal,
    openConversationSettingsModal,
    closeConversationSettingsModal,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    loadFromStorage,
  };
});
