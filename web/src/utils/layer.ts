import { layer } from '@layui/layer-vue';
import { autoScale } from '@yusui/utils';

const layerClasses = 'layer-skin-uportal';

const layLayer = {
  open: (option: any) => {
    option.type = 'page';
    return layerCreate(option);
  },
  confirm: (option: any) => {
    option.type = 'dialog';
    option.title = option?.title || '温馨提示';
    return layerCreate(option);
  },
  msg: (option: any) => {
    option.type = 'notify';
    return layerCreate(option);
  },
  close: (id: any) => {
    layer.close(id);
  },
  closeAll: () => {
    layer.closeAll();
  },
  load: (id: number, option?: any) => {
    return layer.load(id, {
      shadeOpacity: '0.3',
      ...option,
    });
  },
  reset: (id: any) => {
    layer.reset(id);
  },
};

const layerCreate = (option: any) => {
  return layer.create(
    {
      //LayerProps
      animDuration: 0,
      isOutAnim: false,
      zIndex: 2000,
      ...option,
      success: (id: string) => {
        //自动计算Layer缩放
        if (option?.layerClasses) {
          autoScale.initParent(`.${option?.layerClasses}#${id}`, '#layout');
        } else {
          autoScale.initParent(`.${layerClasses}#${id}`, '#layout');
        }
        //执行success回调
        if (option?.success) option.success.call(this, id);
      },
    },
    {
      //DefaultLayerProps
      layerClasses: layerClasses,
      move: false,
      shadeClose: false,
      shadeOpacity: '0.3',
    },
  );
};

export default layLayer;

// /** ------------------------------- 使用示例 ------------------------------- */
// layLayer.open({
//   id: 'layer-id',
//   title: '测试弹层',
//   area: ['800px', '800px'],

//   success: () => {
//     //成功弹层回调
//     console.log('success')
//   },
//   close: () => {
//     //关闭弹层回调
//     console.log('close')
//   }
// })
