import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface H5UserSettings {
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
}

export const useH5CommonStore = defineStore(
  'h5-common',
  () => {
    // 状态
    const isLoading = ref(false);
    const showToast = ref(false);
    const toastMessage = ref('');
    const toastType = ref<'success' | 'error' | 'warning' | 'info'>('info');
    const userSettings = ref<H5UserSettings>({
      theme: 'light',
      language: 'zh-CN',
      fontSize: 'medium',
      notifications: true,
    });

    // 计算属性
    const isDarkMode = computed(() => userSettings.value.theme === 'dark');

    // 方法
    function setLoading(loading: boolean) {
      isLoading.value = loading;
    }

    function showSuccessToast(message: string) {
      toastMessage.value = message;
      toastType.value = 'success';
      showToast.value = true;
      setTimeout(() => {
        showToast.value = false;
      }, 3000);
    }

    function showErrorToast(message: string) {
      toastMessage.value = message;
      toastType.value = 'error';
      showToast.value = true;
      setTimeout(() => {
        showToast.value = false;
      }, 3000);
    }

    function showWarningToast(message: string) {
      toastMessage.value = message;
      toastType.value = 'warning';
      showToast.value = true;
      setTimeout(() => {
        showToast.value = false;
      }, 3000);
    }

    function showInfoToast(message: string) {
      toastMessage.value = message;
      toastType.value = 'info';
      showToast.value = true;
      setTimeout(() => {
        showToast.value = false;
      }, 3000);
    }

    function hideToast() {
      showToast.value = false;
    }

    function updateSettings(settings: Partial<H5UserSettings>) {
      userSettings.value = { ...userSettings.value, ...settings };
      // TODO: 保存到本地存储或服务器
      saveSettings();
    }

    function toggleTheme() {
      userSettings.value.theme = userSettings.value.theme === 'light' ? 'dark' : 'light';
      saveSettings();
    }

    function saveSettings() {
      try {
        localStorage.setItem('h5-user-settings', JSON.stringify(userSettings.value));
      } catch (error) {
        console.error('保存设置失败:', error);
      }
    }

    function loadSettings() {
      try {
        const stored = localStorage.getItem('h5-user-settings');
        if (stored) {
          userSettings.value = JSON.parse(stored);
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    }

    // 初始化时加载设置
    loadSettings();

    return {
      isLoading,
      showToast,
      toastMessage,
      toastType,
      userSettings,
      isDarkMode,
      setLoading,
      showSuccessToast,
      showErrorToast,
      showWarningToast,
      showInfoToast,
      hideToast,
      updateSettings,
      toggleTheme,
      saveSettings,
      loadSettings,
    };
  },
  {
    persist: {
      storage: localStorage,
      paths: ['userSettings'],
    },
  },
);
