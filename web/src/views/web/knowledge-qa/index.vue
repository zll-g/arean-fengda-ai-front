<template>
  <div class="app-container">
    <ChatSidebar />
    <ConversationSettingsModal />
    <ChatMain ref="chatMainRef" @toggle-sidebar="toggleSidebar" />
  </div>
</template>

<script setup lang="ts">
import ChatMain from '@/components/knowledgeBase-chat/ChatMain.vue';
import ChatSidebar from '@/components/knowledgeBase-chat/ChatSidebar.vue';
import { useSettingsStore } from '@/store/modules/settings';
import ConversationSettingsModal from '@/components/knowledgeBase-chat/ConversationSettingsModal.vue';
const settingsStore = useSettingsStore();
const toggleSidebar = () => {
  settingsStore.toggleSidebar();
};
</script>

<style scoped>
/* 基础布局 */
.app-container {
  display: flex;
  height: 100%;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #333;
  background-color: #f7f9fc;
  border: 1px solid #e7edf6;
  box-shadow: 0 12px 40px rgb(28 54 96 / 8%);
}

/* 侧边栏样式 */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  padding: 20px 15px;
  background: #fff;
  border-right: 1px solid #eef0f2;
}

.sidebar-header {
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: bold;
}

.category-card {
  display: flex;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s;
}

.category-card.active {
  background-color: #f0f7ff;
  border-color: #409eff;
}

.icon-placeholder {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 10px;
  border-radius: 6px;
}

.inner-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.card-content {
  flex: 1;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
}

.card-desc {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}

.apply-btn {
  width: 100%;
  margin-top: 10px;
}

.common-questions {
  margin-top: 40px;
}

.section-label {
  margin-bottom: 15px;
  font-size: 13px;
  color: #666;
}

.common-questions li {
  margin-bottom: 15px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  list-style: none;
}

/* 右侧内容区 */
.main-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.main-header {
  padding: 20px 40px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.main-header h1 {
  margin: 0;
  font-size: 18px;
}

.main-header p {
  margin: 5px 0 0;
  font-size: 12px;
  color: #999;
}

/* 聊天流内容 */
.chat-body {
  flex: 1;
  padding: 30px 15%;
  overflow-y: auto;
}

.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 30px;
}

.message-row.user {
  justify-content: flex-end;
}

.ai-avatar-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  background: #eef5ff;
  border-radius: 4px;
}

.ai-icon-inner {
  width: 16px;
  height: 16px;
  background: #409eff;
  mask: url('data:image/svg+xml;utf8,<svg ...></svg>') no-repeat center; /* 预留给图标 */
}

.ai-bubble {
  max-width: 85%;
  padding: 20px;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 3%);
}

.source-info {
  padding-top: 15px;
  margin-top: 15px;
  font-size: 12px;
  color: #bbb;
  border-top: 1px solid #f5f5f5;
}

.user-bubble {
  max-width: 70%;
  padding: 10px 20px;
  font-size: 14px;
  color: #fff;
  background: #3678f3;
  border-radius: 18px 18px 2px;
}

/* 底部输入框样式 */
.input-area {
  padding: 20px 15% 40px;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  padding: 10px 15px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 5%);
}

.left-tools {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 8px;
  margin-right: 10px;
}

.tool-icon {
  width: 20px;
  height: 20px;
  background: #ccc;
  border-radius: 50%; /* 预留 */
}

.custom-input :deep(.el-textarea__inner) {
  padding: 5px;
  border: none;
  box-shadow: none;
}

.send-btn-box {
  padding-bottom: 5px;
  margin-left: 10px;
}

.hot-tags {
  margin-top: 12px;
  font-size: 12px;
  color: #999;
}

.hot-tags a {
  margin-right: 15px;
  color: #409eff;
  text-decoration: none;
}
</style>
