<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="conversation-settings-modal">
          <!-- 头部 -->
          <div class="modal-header">
            <div class="header-title">
              <MessageSquare :size="22" />
              <h3>对话设置</h3>
            </div>
            <button class="close-btn" @click="close">
              <X :size="20" />
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-content">
            <!-- 对话信息 -->
            <div class="section">
              <div class="section-title">对话信息</div>

              <!-- 标题 -->
              <div class="setting-item vertical">
                <label class="setting-label">对话标题</label>
                <input
                  v-model="localSettings.title"
                  type="text"
                  class="text-input"
                  placeholder="输入对话标题"
                />
              </div>

              <!-- 创建时间 -->
              <div class="setting-item">
                <span class="setting-label">创建时间</span>
                <span class="setting-value">{{ formatDate(conversation?.createdAt) }}</span>
              </div>

              <!-- 消息数量 -->
              <div class="setting-item">
                <span class="setting-label">消息数量</span>
                <span class="setting-value">{{ conversation?.messages.length || 0 }} 条</span>
              </div>
            </div>

            <!-- AI 设置 -->
            <div class="section">
              <div class="section-title">AI 设置</div>

              <!-- 模型选择 -->
              <div class="setting-item vertical">
                <label class="setting-label">AI 模型</label>
                <FormSelect
                  v-model="modelSelect"
                  :options="modelOptions"
                  value-prop="label"
                  @update:model-value="updateSelect"
                />
              </div>

              <!-- 温度 -->
              <div class="setting-item vertical">
                <div class="setting-header">
                  <label class="setting-label">温度</label>
                  <span class="setting-value">{{ localSettings.temperature.toFixed(1) }}</span>
                </div>
                <FormSlider v-model="localSettings.temperature" :min="0" :max="1" :step="0.1" />
                <p class="setting-hint">
                  较低的温度使回复更加集中和确定，较高的温度使回复更加多样化
                </p>
              </div>

              <!-- 最大 Token -->
              <div class="setting-item vertical">
                <div class="setting-header">
                  <label class="setting-label">最大回复长度</label>
                  <span class="setting-value">{{ localSettings.maxTokens }}</span>
                </div>
                <FormSlider v-model="localSettings.maxTokens" :min="256" :max="8192" :step="256" />
              </div>
            </div>

            <!-- 系统提示词 -->
            <div class="section">
              <div class="section-title">系统提示词</div>

              <div class="setting-item vertical">
                <textarea
                  v-model="localSettings.systemPrompt"
                  class="prompt-textarea"
                  rows="5"
                  placeholder="输入系统提示词，定义 AI 的角色和行为..."
                />
                <p class="setting-hint">系统提示词会影响 AI 在整个对话中的行为方式</p>
              </div>

              <!-- 预设提示词 -->
              <div class="preset-prompts">
                <span class="preset-label">快速选择：</span>
                <button
                  v-for="preset in presetPrompts"
                  :key="preset.name"
                  class="preset-btn"
                  @click="localSettings.systemPrompt = preset.prompt"
                >
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <!-- 记忆设置 -->
            <div class="section">
              <div class="section-title">记忆设置</div>

              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">启用对话记忆</span>
                  <span class="setting-desc">AI 会记住之前的对话内容</span>
                </div>
                <FormSwitch v-model="localSettings.enableMemory" />
              </div>

              <div v-if="localSettings.enableMemory" class="setting-item vertical">
                <div class="setting-header">
                  <label class="setting-label">记忆长度</label>
                  <span class="setting-value">{{ localSettings.memoryLength }} 条消息</span>
                </div>
                <FormSlider v-model="localSettings.memoryLength" :min="2" :max="50" :step="2" />
              </div>
            </div>

            <!-- 危险操作 -->
            <div class="section danger-section">
              <div class="section-title">危险操作</div>

              <div class="danger-actions">
                <button class="danger-btn" @click="handleClearMessages">
                  <Trash2 :size="18" />
                  <span>清空消息</span>
                </button>
                <button class="danger-btn" @click="handleDeleteConversation">
                  <Trash2 :size="18" />
                  <span>删除对话</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button class="cancel-btn" @click="close">取消</button>
            <button class="save-btn" @click="handleSave">
              <Check :size="18" />
              <span>保存设置</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';
import { useSettingsStore } from '@/store/modules/settings';
import FormSwitch from '@/components/ui/FormSwitch.vue';
import FormSlider from '@/components/ui/FormSlider.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import { Check, MessageSquare, Trash2, X } from '@/components/icons';
import { chatApi } from '@/api/modules/chat';
import type { ConversationSettings } from '@/types/chat';

const chatStore = useChatStore();
const settingsStore = useSettingsStore();

// 分开获取：响应式状态用 storeToRefs，普通数据直接从 store 获取
const { currentConversation: conversation } = storeToRefs(chatStore);
const { showConversationSettingsModal: visible, settings } = storeToRefs(settingsStore);
const availableModels: any = ref([]);
const modelSelect = ref(localStorage.getItem('modelSelect') || '');

onMounted(() => {
  chatApi.getModels().then((res: any) => {
    availableModels.value = res;
    if (!localStorage.getItem('modelSelect')) {
      modelSelect.value = availableModels.value[0]['name'] || '';
      localStorage.setItem('modelSelect', modelSelect.value);
    }
  });
});

// 本地设置副本
const localSettings = ref({
  title: '',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  enableMemory: true,
  memoryLength: 20,
});

// 模型选项 - 添加安全检查
const modelOptions = computed(() => {
  if (!availableModels.value || !Array.isArray(availableModels.value)) {
    return [{ value: 'gpt-4', label: 'GPT-4', description: '默认模型' }];
  }
  return availableModels.value?.map((model: any) => ({
    value: model.name,
    label: model.name,
    description: model.description,
  }));
});

// 预设提示词
const presetPrompts = [
  {
    name: '默认助手',
    prompt: '你是一个有帮助的 AI 助手，能够回答各种问题并提供帮助。',
  },
  {
    name: '代码专家',
    prompt: '你是一个专业的编程助手，擅长代码编写、调试和解释。请提供简洁、高质量的代码示例。',
  },
  {
    name: '写作助手',
    prompt: '你是一个专业的写作助手，擅长文章撰写、润色和编辑。请使用优美的语言和清晰的结构。',
  },
  {
    name: '翻译专家',
    prompt: '你是一个专业的翻译助手，能够在多种语言之间进行准确、自然的翻译。',
  },
  {
    name: '学习导师',
    prompt: '你是一个耐心的学习导师，擅长用简单易懂的方式解释复杂的概念，并提供练习建议。',
  },
];

function updateSelect(data: any) {
  localStorage.setItem('modelSelect', data);
}

// 格式化日期
function formatDate(timestamp?: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 监听对话变化，初始化设置
watch(
  [visible, conversation],
  ([isVisible, conv]) => {
    if (isVisible && conv) {
      localSettings.value = {
        title: conv.title || '',
        model: conv.settings?.model || settings.value.defaultModel || 'gpt-4',
        temperature: conv.settings?.temperature ?? settings.value.defaultTemperature ?? 0.7,
        maxTokens: conv.settings?.maxTokens || settings.value.defaultMaxTokens || 4096,
        systemPrompt: conv.settings?.systemPrompt || settings.value.defaultSystemPrompt || '',
        enableMemory: conv.settings?.enableMemory ?? true,
        memoryLength: conv.settings?.memoryLength || 20,
      };
    }
  },
  { immediate: true },
);

function close() {
  settingsStore.closeConversationSettingsModal();
}

function handleSave() {
  if (!conversation.value) return;

  // 更新对话标题
  if (localSettings.value.title !== conversation.value.title) {
    chatStore.renameConversation(conversation.value.id, localSettings.value.title);
  }

  // 更新对话设置 - 这里需要一个新方法来更新对话设置
  const convSettings: ConversationSettings = {
    model: localSettings.value.model,
    temperature: localSettings.value.temperature,
    maxTokens: localSettings.value.maxTokens,
    systemPrompt: localSettings.value.systemPrompt,
    enableMemory: localSettings.value.enableMemory,
    memoryLength: localSettings.value.memoryLength,
  };

  // 调用更新对话设置的方法
  chatStore.updateConversationSettings(conversation.value.id, convSettings);

  close();

  // 显示成功提示
  // @ts-expect-error
  if (window.$toast) {
    // @ts-expect-error
    window.$toast('设置已保存', 'success');
  }
}

function handleClearMessages() {
  if (!conversation.value) return;

  if (confirm('确定要清空所有消息吗？此操作不可恢复。')) {
    chatStore.clearConversation(conversation.value.id);
    close();
  }
}

function handleDeleteConversation() {
  if (!conversation.value) return;

  if (confirm('确定要删除这个对话吗？此操作不可恢复。')) {
    chatStore.deleteConversation(conversation.value.id);
    close();
  }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 50%);
}

.conversation-settings-modal {
  display: flex;
  flex-direction: column;
  width: 520px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: hidden;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%);

  .dark & {
    background: #1e1e2e;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;

  .dark & {
    border-bottom-color: #2d2d3d;
  }
}

.header-title {
  display: flex;
  gap: 12px;
  align-items: center;

  svg {
    color: #3b82f6;
  }

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;

    .dark & {
      color: #f3f4f6;
    }
  }
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    color: #1f2937;
    background: #f3f4f6;

    .dark & {
      color: #f3f4f6;
      background: #374151;
    }
  }
}

.modal-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.section {
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  &.vertical {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
}

.setting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;

  .dark & {
    color: #f3f4f6;
  }
}

.setting-desc {
  font-size: 12px;
  color: #9ca3af;
}

.setting-value {
  font-size: 14px;
  color: #6b7280;

  .setting-header & {
    font-weight: 500;
    color: #3b82f6;
  }
}

.setting-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #9ca3af;
}

.text-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;

  .dark & {
    color: #f3f4f6;
    background: #2d2d3d;
    border-color: #374151;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.prompt-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 14px;
  color: #1f2937;
  resize: vertical;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;

  .dark & {
    color: #f3f4f6;
    background: #2d2d3d;
    border-color: #374151;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.preset-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.preset-label {
  font-size: 12px;
  color: #9ca3af;
}

.preset-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  transition: all 0.2s ease;

  .dark & {
    color: #9ca3af;
    background: #2d2d3d;
    border-color: #374151;
  }

  &:hover {
    color: #3b82f6;
    border-color: #3b82f6;
  }
}

.danger-section {
  padding: 16px;
  background: rgb(239 68 68 / 5%);
  border: 1px solid rgb(239 68 68 / 10%);
  border-radius: 12px;
}

.danger-actions {
  display: flex;
  gap: 12px;
}

.danger-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  font-size: 14px;
  color: #ef4444;
  cursor: pointer;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 10px;
  transition: all 0.2s ease;

  .dark & {
    background: transparent;
    border-color: rgb(239 68 68 / 30%);
  }

  &:hover {
    color: white;
    background: #ef4444;
    border-color: #ef4444;
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;

  .dark & {
    border-top-color: #2d2d3d;
  }
}

.cancel-btn {
  padding: 10px 20px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;

  .dark & {
    color: #9ca3af;
    border-color: #374151;
  }

  &:hover {
    color: #374151;
    background: #f3f4f6;

    .dark & {
      color: #e5e7eb;
      background: #2d2d3d;
    }
  }
}

.save-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgb(59 130 246 / 40%);
    transform: translateY(-1px);
  }
}

// 动画
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;

  .conversation-settings-modal {
    transition: all 0.25s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .conversation-settings-modal {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
