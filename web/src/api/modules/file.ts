import http from '../http';

/** 获取文件列表 */
export const getFileList = (params?: object) => {
  return http.get(`/file/listPage`, params);
};

/** 获取文件详情 */
export const getFileInfo = (params?: object) => {
  return http.get(`/file/getInfo`, params);
};

/** 附件伪删除 */
export const deleteFile = (ids?: string) => {
  return http.put(`/file/pseudoDeleteByIds?ids=${ids}`, {});
};

export default {
  getFileList,
  getFileInfo,
  deleteFile,
};
