import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * History 组件的基础接口
 * 所有传递给 History 组件的记录类型都应基于此接口
 */
export interface HistoryRecord {
  id: string;
  title?: string;
  tag?: string;
  tagType?: 'danger' | 'warning' | 'success' | 'primary';
  status?: string;
  timestamp: number;
  fields?: Array<{ label: string; value: string }>;
  detailFields?: Array<{ label: string; value: string }>;
  [key: string]: any;
}

/**
 * 智能问数历史记录接口
 */
export interface DataQueryRecord extends HistoryRecord {
  question: string;
  answer: string;
  type?: string;
  hasChart?: boolean;
  hasTable?: boolean;
  chartData?: any;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  dataSource?: string;
  database?: string;
}

/**
 * 语音填单历史记录接口
 */
export interface VoiceFormRecord extends HistoryRecord {
  formType: string;
  defectCategory: string;
  equipmentName: string;
  defectPhenomenon: string;
  defectNumber: string;
  kksCode?: string;
  discoveryTime: string;
  discoverer: string;
  urgency: 'urgent' | 'important' | 'general';
  remarks?: string;
  photos?: any[];
}

export const useH5HistoryStore = defineStore('h5-history', () => {
  // 状态
  const dataQueryRecords = ref<DataQueryRecord[]>([]);
  const voiceFormRecords = ref<VoiceFormRecord[]>([]);
  const loading = ref(false);

  // 计算属性
  const sortedDataQueryRecords = computed(() => {
    return [...dataQueryRecords.value].sort((a, b) => b.timestamp - a.timestamp);
  });

  const sortedVoiceFormRecords = computed(() => {
    return [...voiceFormRecords.value].sort((a, b) => b.timestamp - a.timestamp);
  });

  // 方法
  async function fetchDataQueryRecords() {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getDataQueryHistory();
      // dataQueryRecords.value = response.data;

      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      dataQueryRecords.value = [];
    } catch (error) {
      console.error('获取智能问数历史失败:', error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchVoiceFormRecords() {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getVoiceFormHistory();
      // voiceFormRecords.value = response.data;

      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      voiceFormRecords.value = [];
    } catch (error) {
      console.error('获取语音填单历史失败:', error);
    } finally {
      loading.value = false;
    }
  }

  function addDataQueryRecord(record: DataQueryRecord) {
    dataQueryRecords.value.unshift(record);
  }

  function addVoiceFormRecord(record: VoiceFormRecord) {
    voiceFormRecords.value.unshift(record);
  }

  function deleteDataQueryRecord(recordId: string) {
    const index = dataQueryRecords.value.findIndex((r) => r.id === recordId);
    if (index > -1) {
      dataQueryRecords.value.splice(index, 1);
    }
  }

  function deleteVoiceFormRecord(recordId: string) {
    const index = voiceFormRecords.value.findIndex((r) => r.id === recordId);
    if (index > -1) {
      voiceFormRecords.value.splice(index, 1);
    }
  }

  function batchDeleteDataQueryRecords(recordIds: string[]) {
    dataQueryRecords.value = dataQueryRecords.value.filter(
      (record) => !recordIds.includes(record.id),
    );
  }

  function batchDeleteVoiceFormRecords(recordIds: string[]) {
    voiceFormRecords.value = voiceFormRecords.value.filter(
      (record) => !recordIds.includes(record.id),
    );
  }

  function clearDataQueryRecords() {
    dataQueryRecords.value = [];
  }

  function clearVoiceFormRecords() {
    voiceFormRecords.value = [];
  }

  return {
    dataQueryRecords,
    voiceFormRecords,
    loading,
    sortedDataQueryRecords,
    sortedVoiceFormRecords,
    fetchDataQueryRecords,
    fetchVoiceFormRecords,
    addDataQueryRecord,
    addVoiceFormRecord,
    deleteDataQueryRecord,
    deleteVoiceFormRecord,
    batchDeleteDataQueryRecords,
    batchDeleteVoiceFormRecords,
    clearDataQueryRecords,
    clearVoiceFormRecords,
  };
});
