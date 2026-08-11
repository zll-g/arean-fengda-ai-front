import { defineStore } from 'pinia';
import api from '@/api';

export interface Datasource {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface DatasourceState {
  /** 数据源列表 */
  list: Datasource[];
  /** 当前选中的数据源ID */
  currentId: string | number | null;
  /** 加载状态 */
  loading: boolean;
}

export const useDatasourceStore = defineStore('datasource', {
  state: (): DatasourceState => ({
    /** 数据源列表 */
    list: [],
    /** 当前选中的数据源ID */
    currentId: null,
    /** 加载状态 */
    loading: false,
  }),

  getters: {
    /** 当前数据源 */
    current: (state): Datasource | undefined => {
      return state.list.find((ds) => ds.id === state.currentId);
    },

    /** 数据源选项（供下拉框使用） */
    options: (state): Array<{ label: string; value: string | number }> => {
      return state.list.map((ds) => ({
        label: ds.name,
        value: ds.id,
      }));
    },
  },

  actions: {
    /** 加载数据源列表 */
    async fetchList(): Promise<void> {
      this.loading = true;

      try {
        const res = await api.datasource.getDatasourceList();
        console.log(res.data, 888888);
        this.list = res.data || [];

        // 如果没有选中的，默认选第一个
        if (!this.currentId && this.list.length > 0) {
          this.currentId = this.list[0].id;
        }
      } finally {
        this.loading = false;
      }
    },

    /** 设置当前数据源 */
    setCurrent(id: string | number): void {
      this.currentId = id;
    },
  },
});
