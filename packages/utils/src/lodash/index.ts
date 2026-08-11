/**
 * 防抖
 *
 * @param {Function} fn 防抖的函数
 * @param {number} duration 等待的时间
 * @return {Function}
 */
const debounce = function <T extends unknown[]>(
  fn: (this: Window, ...args: T) => void,
  delay: number = 1000,
): (this: Window, ...args: T) => void {
  let timerId: ReturnType<typeof setTimeout>;
  return function (this: Window, ...args: T) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * 节流函数（在规定时间内只执行一次）
 *
 * @param {Function} fn 需要节流的函数
 * @param {number} delay 节流时间间隔（毫秒，默认1000ms）
 * @return {Function} 节流后的函数
 */
const throttle = function (fn: Function, delay: number = 1000) {
  let lastExecTime = 0;
  let timerId: number | null = null;

  return function (this: unknown, ...args: any[]) {
    // 显式声明 this 类型
    const currentTime = Date.now();
    const remainingTime = delay - (currentTime - lastExecTime);

    if (remainingTime <= 0) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      fn.apply(this, args);
      lastExecTime = currentTime;
    } else if (!timerId) {
      timerId = window.setTimeout(() => {
        fn.apply(this, args);
        lastExecTime = Date.now();
        timerId = null;
      }, remainingTime);
    }
  };
};

export default {
  debounce,
  throttle,
};
