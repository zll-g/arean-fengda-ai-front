/**
 * 从ElementUI中移植过来
 */

const SPECIAL_CHARS_REGEXP: RegExp = /([\\:\-\\_]+(.))/g;
const MOZ_HACK_REGEXP: RegExp = /^moz([A-Z])/;

const trim = (str: string): string => {
  return (str || '').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
};

const camelCase = (name: string): string => {
  return name
    .replace(SPECIAL_CHARS_REGEXP, function (_, separator, letter, offset) {
      return offset ? letter.toUpperCase() : letter;
    })
    .replace(MOZ_HACK_REGEXP, 'Moz$1');
};

/**
 * 绑定事件
 */
export const on = (function () {
  return function (element: any, event: any, handler: any) {
    if (element && event && handler) {
      element.addEventListener(event, handler, false);
    }
  };
})();

/**
 * 删除事件
 */
export const off = (function () {
  return function (element: any, event: any, handler: any) {
    if (element && event) {
      element.removeEventListener(event, handler, false);
    }
  };
})();

/**
 * 绑定一次事件
 */
const once = function (el: any, event: any, fn: any) {
  const listener = function () {
    if (fn) {
      // @ts-ignore
      fn.apply(this, arguments);
    }
    off(el, event, listener);
  };
  on(el, event, listener);
};

/**
 * 判断是否含有指定的class
 * @param el Dom元素
 * @param cls class名称
 */
const hasClass = (el: HTMLElement, cls: string): boolean => {
  if (!el || !cls) return false;
  if (cls.indexOf(' ') !== -1) {
    throw new Error('className should not contain space.');
  }
  if (el.classList) {
    return el.classList.contains(cls);
  } else {
    return (' ' + el.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }
};

/**
 * 添加class
 * @param el Dom元素
 * @param cls class名称
 */
const addClass = (el: HTMLElement, cls: string): void => {
  if (!el) return;
  let curClass = el.className;
  let classes = (cls || '').split(' ');

  for (let i = 0, j = classes.length; i < j; i++) {
    let clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.add(clsName);
    } else if (!hasClass(el, clsName)) {
      curClass += ' ' + clsName;
    }
  }
  if (!el.classList) {
    el.className = curClass;
  }
};

/**
 * 删除class
 * @param el Dom元素
 * @param cls class名称
 */
const removeClass = (el: HTMLElement, cls: string): void => {
  if (!el || !cls) return;
  var classes = cls.split(' ');
  var curClass = ' ' + el.className + ' ';

  for (var i = 0, j = classes.length; i < j; i++) {
    var clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.remove(clsName);
    } else if (hasClass(el, clsName)) {
      curClass = curClass.replace(' ' + clsName + ' ', ' ');
    }
  }
  if (!el.classList) {
    el.className = trim(curClass);
  }
};

/**
 * 获取样式
 * @param element
 * @param styleName
 */
const getStyle = (element: any, styleName: string): any => {
  if (!element || !styleName) return null;
  styleName = camelCase(styleName);
  if (styleName === 'float') {
    styleName = 'cssFloat';
  }
  try {
    let computed = document.defaultView?.getComputedStyle(element, '') as any;
    return element.style[styleName] || computed ? computed[styleName] : null;
  } catch (e) {
    return element.style[styleName];
  }
};

/**
 * 设置样式
 * @param element
 * @param styleName
 * @param value
 */
const setStyle = (element: HTMLElement, styleName: any, value: string): void => {
  if (!element || !styleName) return;

  if (typeof styleName === 'object') {
    for (var prop in styleName) {
      if (styleName.hasOwnProperty(prop)) {
        setStyle(element, prop, styleName[prop]);
      }
    }
  } else {
    styleName = camelCase(styleName);
    element.style[styleName] = value;
  }
};

export default {
  on,
  off,
  once,
  hasClass,
  addClass,
  removeClass,
  getStyle,
  setStyle,
};
