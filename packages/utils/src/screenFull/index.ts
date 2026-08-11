export default {
  isFullscreen: () => !!document.fullscreenElement,

  request: async (selectors?: string) => {
    const element = selectors ? document.querySelector(selectors) : document.documentElement;
    if (!element) {
      throw new Error(`未找到选择器 ${selectors} 对应的元素`);
    }
    await element.requestFullscreen();
  },

  exit: async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  },

  toggle: async function (selectors?: string) {
    if (this.isFullscreen()) {
      await this.exit();
    } else {
      await this.request(selectors);
    }
  },
};
