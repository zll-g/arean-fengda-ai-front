import http from '../http';

const BaseUrl = '/api';

// ==================== 类型定义(与后端 DocumentSplitController DTO 逐字段对齐) ====================

/** 分片配置(对应 SplitConfigDto;字段传 null=清除文档级覆盖,回退知识库级/全局默认) */
export interface SplitConfigDto {
  /** 策略: recursive(默认)/custom(自定义:标题不单独成片+火电公文兼容)/paragraph/sentence/semantic/fixed */
  strategy?: string | null;
  /** 切块尺寸(char单位=汉字数;token单位≈0.6汉字/token) */
  chunkSize?: number | null;
  /** 重叠尺寸(必须 < chunkSize) */
  chunkOverlap?: number | null;
  /** 尺寸单位: char(默认)/token */
  sizeUnit?: string | null;
  /** 表格按行拆分开关 */
  tableRowSplitEnabled?: boolean | null;
  /** 表格行每批行数 */
  tableRowBatchSize?: number | null;
}

/** 预览切块(对应 ChunkPreviewVO) */
export interface ChunkPreviewVO {
  index: number;
  text: string;
  /** text 超 500 字被截断展示(charCount 仍为全量) */
  textTruncated: boolean;
  charCount: number;
  tokenEstimate: number;
  sectionHeading?: string | null;
  contextPrefix?: string | null;
  contentType?: string | null;
  tableName?: string | null;
  rowRange?: string | null;
}

/** 切块质量统计(对应 SplitStatsVO) */
export interface SplitStatsVO {
  totalChunks: number;
  totalChars: number;
  avgChars: number;
  minChars: number;
  maxChars: number;
  /** 超长块数(>targetChunkSize) */
  overSizeCount: number;
  /** 超碎块数 */
  tinyCount: number;
  emptyCount: number;
  tableChunkCount: number;
  disabledCount: number;
  /** 章节覆盖率 0~1 */
  headingCoverage: number;
  targetChunkSize: number;
  strategy: string;
  sizeUnit: string;
}

/** 预览响应(对应 SplitPreviewVO) */
export interface SplitPreviewVO {
  chunks: ChunkPreviewVO[];
  stats: SplitStatsVO;
  /** 本次预览实际生效配置(三级合并后) */
  appliedConfig: SplitConfigDto;
  /** 各字段来源: document/knowledge_base/default */
  sources?: Record<string, string>;
  /** 解析缓存命中(30分钟文件指纹缓存;命中=未重复跑解析) */
  parseCacheHit: boolean;
  durationMs: number;
}

/** 配置全貌(GET split-config 响应 data) */
export interface EffectiveSplitConfig {
  effective: SplitConfigDto;
  sources: Record<string, string>;
  /** 文档级原值(全 null=无覆盖) */
  documentOverride: SplitConfigDto;
  /** 知识库级值(仅 strategy/chunkSize/chunkOverlap) */
  knowledgeBaseLevel: Partial<SplitConfigDto> | null;
  documentStatus?: string;
  segmentCount?: number;
}

/** A/B 对比响应 data */
export interface SplitCompareResult {
  configA: SplitConfigDto;
  statsA: SplitStatsVO;
  sampleChunksA: ChunkPreviewVO[];
  configB: SplitConfigDto;
  statsB: SplitStatsVO;
  sampleChunksB: ChunkPreviewVO[];
  parseCacheHit: boolean;
}

/** 线上分片行(对应 DocumentChunkVO) */
export interface DocumentChunkVO {
  chunkId: string;
  text: string;
  charCount: number;
  tokenEstimate: number;
  /** 分片序号(支持子序号,初切"12"、二次切分后"12.1/12.2") */
  segmentIndex: string;
  sectionHeading?: string | null;
  contextPrefix?: string | null;
  contentType?: string | null;
  /** 字符串态开关: '1'=启用 / '0'=停用 */
  isApply: string;
  metadata?: Record<string, string>;
}

/** 线上分片分页响应 data */
export interface ChunkListResult {
  total: number;
  page: number;
  size: number;
  chunks: DocumentChunkVO[];
  stats: SplitStatsVO;
}

// ==================== 接口封装 ====================

/** 分片预览(不落库):套用试参配置立即返回切块+统计;body 空对象=按当前生效配置 */
export const previewSplit = (documentId: string, data?: SplitConfigDto, maxChunks?: number) => {
  return http.post(`${BaseUrl}/document/split/preview/${documentId}`, data ?? {}, {
    params: maxChunks ? { maxChunks } : {},
  });
};

/** 双配置 A/B 对比(解析只跑一次) */
export const compareSplit = (
  documentId: string,
  data: { configA: SplitConfigDto; configB: SplitConfigDto; sampleChunks?: number },
) => {
  return http.post(`${BaseUrl}/document/split/compare/${documentId}`, data);
};

/** 配置全貌:生效值+各字段来源(document/knowledge_base/default)+文档级原值+知识库级值 */
export const getSplitConfig = (documentId: string) => {
  return http.get(`${BaseUrl}/document/${documentId}/split-config`);
};

/** 保存文档级配置(只写库不重建;字段传 null=清除该字段覆盖) */
export const saveSplitConfig = (documentId: string, data: SplitConfigDto) => {
  return http.put(`${BaseUrl}/document/${documentId}/split-config`, data);
};

/** 一键重切:保存配置+清理旧索引(Milvus+BM25+缓存)+异步重新入库 */
export const resplitDocument = (documentId: string, data: SplitConfigDto) => {
  return http.post(`${BaseUrl}/document/${documentId}/resplit`, data);
};

/** 线上分片分页浏览(含质量统计) */
export const getDocumentChunks = (documentId: string, page = 1, size = 20) => {
  return http.get(`${BaseUrl}/document/${documentId}/chunks`, { page, size });
};

/** 编辑分片文本(context_prefix+新文本重向量化,与入库同口径) */
export const updateChunkText = (documentId: string, chunkId: string, text: string) => {
  return http.put(`${BaseUrl}/document/${documentId}/chunks/${chunkId}`, { text });
};

/** 停用/启用分片(向量保留不重embed,停用后dense/BM25/原生三路过滤全生效) */
export const setChunkApply = (documentId: string, chunkId: string, isApply: boolean) => {
  return http.put(`${BaseUrl}/document/${documentId}/chunks/${chunkId}/apply`, { isApply });
};

/** 物理删除分片(不可恢复) */
export const deleteChunk = (documentId: string, chunkId: string) => {
  return http.delete(`${BaseUrl}/document/${documentId}/chunks/${chunkId}`);
};

/** 合并分片(有序 2~10 个;首块原地升级重向量化,其余删除) */
export const mergeChunks = (documentId: string, chunkIds: string[]) => {
  return http.post(`${BaseUrl}/document/${documentId}/chunks/merge`, { chunkIds });
};

/** 二次切分:points=精确偏移切分点(严格递增) 或 targetSize=目标尺寸自动切 */
export const splitChunk = (
  documentId: string,
  chunkId: string,
  data: { points?: number[]; targetSize?: number },
) => {
  return http.post(`${BaseUrl}/document/${documentId}/chunks/${chunkId}/split`, data);
};

export default {
  previewSplit,
  compareSplit,
  getSplitConfig,
  saveSplitConfig,
  resplitDocument,
  getDocumentChunks,
  updateChunkText,
  setChunkApply,
  deleteChunk,
  mergeChunks,
  splitChunk,
};
