import http from '../http';
import { aiPrefix, ossPrefix } from '../http';

/** 获取列表 */
export const getKnowledgeList = (params?: object) => {
  return http.get(`${aiPrefix}/knowledge-base/list`, params);
};

/** 查看知识库详情 */
export const getKnowledgeDetail = (id: string) => {
  return http.get(`${aiPrefix}/knowledge-base/${id}`);
};

/** 获取知识库文档 */
export const getKnowledgedoc = (params?: object) => {
  return http.get(`${aiPrefix}/knowledgeBase/docPages`, params);
};

/** 创建知识库 */
export const create = (data: object) => {
  return http.post(`${aiPrefix}/knowledge-base`, data);
};

/** 创建知识库 */
export const update = (data: any) => {
  const id = data.id;
  return http.put(`${aiPrefix}/knowledge-base/${id}`, data);
};

/** 上传文件 */
export const createDocByFile = (data?: object) => {
  return http.post(`${aiPrefix}/document/uploadDocument`, data);
};

/** 批量上传文件 */
export const createDocByFiles = (data?: object) => {
  return http.post(`${aiPrefix}/document/uploadDocuments/batch`, data);
};

/** 删除知识库文档 */
export const removeKnowledge = (knowledgeBaseId?: string) => {
  return http.delete(`${aiPrefix}/knowledge-base/${knowledgeBaseId}`);
};

/** 获取知识库文档 */
export const getKnowledgeDocument = (knowledgeBaseId?: string) => {
  return http.get(`${aiPrefix}/document/list/${knowledgeBaseId}`);
};

/** 删除知识库文档 */
export const removeKnowledgeDocument = (knowledgeBaseId?: string) => {
  return http.delete(`${aiPrefix}/document/${knowledgeBaseId}`);
};

/** 获取知识库统计信息 */
export const getKnowledgeDocumentStats = (id?: string) => {
  return http.get(`${aiPrefix}/knowledge-base/${id}/stats`);
};

/** 获取知识库文件支持格式 */
export const getKnowledgeSupportedFormats = () => {
  return http.get(`${aiPrefix}/document/supported-formats`);
};

/** 文件上传获取文件详情 */
export const getoDssUpload = (bucketName: string, file?: any) => {
  const formData = new FormData();

  formData.append('file', file);
  Object.entries(formData).forEach(([key, value]) => formData.append(key, value));
  return http.post(`${ossPrefix}/upload/${bucketName}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** 文件上传获取文件详情-组织 */
export const getoDssUploadByOrg = (
  bucketName: string,
  file?: any,
  orgId?: string,
  onUploadProgress?: (progressEvent: any) => void,
) => {
  const formData = new FormData();

  formData.append('file', file);
  Object.entries(formData).forEach(([key, value]) => formData.append(key, value));
  return http.post(`${ossPrefix}/uploadByOrg/${bucketName}`, formData, {
    params: { orgId },
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

/** 文件上传获取文件详情 */
export const getoDssUploads = (bucketName: string, files?: any) => {
  const formData = new FormData();

  files.forEach((file: File) => {
    formData.append('files', file);
  });
  return http.post(`${ossPrefix}/multiUpload/${bucketName}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 下载文件管理文件 根据id
export const downloadFile = (params: { id: string | number }) => {
  return http.get(
    `${ossPrefix}/download`,
    {
      ...params,
    },
    {
      responseType: 'blob',
      headers: {
        Accept: 'application/octet-stream',
      },
    },
  );
};

// 下载文件管理文件 根据文件名
export const downloadFileName = (params?: object) => {
  return http.get(
    `${ossPrefix}/downloadByFileName`,
    {
      ...params,
    },
    {
      responseType: 'blob',
      headers: {
        Accept: 'application/octet-stream',
      },
    },
  );
};

/** 获取文件名称 */
export const getDocumentFileName = (documentId?: string) => {
  return http.get(`${aiPrefix}/document/forname/${documentId}`);
};

/** 修改应用文档状态 */
export const updateApplyFileStatus = (data?: object) => {
  return http.put(`${aiPrefix}/document/apply`, data);
};

/** 重建索引 */
export const rebuildIndex = (documentId?: string) => {
  return http.post(`${aiPrefix}/knowledge-base/re-ingest/${documentId}`);
};

export default {
  getKnowledgeList,
  getKnowledgeDetail,
  getKnowledgedoc,
  create,
  update,
  getoDssUpload,
  getoDssUploadByOrg,
  createDocByFile,
  getKnowledgeSupportedFormats,
  getKnowledgeDocument,
  removeKnowledge,
  createDocByFiles,
  getoDssUploads,
  downloadFile,
  downloadFileName,
  getDocumentFileName,
  removeKnowledgeDocument,
  getKnowledgeDocumentStats,
  updateApplyFileStatus,
  rebuildIndex,
};
