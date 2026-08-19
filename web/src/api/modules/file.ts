import http from '../http';
import { filePrefix } from '../http';

/** 获取文件列表 */
export const getFileList = (params?: object) => {
  return http.get(`${filePrefix}/listPage`, params);
};

/** 获取文件详情 */
export const getFileInfo = (params?: object) => {
  return http.get(`${filePrefix}/getInfo`, params);
};

/** 附件伪删除 */
export const deleteFile = (ids?: string) => {
  return http.put(`${filePrefix}/pseudoDeleteByIds?ids=${ids}`, {});
};

export const getCountByBucket = (params?: object) => {
  return http.get(`${filePrefix}/getCountByBucket`, params);
};

export default {
  getFileList,
  getFileInfo,
  deleteFile,
  getCountByBucket,
};
