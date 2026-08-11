// 通过DOM监听检测弹窗是否存在（适用于无法直接修改打开逻辑的场景）
export default {
  /**
   * DOM监听
   * @param selector 需要监听的dom元素
   * @param callbackOpen 监听到打开后的函数回调
   * @param callbackClose 监听到关闭后的函数回调
   */
  init: (selector: string, callbackOpen?: Function, callbackClose?: Function) => {
    // 监听body变化，检测selector的DOM节点
    const observer: MutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const el = document.querySelector(selector);

        if (el && !el.classList.contains('is-listened')) {
          // 标记已监听，避免重复触发
          el.classList.add('is-listened');
          // console.log('检测到打开（DOM监听）');
          callbackOpen && callbackOpen();

          // 监听弹窗关闭（通过检测DOM移除）
          const innerObserver = new MutationObserver(() => {
            if (!document.querySelector(selector)) {
              // console.log('检测到关闭（DOM监听）');
              callbackClose && callbackClose();
              innerObserver.disconnect();
            }
          });
          innerObserver.observe(document.body, { childList: true, subtree: true });
        }
      });
    });

    // 开始监听body的子节点变化
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  },
  /**
   * 销毁DOM监听
   * @param observer 监听的实例对象
   */
  destroy: (observer: MutationObserver) => {
    observer && observer.disconnect();
  },
};
