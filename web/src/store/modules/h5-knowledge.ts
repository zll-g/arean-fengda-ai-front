import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: string;
  upload_date: string;
  category: string;
  tags: string[];
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  document_count: number;
  created_at: string;
}

export const useH5KnowledgeStore = defineStore('h5-knowledge', () => {
  // 状态
  const knowledgeBases = ref<KnowledgeBase[]>([]);
  const files = ref<KnowledgeFile[]>([]);
  const currentFile = ref<KnowledgeFile | null>(null);
  const loading = ref(false);
  const searchQuery = ref('');

  // 计算属性
  const filteredFiles = computed(() => {
    if (!searchQuery.value) return files.value;
    const query = searchQuery.value.toLowerCase();
    return files.value.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query) ||
        f.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  });

  const categorizedFiles = computed(() => {
    const categories = new Map<string, KnowledgeFile[]>();
    files.value.forEach((file) => {
      if (!categories.has(file.category)) {
        categories.set(file.category, []);
      }
      categories.get(file.category)!.push(file);
    });
    return categories;
  });

  // 方法
  async function fetchKnowledgeBases() {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getKnowledgeBases();
      // knowledgeBases.value = response.data;

      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      knowledgeBases.value = [
        {
          id: 'kb1',
          name: '操作规程知识库',
          description: '包含设备操作流程和规范',
          document_count: 120,
          created_at: '2024-01-10',
        },
        {
          id: 'kb2',
          name: '维修记录知识库',
          description: '历史设备维修和保养记录',
          document_count: 85,
          created_at: '2024-01-12',
        },
      ];
    } catch (error) {
      console.error('获取知识库失败:', error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchFiles(_knowledgeBaseId?: string) {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getFiles(knowledgeBaseId);
      // files.value = response.data;

      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      files.value = [
        {
          id: 'f1',
          name: '汽轮机启动规程.pdf',
          type: 'pdf',
          size: '2.5 MB',
          upload_date: '2024-01-15',
          category: '操作规程',
          tags: ['汽轮机', '启动'],
        },
        {
          id: 'f2',
          name: '锅炉维护手册.docx',
          type: 'docx',
          size: '1.8 MB',
          upload_date: '2024-01-14',
          category: '维护手册',
          tags: ['锅炉', '维护'],
        },
        {
          id: 'f3',
          name: '发电机检修记录.xlsx',
          type: 'xlsx',
          size: '500 KB',
          upload_date: '2024-01-13',
          category: '检修记录',
          tags: ['发电机', '检修'],
        },
      ];
    } catch (error) {
      console.error('获取文件失败:', error);
    } finally {
      loading.value = false;
    }
  }

  async function getFileDetail(fileId: string) {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getFileDetail(fileId);
      // currentFile.value = response.data;

      const file = files.value.find((f) => f.id === fileId);
      if (file) {
        currentFile.value = file;
      }
    } catch (error) {
      console.error('获取文件详情失败:', error);
    } finally {
      loading.value = false;
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  return {
    knowledgeBases,
    files,
    currentFile,
    loading,
    searchQuery,
    filteredFiles,
    categorizedFiles,
    fetchKnowledgeBases,
    fetchFiles,
    getFileDetail,
    setSearchQuery,
  };
});
