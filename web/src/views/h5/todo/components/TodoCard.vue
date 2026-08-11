<template>
  <div class="todo-card">
    <div class="todo-content">
      <!-- 标题和标签 -->
      <div class="todo-header">
        <h4 class="todo-title">{{ todo.title }}</h4>
        <van-tag size="medium" :type="getTagType(todo.tag) as any">
          {{ todo.tag }}
        </van-tag>
      </div>

      <!-- 描述文本 -->
      <p class="todo-text">{{ todo.desc }}</p>

      <!-- 时间和按钮 -->
      <div class="todo-footer">
        <span class="create-time">{{ todo.create_time }}</span>
        <van-button size="small" type="primary" @click="handleAction">
          {{ todo.button_text }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface TodoData {
  id: string;
  title: string;
  desc: string;
  tag: string;
  button_text: string;
  create_time: string;
  priority?: string;
  deadline?: string;
  creator?: string;
}

interface Props {
  todo: TodoData;
}

const props = defineProps<Props>();
const router = useRouter();

const emit = defineEmits<{
  action: [];
}>();

const handleAction = () => {
  emit('action');
  router.push(`/h5/todo-details/${props.todo.id}`);
};

const getTagType = (tag: string) => {
  const tagMap: Record<string, string> = {
    待审核: 'danger',
    进行中: 'warning',
    已完成: 'success',
    待处理: 'warning',
  };
  return tagMap[tag] || 'default';
};
</script>

<style scoped>
.todo-card {
  max-width: calc(100% - 32px);
  padding: 1rem;
  margin: 0 auto 12px;
  text-align: left;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.todo-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

.todo-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.todo-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  text-align: left;
}

.todo-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #6b7280;
  text-align: left;
}

.todo-footer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.create-time {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
