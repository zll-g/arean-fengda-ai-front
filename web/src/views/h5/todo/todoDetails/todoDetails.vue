<template>
  <div class="todo-details-page">
    <van-sticky>
      <van-nav-bar title="待办详情" left-text="返回" left-arrow @click-left="onClickLeft">
        <template #right>
          <van-button
            v-if="isEditing && !isCompleted"
            size="small"
            type="primary"
            @click="handleSave"
          >
            保存
          </van-button>
        </template>
      </van-nav-bar>
    </van-sticky>

    <div v-if="todoData" class="details-content">
      <!-- 状态标签和标题 -->
      <div class="status-header">
        <van-tag size="large" :type="getTagType(todoData.tag) as any">
          {{ todoData.tag }}
        </van-tag>
        <van-field
          v-if="isEditing && !isCompleted"
          v-model="editForm.title"
          class="title-input"
          placeholder="请输入标题"
        />
        <h1 v-else class="todo-title">{{ todoData.title }}</h1>
      </div>

      <!-- 详细描述 -->
      <van-cell-group inset class="section-group">
        <van-cell title="详细描述" />
        <div v-if="!isEditing || isCompleted" class="description-content">
          {{ todoData.desc }}
        </div>
        <van-field
          v-else
          v-model="editForm.desc"
          type="textarea"
          :autosize="{ minHeight: 120 }"
          placeholder="请输入详细描述"
          class="edit-textarea"
        />
      </van-cell-group>

      <!-- 元信息 -->
      <van-cell-group inset class="section-group">
        <van-cell v-if="todoData.priority" title="优先级" :value="todoData.priority">
          <template #icon>
            <van-icon name="flag-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell v-if="todoData.deadline" title="截止时间" :value="todoData.deadline">
          <template #icon>
            <van-icon name="clock-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell v-if="todoData.creator" title="创建人" :value="todoData.creator">
          <template #icon>
            <van-icon name="user-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell title="创建时间" :value="todoData.create_time">
          <template #icon>
            <van-icon name="calendar-o" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 子任务列表 -->
      <van-cell-group v-if="!isCompleted" inset class="section-group">
        <van-cell title="子任务" :value="`${completedSubtasks}/${subtasks.length}`" />
        <van-checkbox-group v-model="checkedSubtasks">
          <van-cell
            v-for="(subtask, index) in subtasks"
            :key="index"
            clickable
            :title="subtask.title"
            @click="toggleSubtask(index)"
          >
            <template #right-icon>
              <van-checkbox ref="checkboxes" :name="index" @click.stop />
            </template>
          </van-cell>
        </van-checkbox-group>
      </van-cell-group>

      <!-- 活动记录 -->
      <van-cell-group inset class="section-group">
        <van-cell title="活动记录" />
        <van-cell
          v-for="(activity, index) in activities"
          :key="index"
          :title="activity.title"
          :label="activity.time"
          center
        >
          <template #icon>
            <van-icon :name="activity.icon" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 操作按钮 - 仅未完成状态显示 -->
      <div v-if="!isCompleted" class="action-buttons">
        <van-button type="primary" size="large" block @click="handleMainAction">
          {{ todoData.button_text }}
        </van-button>
        <van-button type="default" size="large" block @click="handleEdit">
          {{ isEditing ? '取消编辑' : '编辑' }}
        </van-button>
        <van-button type="danger" plain size="large" block @click="handleDelete"> 删除 </van-button>
      </div>
    </div>

    <van-empty v-else image="search" description="待办事项不存在" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showConfirmDialog, showSuccessToast } from 'vant';

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

interface Subtask {
  title: string;
  completed: boolean;
}

interface Activity {
  title: string;
  time: string;
  icon: string;
}

const router = useRouter();
const route = useRoute();

const todoData = ref<TodoData | null>(null);
const checkedSubtasks = ref<number[]>([]);
const isEditing = ref(false);

// 编辑表单
const editForm = ref({
  title: '',
  desc: '',
});

// 模拟子任务数据
const subtasks = ref<Subtask[]>([
  { title: '需求分析和文档编写', completed: true },
  { title: '技术方案设计', completed: true },
  { title: '前端页面开发', completed: false },
  { title: '后端接口开发', completed: false },
  { title: '测试和修复bug', completed: false },
]);

// 模拟活动记录
const activities = ref<Activity[]>([
  { title: '创建了待办事项', time: '2024-01-15 10:30', icon: 'add-o' },
  { title: '完成了子任务"需求分析和文档编写"', time: '2024-01-16 14:20', icon: 'success' },
  { title: '更新了截止时间', time: '2024-01-17 09:15', icon: 'clock-o' },
  { title: '添加了评论', time: '2024-01-18 11:45', icon: 'comment-o' },
]);

const completedSubtasks = computed(() => checkedSubtasks.value.length);

// 判断是否已完成
const isCompleted = computed(() => {
  return todoData.value?.tag === '已完成';
});

const onClickLeft = () => {
  router.back();
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

const toggleSubtask = (index: number) => {
  const isChecked = checkedSubtasks.value.includes(index);
  if (isChecked) {
    checkedSubtasks.value = checkedSubtasks.value.filter((i) => i !== index);
  } else {
    checkedSubtasks.value.push(index);
  }
};

const handleMainAction = () => {
  if (!todoData.value) return;

  showSuccessToast(`已${todoData.value.button_text}`);
  // 这里可以添加实际的API调用
};

const handleEdit = () => {
  if (isEditing.value) {
    // 取消编辑，恢复原始数据
    isEditing.value = false;
    editForm.value = {
      title: todoData.value?.title || '',
      desc: todoData.value?.desc || '',
    };
  } else {
    // 进入编辑模式
    isEditing.value = true;
    editForm.value = {
      title: todoData.value?.title || '',
      desc: todoData.value?.desc || '',
    };
  }
};

const handleSave = () => {
  if (!todoData.value) return;

  // 更新数据
  todoData.value.title = editForm.value.title;
  todoData.value.desc = editForm.value.desc;

  isEditing.value = false;
  showSuccessToast('保存成功');
};

const handleDelete = () => {
  showConfirmDialog({
    title: '确认删除',
    message: '确定要删除这个待办事项吗？',
  })
    .then(() => {
      showSuccessToast('删除成功');
      router.back();
    })
    .catch(() => {
      // 取消删除
    });
};

onMounted(() => {
  // 从路由参数获取待办ID，实际应用中应该从API获取数据
  const todoId = route.params.id || route.query.id;

  // 模拟数据 - 根据ID返回不同状态
  const mockData: Record<string, TodoData> = {
    '1': {
      id: '1',
      title: '缺陷单审核 #1234',
      desc: '#5号锅炉燃烧系统异常,需要紧急审核处理\n\n需要检查：\n1. 燃烧器工作状态\n2. 温度传感器数据\n3. 安全阀是否正常',
      tag: '待处理',
      button_text: '立即处理',
      create_time: '2025-12-23 09:30:00',
      priority: '高',
      deadline: '2025-12-25 18:00:00',
      creator: '张三',
    },
    '2': {
      id: '2',
      title: '设备巡检任务 #1235',
      desc: '#3号机组月度例行巡检,需确认设备运行状态\n\n巡检项目：\n1. 润滑系统检查\n2. 冷却系统检查\n3. 电气系统检查',
      tag: '进行中',
      button_text: '更新进度',
      create_time: '2025-12-24 09:30:00',
      priority: '中',
      deadline: '2025-12-26 18:00:00',
      creator: '李四',
    },
    '3': {
      id: '3',
      title: '安全检查 #1236',
      desc: '厂区安全隐患排查整改\n\n已发现问题：\n1. 消防通道堆放杂物\n2. 部分灭火器过期\n3. 应急照明损坏',
      tag: '待处理',
      button_text: '立即处理',
      create_time: '2025-12-25 14:20:00',
      priority: '高',
      deadline: '2025-12-27 18:00:00',
      creator: '王五',
    },
    '4': {
      id: '4',
      title: '数据报表 #1237',
      desc: '月度生产数据汇总报表\n\n报表包含：\n1. 生产量统计\n2. 设备运行时间\n3. 能耗分析\n4. 异常记录\n\n已完成并归档。',
      tag: '已完成',
      button_text: '查看详情',
      create_time: '2025-12-20 10:00:00',
      priority: '低',
      deadline: '2025-12-22 18:00:00',
      creator: '赵六',
    },
  };

  // 获取待办数据，如果找不到则使用默认值
  const id = String(todoId || '1');
  const data = mockData[id];

  if (data) {
    todoData.value = data;
  } else {
    todoData.value = mockData['1']!;
  }

  // 初始化编辑表单
  if (todoData.value) {
    editForm.value = {
      title: todoData.value.title,
      desc: todoData.value.desc,
    };
  }

  // 初始化已完成的子任务
  checkedSubtasks.value = subtasks.value
    .map((task, index) => (task.completed ? index : -1))
    .filter((index) => index !== -1);
});
</script>

<style scoped>
.todo-details-page {
  min-height: 100vh;
  padding-bottom: 80px;
  background-color: #f5f5f5;
}

.details-content {
  padding-top: 16px;
}

.status-header {
  padding: 20px 16px;
  margin-bottom: 12px;
  text-align: center;
  background: white;
}

.todo-title {
  margin: 16px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2937;
}

.title-input {
  margin-top: 16px;
}

.title-input :deep(.van-field__control) {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
}

.section-group {
  margin-bottom: 12px;
}

.description-content {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
  white-space: pre-wrap;
  background: white;
}

.edit-textarea {
  background: white;
}

.cell-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #969799;
}

.action-buttons {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  box-shadow: 0 -2px 8px rgb(0 0 0 / 5%);
}

.action-buttons .van-button {
  border-radius: 8px;
}
</style>
