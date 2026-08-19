<template>
  <div class="history-page">
    <van-sticky>
      <van-nav-bar title="知识库对话" left-text="返回" left-arrow @click-left="onClickLeft">
        <template #right>
          <div v-if="!isEditMode" class="nav-right">
            <span class="record-count">{{ conversations.length }}条记录</span>
            <button class="create-btn" type="button" @click="handleCreateConversation">+</button>
          </div>
        </template>
      </van-nav-bar>
    </van-sticky>

    <div class="history-list">
      <van-empty
        v-if="conversations.length === 0"
        class="empty-box"
        image-size="92"
        description="暂无对话记录"
      />

      <div
        v-for="record in conversations"
        :key="record.id"
        :class="['history-card', { selected: isSelected(record.id), 'edit-mode': isEditMode }]"
        @click="handleCardClick(record)"
      >
        <div v-if="isEditMode" class="select-checkbox" @click.stop="toggleSelectRecord(record.id)">
          <van-checkbox :model-value="isSelected(record.id)" />
        </div>

        <van-swipe-cell class="chat-swipe-item" :disabled="isEditMode">
          <div class="chat-card-inner" @click.stop="selectConversation(record)">
            <div class="chat-avatar">
              <div class="avatar-circle">
                <van-icon name="chat-o" />
              </div>
            </div>

            <div class="chat-info">
              <div class="info-top">
                <span class="chat-title">{{ record.title || '未命名对话' }}</span>
                <span class="chat-time">{{ formatTime(record.lastMessageAt) }}</span>
              </div>

              <div class="chat-preview">
                {{ record.title || '暂无对话内容' }}
              </div>
            </div>

            <van-icon class="arrow-icon" name="arrow" />
          </div>

          <template #right>
            <van-button square class="swipe-btn delete-btn" @click.stop="handleDelete(record.id)">
              <van-icon name="delete-o" />
            </van-button>
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <van-dialog
      v-model:show="editState.show"
      title="对话名称"
      show-cancel-button
      confirm-button-text="确定"
      cancel-button-text="取消"
      @confirm="confirmEdit"
    >
      <div class="edit-input-wrapper">
        <input
          v-model="editState.tempTitle"
          type="text"
          autofocus
          class="custom-edit-input"
          placeholder="请输入对话名称"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';

const router = useRouter();
const chatStore = useChatStore();

const { conversations } = storeToRefs(chatStore);

const isEditMode = ref(false);
const selectedRecords = ref<string[]>([]);

const editState = reactive({
  show: false,
  tempTitle: '',
  currentId: '',
});

const handleCreateConversation = () => {
  chatStore.updateKnowledgeBaseId('');
  chatStore.createConversation();

  router.push('/h5/knowledge-qa');
};

const onClickLeft = () => {
  router.back();
};

const handleCardClick = (record: any) => {
  if (isEditMode.value) {
    toggleSelectRecord(record.id);
  }
};

const selectConversation = (record: any) => {
  if (isEditMode.value) {
    toggleSelectRecord(record.id);
    return;
  }

  chatStore.updateKnowledgeBaseId(record.knowledgeBaseIds);
  chatStore.selectConversation(record, 'h5');
};

const confirmEdit = () => {
  const title = editState.tempTitle.trim();

  if (!title) {
    showToast('对话名称不能为空');
    return;
  }

  chatStore.renameConversation(editState.currentId, title);
  showToast('修改成功');
};

const handleDelete = async (id: string) => {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要删除这个对话吗？此操作不可恢复。',
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
    });

    chatStore.deleteConversation(id);
    showToast('删除成功');
  } catch {
    // 用户取消删除
  }
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

const formatTime = (timestamp?: number) => {
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

onMounted(() => {
  chatStore.getChat();
  console.log('conversations:', conversations.value);
});
</script>

<style scoped lang="scss">
.history-page {
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #eef6ff 0%, #f7f8fa 38%, #f7f8fa 100%);
}

:deep(.van-nav-bar) {
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 4px 18px rgb(25 137 250 / 8%);
}

:deep(.van-nav-bar__title) {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.van-nav-bar__left),
:deep(.van-nav-bar__text),
:deep(.van-nav-bar .van-icon) {
  color: #1989fa;
}

.nav-right {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 100%;
}

.record-count {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 26px;
  color: #4b5563;
  background: #f2f7ff;
  border: 1px solid #ddecff;
  border-radius: 999px;
}

.create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 22px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #1989fa 0%, #4dabff 100%);
  border: none;
  border-radius: 50%;
  box-shadow: 0 6px 14px rgb(25 137 250 / 24%);

  &:active {
    transform: scale(0.94);
  }
}

.history-list {
  box-sizing: border-box;
  min-height: calc(100vh - 46px);
  padding: 14px 14px 28px;
}

.empty-box {
  box-sizing: border-box;
  min-height: calc(100vh - 120px);
  padding-top: 90px;
}

.history-card {
  position: relative;
  margin-bottom: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(229 235 245 / 90%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgb(17 24 39 / 6%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  &.selected {
    background: #f0f8ff;
    border-color: #1989fa;
    box-shadow: 0 8px 24px rgb(25 137 250 / 14%);

    .chat-card-inner {
      background: linear-gradient(90deg, #f0f8ff 0%, #fff 100%);
    }
  }

  &.edit-mode {
    cursor: pointer;

    .chat-card-inner {
      padding-left: 54px;
    }
  }

  &:active {
    box-shadow: 0 4px 14px rgb(17 24 39 / 8%);
    transform: scale(0.985);
  }
}

.select-checkbox {
  position: absolute;
  top: 50%;
  left: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

.chat-swipe-item {
  width: 100%;
  background: #fff;

  .chat-card-inner {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 76px;
    padding: 14px 14px 14px 16px;
    background: #fff;
    transition:
      padding 0.2s ease,
      background 0.2s ease;

    .chat-avatar {
      flex-shrink: 0;
      margin-right: 12px;

      .avatar-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        font-size: 22px;
        color: #1989fa;
        background: linear-gradient(135deg, #e8f4ff 0%, #f4f9ff 100%);
        border: 1px solid #d8ecff;
        border-radius: 15px;
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 90%);

        &.type-发电量 {
          color: #1989fa;
          background: linear-gradient(135deg, #e8f4ff 0%, #f4f9ff 100%);
        }
      }
    }

    .chat-info {
      flex: 1;
      min-width: 0;
      padding-right: 8px;

      .info-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;

        .chat-title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 16px;
          font-weight: 600;
          line-height: 22px;
          color: #1f2937;
          white-space: nowrap;
        }

        .chat-time {
          flex-shrink: 0;
          max-width: 82px;
          margin-left: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          line-height: 18px;
          color: #9ca3af;
          text-align: right;
          white-space: nowrap;
        }
      }

      .chat-preview {
        display: -webkit-box;
        margin-top: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 1;
        font-size: 13px;
        line-height: 19px;
        color: #8a9099;
        word-break: break-all;
        -webkit-box-orient: vertical;
      }
    }

    .arrow-icon {
      flex-shrink: 0;
      font-size: 15px;
      color: #c5cad3;
    }
  }

  .swipe-btn {
    width: 64px;
    height: 100%;
    font-size: 20px;
    border: none;

    &.delete-btn {
      color: #fff;
      background: linear-gradient(180deg, #ff5b65 0%, #f5222d 100%);
    }
  }
}

.edit-input-wrapper {
  padding: 22px 22px 26px;

  .custom-edit-input {
    box-sizing: border-box;
    width: 100%;
    height: 46px;
    padding: 0 14px;
    font-size: 15px;
    line-height: 46px;
    color: #1f2937;
    outline: none;
    background: #f7f8fa;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;

    &::placeholder {
      color: #b6bcc6;
    }

    &:focus {
      background: #fff;
      border-color: #1989fa;
      box-shadow: 0 0 0 3px rgb(25 137 250 / 10%);
    }
  }
}

:deep(.van-checkbox__icon) {
  font-size: 19px;
}

:deep(.van-checkbox__icon--checked .van-icon) {
  color: #fff;
  background-color: #1989fa;
  border-color: #1989fa;
}

:deep(.van-pull-refresh) {
  min-height: calc(100vh - 74px);
}

:deep(.van-tag) {
  padding: 0 6px;
  font-weight: 400;
}
</style>
