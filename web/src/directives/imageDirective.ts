import { ElImageViewer } from 'element-plus';
import { createApp, h, type DirectiveBinding } from 'vue';

// 定义默认图片路径
const defaultImgUrl = new URL('@/assets/images/layout/default-nopic.png', import.meta.url).href;

// 工具函数：处理传入的图片路径（假设localUrl是项目中的路径处理函数）
const localUrl = (path: string) => {
  // 示例：如果传入的是相对路径，转换为绝对路径
  return new URL(path, import.meta.url).href;
};

// 图片错误处理指令
const imgError = {
  // 在元素挂载后执行
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    // 1. 初始化错误处理函数
    const handleError = () => {
      // 优先使用指令绑定的值作为默认图，否则用全局默认图
      const fallbackSrc = binding.value ? localUrl(binding.value) : defaultImgUrl;

      // 避免无限循环：只有当当前src不是 fallbackSrc 时才替换
      if (el.src !== fallbackSrc) {
        el.src = fallbackSrc;
      }
      // 移除错误监听（可选，根据需求决定是否保留）
      // el.removeEventListener('error', handleError);
    };

    // 2. 绑定错误事件（使用addEventListener更可靠）
    el.addEventListener('error', handleError);

    // 3. 处理初始src为空或无效的情况
    if (!el.src || el.src.trim() === '') {
      handleError();
    }

    // 4. 存储处理函数到元素上，便于unmounted时清理
    (el as any).imgErrorHandler = handleError;
  },

  // 当元素更新时（如src变化）重新检查
  updated(el: HTMLImageElement) {
    // 重新绑定错误处理（防止src更新后监听失效）
    const handleError = (el as any).imgErrorHandler;
    if (handleError) {
      // 先移除旧监听，避免重复绑定
      el.removeEventListener('error', handleError);
      el.addEventListener('error', handleError);
    }
    // 强制触发一次检查（如果新src无效）
    if (el.src && el.complete && !el.naturalHeight) {
      handleError();
    }
  },

  // 元素卸载时清理事件监听，避免内存泄漏
  unmounted(el: HTMLImageElement) {
    const handleError = (el as any).imgErrorHandler;
    if (handleError) {
      el.removeEventListener('error', handleError);
    }
  },
};

// 修改src地址
const imgSrc = {
  mounted: (el: any, binding: any) => {
    if (binding.value) {
      el.src = binding.value;
      const loadingEl = document.createElement('div');
      loadingEl.className = 'image__loading';

      loadingEl.innerHTML = `
              <i class="iconfont icon-refresh" />
        <span style="margin-left: 8px;">加载中...</span>
      `;

      el.parentNode?.insertBefore(loadingEl, el);
      el.style.opacity = '0';

      const handleLoad = () => {
        loadingEl.remove();
        el.style.opacity = '1';
      };

      const timeout = 50000;
      const timer = setTimeout(() => {
        handleLoad();
        el.src = binding.value ? localUrl(binding.value) : defaultImgUrl;
      }, timeout);

      el.onload = () => {
        clearTimeout(timer);
        handleLoad();
      };
    }
  },
};

// 点击弹出图片
const imgShow = {
  mounted: (el: any, binding: any) => {
    let imgList: string[] = [];

    let startIndex = 0;
    el.style.cursor = 'pointer';

    el.onclick = () => {
      const currentSrc = el.src;

      if (Array.isArray(binding.value?.src)) {
        imgList = binding.value.src.map((it: string) => it);
        startIndex = binding.value.index || 0;
      } else {
        imgList = [currentSrc];
      }

      // 创建ImageViewer容器
      const container = document.createElement('div');
      document.body.appendChild(container);

      const app = createApp({
        render() {
          return h(ElImageViewer, {
            urlList: imgList,
            initialIndex: startIndex,
            showProgress: true,
            hideOnClickModal: true,
            zIndex: 9999,
            onClose: () => {
              app.unmount();
              document.body.removeChild(container);
            },
          });
        },
      });
      app.mount(container);
    };
  },
  unmounted(el: HTMLImageElement) {
    el.onerror = null;
    el.removeEventListener('click', () => {});
  },
};

export { imgError, imgSrc, imgShow };
