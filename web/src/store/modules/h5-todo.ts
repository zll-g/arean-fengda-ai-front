import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface TodoItem {
  todo_id: string;
  title: string;
  content: string;
  tag: string;
  status: 'pending' | 'completed';
  created_at: string;
  priority: 'high' | 'medium' | 'low';
}

export const useH5TodoStore = defineStore('h5-todo', () => {
  // 状态
  const todos = ref<TodoItem[]>([]);
  const loading = ref(false);
  const currentFilter = ref<'all' | 'pending' | 'completed'>('all');

  // 计算属性
  const filteredTodos = computed(() => {
    if (currentFilter.value === 'all') return todos.value;
    if (currentFilter.value === 'pending') return todos.value.filter((t) => t.status === 'pending');
    if (currentFilter.value === 'completed')
      return todos.value.filter((t) => t.status === 'completed');
    return todos.value;
  });

  const todoStats = computed(() => ({
    total: todos.value.length,
    pending: todos.value.filter((t) => t.status === 'pending').length,
    completed: todos.value.filter((t) => t.status === 'completed').length,
  }));

  // 方法
  async function fetchTodos() {
    loading.value = true;
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await api.h5.getTodos();
      // todos.value = response.data;

      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));
      todos.value = [
        {
          todo_id: '1',
          title: '完成设备巡检',
          content: '检查3号机组运行状态',
          tag: '待审核',
          status: 'pending',
          created_at: '2024-01-15',
          priority: 'high',
        },
        {
          todo_id: '2',
          title: '提交日报',
          content: '整理今日工作内容',
          tag: '进行中',
          status: 'pending',
          created_at: '2024-01-15',
          priority: 'medium',
        },
      ];
    } catch (error) {
      console.error('获取待办事项失败:', error);
    } finally {
      loading.value = false;
    }
  }

  function getTodoById(id: string) {
    return todos.value.find((t) => t.todo_id === id);
  }

  async function updateTodoStatus(id: string, status: 'pending' | 'completed') {
    const todo = todos.value.find((t) => t.todo_id === id);
    if (todo) {
      todo.status = status;
      // TODO: 调用 API 更新状态
    }
  }

  function setFilter(filter: 'all' | 'pending' | 'completed') {
    currentFilter.value = filter;
  }

  return {
    todos,
    loading,
    currentFilter,
    filteredTodos,
    todoStats,
    fetchTodos,
    getTodoById,
    updateTodoStatus,
    setFilter,
  };
});
