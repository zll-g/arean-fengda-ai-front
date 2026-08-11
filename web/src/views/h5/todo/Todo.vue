<template>
  <div class="todo-page">
    <van-sticky>
      <van-nav-bar
        title="我的待办"
        left-text="返回"
        left-arrow
        @click-left="onClickLeft"
        @dblclick="handleDoubleClickTitle"
      >
        <template #right>
          <van-icon name="bell" size="18" />
        </template>
      </van-nav-bar>
    </van-sticky>

    <Circle />

    <!-- 标签页 -->
    <van-tabs v-model:active="active" animated>
      <van-tab title="全部">
        <TodoCard
          v-for="todo in allTodos"
          :key="todo.id"
          :todo="todo"
          @action="handleAction(todo)"
        />
      </van-tab>

      <van-tab title="待处理">
        <TodoCard
          v-for="todo in pendingTodos"
          :key="todo.id"
          :todo="todo"
          @action="handleAction(todo)"
        />
      </van-tab>

      <van-tab title="进行中">
        <TodoCard
          v-for="todo in inProgressTodos"
          :key="todo.id"
          :todo="todo"
          @action="handleAction(todo)"
        />
      </van-tab>

      <van-tab title="已完成">
        <TodoCard
          v-for="todo in completedTodos"
          :key="todo.id"
          :todo="todo"
          @action="handleAction(todo)"
        />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import Circle from './components/Circle.vue';
import TodoCard from './components/TodoCard.vue';
import { showToast } from 'vant';

interface TodoItem {
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

const fnc = function fnc(value: string): number {
  return value.length;
};
fnc('12344');

const router = useRouter();
const active = ref(0);

const allTodos: TodoItem[] = [
  {
    id: '1',
    title: '缺陷单审核 #1234',
    desc: '#5号锅炉燃烧系统异常,需要紧急审核处理',
    tag: '待审核',
    button_text: '立即处理',
    create_time: '2025-12-23 09:30:00',
    priority: '高',
    deadline: '2025-12-25 18:00:00',
    creator: '张三',
  },
  {
    id: '2',
    title: '设备巡检任务 #1235',
    desc: '#3号机组月度例行巡检,需确认设备运行状态',
    tag: '进行中',
    button_text: '查看详情',
    create_time: '2025-12-24 09:30:00',
    priority: '中',
    deadline: '2025-12-26 18:00:00',
    creator: '李四',
  },
  {
    id: '3',
    title: '安全检查 #1236',
    desc: '厂区安全隐患排查整改',
    tag: '待处理',
    button_text: '立即处理',
    create_time: '2025-12-25 14:20:00',
    priority: '高',
    deadline: '2025-12-27 18:00:00',
    creator: '王五',
  },
  {
    id: '4',
    title: '数据报表 #1237',
    desc: '月度生产数据汇总报表',
    tag: '已完成',
    button_text: '查看详情',
    create_time: '2025-12-20 10:00:00',
    priority: '低',
    deadline: '2025-12-22 18:00:00',
    creator: '赵六',
  },
];

// 根据标签状态过滤数据
const pendingTodos = computed(() => {
  return allTodos.filter((todo) => todo.tag === '待处理' || todo.tag === '待审核');
});

const inProgressTodos = computed(() => {
  return allTodos.filter((todo) => todo.tag === '进行中');
});

const completedTodos = computed(() => {
  return allTodos.filter((todo) => todo.tag === '已完成');
});

const onClickLeft = () => {
  router.back();
};

const handleDoubleClickTitle = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('已返回顶部');
};

const handleAction = (todo: TodoItem) => {
  console.log('点击操作按钮:', todo);
};
</script>

<style scoped>
.todo-page {
  min-height: 100vh;
  padding: 0 0 16px;
  background-color: #f7f8fa;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

:deep(.van-tab__panel) {
  padding: 16px;
}
</style>
