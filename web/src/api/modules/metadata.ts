import http from '../http';

const BaseUrl = '/api';
/** 获取元数据表列表 */
export const getTableList = (datasourceId?: string) => {
  return http.get(`${BaseUrl}/metadata/tables/${datasourceId}`);
};

// 单表刷新
export const syncTable = (datasourceId?: string, tableName?: string) => {
  return http.post(`${BaseUrl}/metadata/sync/${datasourceId}/${tableName}`);
};

// 全量采集元数据
export const syncAll = (datasourceId?: string) => {
  return http.post(`${BaseUrl}/metadata/sync/${datasourceId}`);
};

// 批量设置选中表
export const batchUpdateSelected = (datasourceId?: string, tableNames?: string[]) => {
  return http.put(`${BaseUrl}/metadata/tables/${datasourceId}/batch-select`, tableNames);
};
// 查询某张表的详细字段信息和示例值
export const getTablesInfo = (datasourceId: string, tableName: string) => {
  return http.get(`${BaseUrl}/metadata/tables/${datasourceId}/${tableName}`);
};

export default { getTableList, syncTable, syncAll, batchUpdateSelected, getTablesInfo };
