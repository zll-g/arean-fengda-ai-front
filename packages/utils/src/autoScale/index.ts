import lodash from '../lodash';

// 基本缩放比例的高宽
const defaultWidth = 1920; //默认宽度
const defaultHeight = 1080; //默认高度
// 最大缩放高宽，超出择不进行缩放
const maxWidth = 0; //最大宽度
const maxHeight = 0; //最大高度
// 防抖等待时间必须一致
const debounceDelay = 300;

// #region 基于尺寸做缩放
/** 通用缩放模板 */
function init(selector: any, options?: { width: number; height: number }) {
  const el = document.querySelector(selector);
  if (!el) return;

  const width = options?.width ?? defaultWidth;
  const height = options?.height ?? defaultHeight;
  function init() {
    const scaleX = innerWidth / width;
    const sacleY = innerHeight / height;
    const scale = Math.min(scaleX, sacleY);
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.transformOrigin = 'top left';
    if (innerWidth > maxWidth && innerHeight > maxHeight) {
      el.style.transform = `translate(0,0) scale(${scaleX},${sacleY})`;
    } else {
      const left = (innerWidth - width * scale) / 2;
      const top = (innerHeight - height * scale) / 2;
      el.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    }
  }
  init();
  addEventListener('resize', lodash.debounce(init, debounceDelay));
}
//#endregion

//#region 基于父级做缩放
/**
 * 基于父级做缩放
 * @param selector 需要缩放的dom元素：需要注意dom元素必须是唯一的
 * @param parentSelector 基于缩放的dom元素：需要注意dom元素必须是唯一的
 */
function initParent(selector: any, parentSelector?: any) {
  //定义resize监听器，用于销毁监听
  let resizeFunc: any = null;
  function init() {
    //获取dom元素
    const el = document.querySelector(selector);
    //判断dom元素是否存在
    if (!el) {
      //当dom元素不存在时需销毁当前resize监听器
      if (resizeFunc) window.removeEventListener('resize', resizeFunc);
      return;
    }
    //默认不缩放
    let scaleXY = '1,1';
    //判断是否存在基于缩放的dom元素不存在则
    if (parentSelector) {
      //获取基于缩放的dom元素
      const parentEL = document.querySelector(parentSelector);
      //获取元素transform信息
      const matrix = new DOMMatrixReadOnly(parentEL?.style.transform);
      //a 属性代表水平方向的缩放因子，d 属性代表垂直方向的缩放因子
      scaleXY = `${matrix.a},${matrix.d}`;
    }
    //设置dom元素的缩放比例
    el.style.transform = `scale(${scaleXY})`;
  }
  /**
   * Layer相同ID弹层同时出现，只会显示最后一个Layer
   * 需要Timeout延迟计算缩放比例
   */
  //初始化比列
  init();
  //保存resize监听的方法
  resizeFunc = lodash.debounce(init, debounceDelay);
  //开启resize监听计算缩放比列
  window.addEventListener('resize', resizeFunc);
}
//#endregion

export default {
  init,
  initParent,
};
