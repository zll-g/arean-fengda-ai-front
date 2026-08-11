<template>
  <div class="history-page">
    <van-sticky>
      <van-nav-bar title="问数对话" left-text="返回" left-arrow @click-left="onClickLeft">
        <template #right>
          <div v-if="!isEditMode" class="nav-right">
            <span class="record-count">{{ chatStore.sessions.length }}条记录</span>
            <van-icon name="plus" size="20" @click="handleCreateConversation" />
          </div>
        </template>
      </van-nav-bar>

      <div class="datasource-switch">
        <div class="datasource-card" @click="openDatasourcePicker">
          <div class="datasource-main">
            <span class="datasource-label">当前数据源</span>

            <div class="datasource-name-row">
              <span class="datasource-dot" :class="{ online: isDatasourceOnline }" />
              <span class="datasource-name">{{ currentDatasourceName }}</span>
            </div>
          </div>

          <div class="datasource-action">
            <span>切换</span>
            <van-icon name="arrow" />
          </div>
        </div>
      </div>
    </van-sticky>

    <div class="history-list">
      <van-pull-refresh v-model="refreshing" @refresh="handleRefresh">
        <van-empty v-if="chatStore.sessions.length === 0" description="暂无对话记录" />

        <div
          v-for="record in chatStore.sessions"
          :key="record.id"
          :class="['history-card', { selected: isSelected(record.id), 'edit-mode': isEditMode }]"
          @click="handleCardClick(record)"
        >
          <div
            v-if="isEditMode"
            class="select-checkbox"
            @click.stop="toggleSelectRecord(record.id)"
          >
            <van-checkbox :model-value="isSelected(record.id)" />
          </div>

          <van-swipe-cell class="chat-swipe-item">
            <div class="chat-card-inner" @click.stop="selectConversation(record)">
              <div class="chat-avatar">
                <div class="avatar-circle" :class="'type-' + record.type">
                  <van-icon name="chat-o" />
                </div>
              </div>

              <div class="chat-info">
                <div class="info-top">
                  <span class="chat-title">{{ record.title || '新对话' }}</span>
                  <span class="chat-time">{{ formatTime(record.updatedTime) }}</span>
                </div>

                <div class="chat-preview">{{ record.messageCount || 0 }} 轮</div>
              </div>
            </div>

            <template #right>
              <van-button
                square
                class="swipe-btn delete-btn"
                @click.stop="handleDelete(record.sessionId)"
              >
                <van-icon name="delete-o" />
              </van-button>
            </template>
          </van-swipe-cell>
        </div>
      </van-pull-refresh>
    </div>

    <van-popup v-model:show="datasourcePickerVisible" round position="bottom">
      <van-picker
        title="切换数据源"
        :columns="datasourceColumns"
        :columns-field-names="{ text: 'text', value: 'value' }"
        @confirm="handleDatasourceConfirm"
        @cancel="datasourcePickerVisible = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';

import { useDatasourceStore } from '@/store/datasource';
import { useDataQueryStore } from '@/store/modules/dataQuery-chat';

const router = useRouter();

const chatStore = useDataQueryStore();
const dsStore = useDatasourceStore();

const refreshing = ref(false);
const datasourcePickerVisible = ref(false);

const isEditMode = ref(false);
const selectedRecords = ref<string[]>([]);

const datasourceColumns = computed(() => {
  return dsStore.list.map((item: any) => ({
    text: item.name || item.groupName || `数据源${item.id}`,
    value: String(item.id),
    raw: item,
  }));
});

const currentDatasource = computed(() => {
  return (
    dsStore.list.find((item: any) => String(item.id) === String(dsStore.currentId)) ||
    dsStore.current ||
    null
  );
});

const currentDatasourceName = computed(() => {
  return currentDatasource.value?.name || currentDatasource.value?.groupName || '请选择数据源';
});

const isDatasourceOnline = computed(() => {
  return currentDatasource.value?.lastTestResult === 1;
});

const onClickLeft = () => {
  router.back();
};

const handleCreateConversation = () => {
  handleNewChat();
  router.push('/h5/dataQuery-qa');
};

const handleNewChat = () => {
  chatStore.newSession();
};

const openDatasourcePicker = () => {
  if (datasourceColumns.value.length === 0) {
    showToast('暂无可切换的数据源');
    return;
  }

  datasourcePickerVisible.value = true;
};

const handleDatasourceConfirm = (value: any) => {
  const option = value?.selectedOptions?.[0] || (Array.isArray(value) ? value[0] : value);
  const id = option?.value || value?.selectedValues?.[0];

  datasourcePickerVisible.value = false;

  if (!id) return;

  const datasourceId = String(id);

  if (String(dsStore.currentId || '') === datasourceId) {
    return;
  }

  if (chatStore.queryMode !== 'single') {
    chatStore.queryMode = 'single';
  }

  selectedRecords.value = [];
  dsStore.setCurrent(datasourceId);
};

const handleRefresh = async () => {
  try {
    if (!dsStore.currentId) {
      showToast('请先选择数据源');
      return;
    }

    await chatStore.fetchSessions(String(dsStore.currentId));
    showToast('刷新成功');
  } catch (error) {
    console.error('刷新对话列表失败:', error);
    showToast('刷新失败');
  } finally {
    refreshing.value = false;
  }
};

const handleCardClick = (record: any) => {
  if (isEditMode.value) {
    toggleSelectRecord(record.id);
    return;
  }

  console.log('点击卡片:', record);
};

const handleDelete = (id: string) => {
  showConfirmDialog({
    title: '提示',
    message: '确定要删除这个对话吗？此操作不可恢复。',
  }).then(() => {
    chatStore.deleteSession(id);
  });
};

const selectConversation = (data: any) => {
  chatStore.selectSession(data.sessionId, 'h5');
};

const toggleSelectRecord = (recordId: string) => {
  const index = selectedRecords.value.indexOf(recordId);

  if (index > -1) {
    selectedRecords.value.splice(index, 1);
  } else {
    selectedRecords.value.push(recordId);
  }
};

const isSelected = (recordId: string) => {
  return selectedRecords.value.includes(recordId);
};

const formatTime = (timestamp: number | string) => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

watch(
  () => dsStore.list.length,
  (len) => {
    if (len > 0 && !dsStore.currentId && chatStore.queryMode === 'single') {
      dsStore.setCurrent(String(dsStore.list[0].id));
    }
  },
  { immediate: true },
);

watch(
  () => dsStore.currentId,
  async (newId) => {
    if (!newId || chatStore.queryMode !== 'single') return;

    try {
      selectedRecords.value = [];
      await chatStore.fetchSessions(String(newId));
    } catch (error) {
      console.error('获取对话列表失败:', error);
      showToast('获取对话列表失败');
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await dsStore.fetchList();
});
</script>

<style scoped lang="scss">
.history-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.record-count {
  margin-right: 8px;
  font-size: 13px;
  color: #646566;
}

.nav-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.datasource-switch {
  padding: 10px 16px 12px;
  background: #f7f8fa;
}

.datasource-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgb(25 137 250 / 6%);
}

.datasource-main {
  flex: 1;
  min-width: 0;
}

.datasource-label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #969799;
}

.datasource-name-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.datasource-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-right: 7px;
  background: #c8c9cc;
  border-radius: 50%;

  &.online {
    background: #07c160;
    box-shadow: 0 0 0 3px rgb(7 193 96 / 12%);
  }
}

.datasource-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  white-space: nowrap;
}

.datasource-action {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;
  margin-left: 12px;
  font-size: 13px;
  color: #1989fa;
}

.history-list {
  min-height: calc(100vh - 132px);
  padding: 12px 16px;
}

.history-card {
  position: relative;
  padding: 0;
  margin-bottom: 12px;
  overflow: hidden;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 5%);
  transition: all 0.3s ease;

  &.selected {
    background: #f0f9ff;
    border: 2px solid #1989fa;
  }

  &.edit-mode {
    cursor: pointer;
  }

  &:active {
    box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
    transform: scale(0.98);
  }
}

.select-checkbox {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
}

.chat-card-inner {
  padding-left: 52px;
}

.chat-swipe-item {
  background: #fff;

  .chat-card-inner {
    position: relative;
    display: flex;
    align-items: center;
    padding: 14px 16px;

    &::after {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 74px;
      height: 1px;
      content: '';
      background-color: #f2f2f2;
      transform: scaleY(0.5);
    }

    .chat-avatar {
      margin-right: 12px;

      .avatar-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        font-size: 22px;
        color: #1989fa;
        background: #eaf4ff;
        border-radius: 50%;

        &.type-发电量 {
          color: #1989fa;
          background: #e6f7ff;
        }
      }
    }

    .chat-info {
      flex: 1;
      min-width: 0;

      .info-top {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;

        .chat-title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 16px;
          font-weight: 500;
          color: #323233;
          white-space: nowrap;
        }

        .chat-time {
          flex-shrink: 0;
          font-size: 12px;
          color: #c8c9cc;
        }
      }

      .chat-preview {
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 14px;
        color: #969799;
        white-space: nowrap;
      }
    }
  }

  .swipe-btn {
    width: 60px;
    height: 100%;
    font-size: 20px;
    border: none;

    &.delete-btn {
      color: #fff;
      background-color: #f5222d;
    }
  }
}

.edit-input-wrapper {
  padding: 20px 24px 24px;

  .custom-edit-input {
    box-sizing: border-box;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    font-size: 15px;
    outline: none;
    background: #f9f9f9;
    border: 1px solid #e8e8e8;
    border-radius: 8px;

    &:focus {
      background: #fff;
      border-color: #1989fa;
    }
  }
}

.data-query-detail {
  padding: 16px;
  background-color: #fff;

  .detail-section {
    margin-bottom: 24px;

    .section-title {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #86909c;
      text-transform: uppercase;

      &::before {
        display: inline-block;
        width: 3px;
        height: 13px;
        margin-right: 8px;
        content: '';
        background-color: #1989fa;
        border-radius: 2px;
      }
    }

    .question-full {
      padding: 14px;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f7f8fa;
      border-radius: 12px;
    }

    .answer-full {
      font-size: 15px;
      line-height: 1.8;
      color: #4e5969;
      white-space: pre-wrap;
    }

    .detail-item {
      display: flex;
      padding: 10px 0;
      font-size: 14px;
      border-bottom: 1px solid #f2f2f2;

      .detail-label {
        flex-shrink: 0;
        width: 80px;
        color: #86909c;
      }

      .detail-value {
        flex: 1;
        color: #1d2129;
      }

      &:last-child {
        border-bottom: none;
      }
    }
  }
}

:deep(.van-tag) {
  padding: 0 6px;
  font-weight: 400;
}

:deep(.van-picker__toolbar) {
  height: 48px;
}

:deep(.van-picker__confirm) {
  color: #1989fa;
}
</style>
