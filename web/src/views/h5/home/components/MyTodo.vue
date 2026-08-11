<template>
  <div class="todo-container">
    <van-row justify="space-between" align="center" class="header">
      <van-col>
        <h3>我的待办</h3>
      </van-col>
      <van-col>
        <van-button plain size="small" color="#528af2" @click="handleClick">
          查看全部
          <van-icon name="arrow" />
        </van-button>
      </van-col>
    </van-row>

    <div class="todo-list">
      <div v-for="i in todoitem" :key="i.todo_id" class="todo-item">
        <div class="todo-content">
          <!-- 标题和标签 -->
          <div class="todo-header">
            <h4 class="todo-title">{{ i.title }}</h4>
            <van-tag size="medium" :type="getTagType(i.tag) as any">
              {{ i.tag }}
            </van-tag>
          </div>

          <!-- 描述文本 -->
          <p class="todo-text">{{ i.text }}</p>

          <!-- 时间和按钮 -->
          <div class="todo-footer">
            <span class="create-time">{{ i.create_time }}</span>
            <van-button size="small" type="primary" @click="handleAction()">
              {{ i.button_text }}
            </van-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TodoItem {
  todo_id: string;
  title: string;
  text: string;
  create_time: string;
  tag: string;
  button_text: string;
}

const todoitem: TodoItem[] = [
  {
    todo_id: '1',
    title: '缺陷单审核 #1234',
    text: '#5号锅炉燃烧系统异常,需要紧急审核处理',
    create_time: '2025-12-23 09:30:00',
    tag: '待审核',
    button_text: '立即处理',
  },
  {
    todo_id: '2',
    title: '设备巡检任务 #1235',
    text: '#3号机组月度例行巡检,需确认设备运行状态',
    create_time: '2025-12-24 09:30:00',
    tag: '进行中',
    button_text: '查看详情',
  },
];

const getTagType = (tag: string) => {
  const tagMap: Record<string, string> = {
    待审核: 'danger',
    进行中: 'warning',
    已完成: 'success',
    待处理: 'warning',
  };
  return tagMap[tag] || 'default';
};

const handleClick = () => {};

const handleAction = () => {};
</script>

<style scoped>
.todo-container {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 8px;
}

.header {
  margin-bottom: 1rem;
}

.header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.todo-item {
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.todo-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.todo-header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.todo-title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.todo-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
  color: #6b7280;
}

.todo-footer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.create-time {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
