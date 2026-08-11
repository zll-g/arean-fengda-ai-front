<template>
  <div class="voice-assist">
    <!-- 头部 -->
    <van-nav-bar title="语音助手" />

    <!-- 聊天内容区域 -->
    <div class="chat-container">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message-item', message.role === 'user' ? 'user-message' : 'assistant-message']"
      >
        <!-- 助手头像 -->
        <div v-if="message.role === 'assistant'" class="avatar assistant-avatar">
          <van-icon name="bell" size="18" />
        </div>

        <!-- 消息气泡 -->
        <div
          :class="['message-bubble', message.role === 'user' ? 'user-bubble' : 'assistant-bubble']"
        >
          {{ message.content }}
        </div>

        <!-- 用户头像 -->
        <div v-if="message.role === 'user'" class="avatar user-avatar">
          <van-icon name="user-o" size="18" />
        </div>
      </div>
    </div>

    <!-- 底部输入栏 -->
    <div class="input-bar">
      <van-field v-model="inputText" placeholder="请输入文字描述" class="input-field" />
      <van-button round icon="mic" type="primary" color="#1989fa" class="mic-button" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Message {
  id: number;
  role: 'assistant' | 'user';
  content: string;
}

const inputText = ref('');

const messages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: '我是您的语音填单助手，您可以通过语音或文字描述，我会帮您自动填充表单内容。',
  },
  {
    id: 2,
    role: 'user',
    content: '6号机组3号闭式冷却水泵电机定子线圈温度1跳变至负数',
  },
  {
    id: 3,
    role: 'assistant',
    content:
      '已为您识别到缺陷信息，已自动填充到表单中。请检查表单内容是否正确，如有需要补充的信息可以继续告诉我。',
  },
];
</script>

<style scoped>
.voice-assist {
  display: flex;
  flex-direction: column;
  max-height: 500px;
  padding: 16px;
  margin: 16px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.chat-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
  overflow-y: auto;
}

.message-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.user-message {
  flex-direction: row;
  justify-content: flex-end;
}

.avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.assistant-avatar {
  order: 1;
  background-color: #dcdee0;
}

.assistant-avatar .van-icon {
  color: #969799;
}

.assistant-bubble {
  order: 2;
  color: #323233;
  background-color: #f2f3f5;
  border-top-left-radius: 4px;
}

.user-avatar {
  order: 2;
  background: linear-gradient(135deg, #ff9a3d 0%, #ff6b3d 100%);
}

.user-avatar .van-icon {
  color: white;
}

.user-bubble {
  order: 1;
  color: white;
  background-color: #1989fa;
  border-top-right-radius: 4px;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  word-wrap: break-word;
  border-radius: 12px;
}

.input-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0 0;
  margin-top: 8px;
}

.input-field {
  flex: 1;
  padding: 8px 16px !important;
  background-color: #f7f8fa;
  border-radius: 20px;
}

:deep(.input-field .van-field__control) {
  font-size: 14px;
}

.mic-button {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
}

:deep(.mic-button .van-button__content) {
  padding: 0;
}
</style>
