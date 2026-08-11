<template>
  <header class="chat-header">
    <!-- 左侧：侧边栏切换和标题 -->
    <div class="header-left">
      <div v-if="props.messageCount > 0" class="conversation-info">
        <div class="title-row">
          <h1 class="title">{{ content }}</h1>

          <span class="message-badge">
            {{ props.messageCount }} {{ t('chatHeader.messageUnit') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧：知识库选择 + 操作按钮 + 文档状态 -->
    <div class="header-right">
      <div class="knowledge-selector">
        <span class="knowledge-label">{{ t('chatHeader.knowledgeBase') }}</span>

        <el-select
          v-model="selectedKnowledgeIds"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          :max-collapse-tags="1"
          :placeholder="t('chatHeader.selectKnowledgeBase')"
          class="knowledge-select"
          popper-class="knowledge-select-popper"
          @change="handleKnowledgeChange"
        >
          <el-option
            v-for="item in knowledgeList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </div>

      <!-- 当前文档状态 -->
      <div class="doc-status-selector">
        <button
          type="button"
          class="doc-status-btn"
          :class="{ active: showDocStatusMenu }"
          @click.stop="showDocStatusMenu = !showDocStatusMenu"
        >
          <span
            class="status-dot"
            :class="getStatusClass(docStatusLoading ? 'ONGOING' : docSessionStatus)"
          />

          <span class="doc-status-title">当前文档状态</span>

          <span
            class="doc-status-value"
            :class="getStatusClass(docStatusLoading ? 'ONGOING' : docSessionStatus)"
          >
            {{ docStatusLoading ? '查询中' : getStatusLabel(docSessionStatus) }}
          </span>

          <svg
            class="status-arrow"
            :class="{ open: showDocStatusMenu }"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 8L10 12L14 8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <Transition name="dropdown">
          <div v-if="showDocStatusMenu" class="doc-status-menu" @click.stop>
            <div class="doc-status-menu-header">
              <div>
                <div class="doc-status-menu-title">文档列表</div>
                <div class="doc-status-menu-subtitle">{{ docDocuments.length }} 个文档</div>
              </div>

              <span
                v-if="currentConversation?.docSessionId"
                class="doc-retry-btn"
                @click="refreshDocSessionStatus(currentConversation?.docSessionId)"
              >
                重试
              </span>

              <span
                class="doc-state-pill"
                :class="getStatusClass(docStatusLoading ? 'ONGOING' : docSessionStatus)"
              >
                <span
                  class="status-dot"
                  :class="getStatusClass(docStatusLoading ? 'ONGOING' : docSessionStatus)"
                />
                {{ docStatusLoading ? '查询中' : getStatusLabel(docSessionStatus) }}
              </span>
            </div>

            <div v-if="docStatusLoading" class="doc-empty">正在获取文档状态...</div>

            <div v-else-if="!docDocuments.length" class="doc-empty">暂无文档</div>

            <div v-else class="doc-list">
              <div
                v-for="(doc, index) in docDocuments"
                :key="doc.filename || doc.url || index"
                class="doc-item"
                @click="handlePreviewFile(doc)"
              >
                <div class="doc-info">
                  <div class="doc-name" :title="doc.fileOriginalName || doc.filename">
                    {{ doc.fileOriginalName || doc.filename || '未命名文档' }}
                  </div>

                  <div class="doc-meta">
                    {{ getDocMeta(doc) }}
                  </div>
                </div>

                <span class="doc-status-tag" :class="getStatusClass(doc.documentStatus)">
                  <span class="status-dot" :class="getStatusClass(doc.documentStatus)" />
                  {{ getStatusLabel(doc.documentStatus) }}
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
  <FilePreviewDialog ref="filePreviewDialogRef" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api';

import { chatApi } from '@/api/modules/chat';
import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/knowledge-chat';
import FilePreviewDialog from '@/components/filePreviewDialog/index.vue';
interface KnowledgeItem {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface DocItem {
  filename?: string;
  fileOriginalName?: string;
  url?: string;
  fileSuffix?: string;
  fileType?: string;
  fileSize?: number;
  documentStatus?: string;
  [key: string]: any;
}

const DOC_STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: '等待处理',
    className: 'status-pending',
  },
  COMPLETED: {
    label: '已完成',
    className: 'status-completed',
  },
  ONGOING: {
    label: '进行中',
    className: 'status-ongoing',
  },
  ONG0ING: {
    label: '进行中',
    className: 'status-ongoing',
  },
  FAILED: {
    label: '失败',
    className: 'status-failed',
  },
};
const POLL_TIME = 2000;
const { t } = useI18n();

const chatStore = useChatStore();

const { knowledgeBaseId, conversations, currentConversation, refreshStatus } =
  storeToRefs(chatStore);
const filePreviewDialogRef = ref<InstanceType<typeof FilePreviewDialog>>();

const content: any = computed(() => {
  return conversations.value.filter((v) => v.id === currentConversation.value.id)[0]?.title ?? '';
});

const props = withDefaults(
  defineProps<{
    title?: string;
    messageCount?: number;
    showSidebarToggle?: boolean;
    isWideMode?: boolean;
    isPinned?: boolean;
    currentModelId?: string;
  }>(),
  {
    title: '新对话',
    messageCount: 0,
    showSidebarToggle: true,
    isWideMode: true,
    isPinned: false,
    currentModelId: 'gpt-4',
  },
);

const showModelMenu = ref(false);
const showMoreMenu = ref(false);
const showDocStatusMenu = ref(false);

const currentModel = ref(localStorage.getItem('modelSelect') || '');
const models: any = ref([]);

const knowledgeList = ref<KnowledgeItem[]>([]);
const selectedKnowledgeIds = ref<Array<string | number>>([]);

const docStatusLoading = ref(false);
const docSessionStatus = ref('');
const docDocuments = ref<DocItem[]>([]);
let docStatusTimer: ReturnType<typeof setTimeout> | null = null;

const isCompleted = (status?: string) =>
  normalizeStatus(status) === 'COMPLETED' || normalizeStatus(status) === 'FAILED';
const normalizeStatus = (status?: string) => String(status || '').toUpperCase();

const handlePreviewFile = (row: any) => {
  console.log({ ...row, filePolicyUrl: row.name });
  filePreviewDialogRef.value?.open({ ...row, filePolicyUrl: row.url });
};

/**
 * 获取知识库列表
 */
const getKnowledgeList = () => {
  api.base.getKnowledgeList({ page: 1, limit: 999 }).then((res: any) => {
    knowledgeList.value = res.data || [];

    const checkedIds = knowledgeList.value.filter((item) => item.checked).map((item) => item.id);

    if (checkedIds.length > 0) {
      selectedKnowledgeIds.value = checkedIds;
      syncKnowledgeBase();
    }
  });
};

/**
 * 同步选中的知识库 ID 到 store
 */
const syncKnowledgeBase = () => {
  const checkedIds = selectedKnowledgeIds.value.join(',');

  chatStore.updateKnowledgeBaseId(checkedIds);
};

/**
 * 下拉选择变化
 */
const handleKnowledgeChange = () => {
  syncKnowledgeBase();
};

const formatFileSize = (size?: number) => {
  if (size === undefined || size === null) return '未知大小';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getDocMeta = (doc: DocItem) => {
  const suffix = doc.fileSuffix ? doc.fileSuffix.toUpperCase() : '文件';
  return `${suffix} · ${formatFileSize(doc.fileSize)}`;
};

onMounted(() => {
  getKnowledgeList();

  chatApi.getModels().then((res: any) => {
    models.value = res;
    if (!localStorage.getItem('modelSelect')) {
      currentModel.value = models.value[0]?.name || '';
      localStorage.setItem('modelSelect', currentModel.value);
    }
  });

  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
  }
});

const clearDocStatusTimer = () => {
  if (docStatusTimer) {
    clearTimeout(docStatusTimer);
    docStatusTimer = null;
  }
};

const startDocStatusPolling = (docSessionId: string) => {
  clearDocStatusTimer();

  docStatusTimer = setTimeout(() => {
    getDocSessionStatus(docSessionId, true);
  }, POLL_TIME);
};

const getStatusConfig = (status?: string) => {
  const key = normalizeStatus(status);

  return (
    DOC_STATUS_MAP[key] || {
      label: status || '暂无状态',
      className: status ? 'status-failed' : 'status-empty',
    }
  );
};

const getStatusLabel = (status?: string) => {
  return getStatusConfig(status).label;
};

const getStatusClass = (status?: string) => {
  return getStatusConfig(status).className;
};

const refreshDocSessionStatus = async (docSessionId: string) => {
  try {
    const res: any = await api.knowledgeQa.refreshDocSessionStatus(docSessionId);
    const data = res?.data || {};

    // 切换对话后，旧请求返回不再更新当前页面
    if (docSessionId !== currentConversation.value?.docSessionId) return;

    docSessionStatus.value = data.status || '';
    docDocuments.value = Array.isArray(data.documents) ? data.documents : [];

    // 只要总状态不是 COMPLETED，就每 2 秒刷新一次
    if (!isCompleted(docSessionStatus.value)) {
      startDocStatusPolling(docSessionId);
    }
  } catch (error) {
    console.error(error);

    if (docSessionId !== currentConversation.value?.docSessionId) return;

    docSessionStatus.value = 'FAILED';
    docDocuments.value = [];

    // 接口异常也继续轮询，避免临时网络问题导致状态不再更新
    startDocStatusPolling(docSessionId);
  } finally {
    if (docSessionId === currentConversation.value?.docSessionId) {
      docStatusLoading.value = false;
    }
  }
};

const getDocSessionStatus = async (docSessionId?: string, silent = false) => {
  clearDocStatusTimer();

  if (!docSessionId) {
    docStatusLoading.value = false;
    docSessionStatus.value = '';
    docDocuments.value = [];
    return;
  }

  if (!silent) {
    docStatusLoading.value = true;
  }

  try {
    const res: any = await api.knowledgeQa.getDocSessionStatus(docSessionId);
    const data = res?.data || {};

    // 切换对话后，旧请求返回不再更新当前页面
    if (docSessionId !== currentConversation.value?.docSessionId) return;

    docSessionStatus.value = data.status || '';
    docDocuments.value = Array.isArray(data.documents) ? data.documents : [];

    // 只要总状态不是 COMPLETED，就每 2 秒刷新一次
    if (!isCompleted(docSessionStatus.value)) {
      startDocStatusPolling(docSessionId);
    }
  } catch (error) {
    console.error(error);

    if (docSessionId !== currentConversation.value?.docSessionId) return;

    docSessionStatus.value = 'FAILED';
    docDocuments.value = [];

    // 接口异常也继续轮询，避免临时网络问题导致状态不再更新
    startDocStatusPolling(docSessionId);
  } finally {
    if (docSessionId === currentConversation.value?.docSessionId) {
      docStatusLoading.value = false;
    }
  }
};

watch(
  () => currentConversation.value?.docSessionId,
  (val) => {
    clearDocStatusTimer();
    getDocSessionStatus(val);
  },
  { immediate: true },
);

watch(
  () => refreshStatus.value,
  () => {
    console.log('刷新文档');
    getDocSessionStatus(currentConversation.value?.docSessionId);
  },
);
onBeforeUnmount(() => {
  clearDocStatusTimer();
  if (typeof window !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
  }
});

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (!target.closest('.model-selector') && !target.closest('.model-menu')) {
    showModelMenu.value = false;
  }

  if (!target.closest('.more-wrapper')) {
    showMoreMenu.value = false;
  }

  if (!target.closest('.doc-status-selector')) {
    showDocStatusMenu.value = false;
  }
}

watch(
  () => knowledgeBaseId.value,
  (val: string) => {
    if (val) {
      selectedKnowledgeIds.value = val.split(',');
    } else {
      selectedKnowledgeIds.value = [];
    }
  },
  { deep: true, immediate: true },
);
</script>

<style lang="scss" scoped>
.chat-header {
  position: relative;
  z-index: 20;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 12px 22px;
  background: linear-gradient(180deg, rgb(255 255 255 / 98%) 0%, rgb(255 250 245 / 96%) 100%);
  border-bottom: 1px solid rgb(242 226 210 / 90%);
  box-shadow: 0 8px 28px rgb(126 72 24 / 5%);
  backdrop-filter: blur(16px);

  .dark & {
    background: linear-gradient(180deg, rgb(31 25 21 / 98%) 0%, rgb(25 20 17 / 96%) 100%);
    border-bottom-color: #41342b;
    box-shadow: 0 10px 30px rgb(0 0 0 / 24%);
  }
}

.header-left {
  display: flex;
  flex: 1;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.conversation-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.title {
  max-width: 520px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  color: #2f271f;
  white-space: nowrap;

  .dark & {
    color: #fffaf5;
  }
}

.title-small {
  max-width: 680px;
  margin: 5px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.35;
  color: #6f6258;
  white-space: nowrap;

  .dark & {
    color: #b9aca2;
  }
}

.message-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #f97316;
  background: #fff4e9;
  border: 1px solid #ffd3aa;
  border-radius: 999px;

  .dark & {
    color: #ffb36b;
    background: rgb(249 115 22 / 14%);
    border-color: rgb(255 157 66 / 20%);
  }
}

.header-right {
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  margin-left: 20px;
}

/* 知识库选择 */
.knowledge-selector {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 46px;
  padding: 4px 6px 4px 12px;
  background: rgb(255 249 243 / 92%);
  border: 1px solid rgb(243 224 206 / 88%);
  border-radius: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;

  &:hover {
    background: #fff;
    border-color: #ffc995;
    box-shadow: 0 8px 20px rgb(249 115 22 / 6%);
  }

  .dark & {
    background: rgb(59 46 37 / 55%);
    border-color: #4a392e;

    &:hover {
      background: rgb(67 51 40 / 72%);
      border-color: rgb(255 157 66 / 26%);
    }
  }
}

.knowledge-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #4b3d32;

  .dark & {
    color: #f1e7df;
  }
}

.knowledge-select {
  width: 260px;

  :deep(.el-select__wrapper) {
    min-height: 36px;
    background: #fff;
    border-radius: 11px;
    box-shadow: 0 0 0 1px rgb(239 222 205 / 95%) inset;
    transition:
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  :deep(.el-select__wrapper:hover) {
    box-shadow: 0 0 0 1px #ffc995 inset;
  }

  :deep(.el-select__wrapper.is-focused) {
    background: #fff;
    box-shadow:
      0 0 0 1px #ff8a26 inset,
      0 0 0 4px rgb(255 138 38 / 9%),
      0 8px 20px rgb(249 115 22 / 8%);
  }

  :deep(.el-select__placeholder),
  :deep(.el-select__selected-item) {
    font-size: 13px;
  }

  :deep(.el-select__placeholder) {
    color: #a89b90;
  }

  :deep(.el-select__selected-item) {
    color: #4b3d32;
  }

  :deep(.el-tag) {
    height: 24px;
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd3aa;
    border-radius: 999px;
  }

  :deep(.el-tag .el-tag__close) {
    color: #f97316;

    &:hover {
      color: #fff;
      background: #ff8a26;
    }
  }

  .dark & {
    :deep(.el-select__wrapper) {
      background: #352a23;
      box-shadow: 0 0 0 1px #4b3b31 inset;
    }

    :deep(.el-select__wrapper:hover) {
      box-shadow: 0 0 0 1px rgb(255 157 66 / 32%) inset;
    }

    :deep(.el-select__wrapper.is-focused) {
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 10%);
    }

    :deep(.el-select__selected-item) {
      color: #f5ebe3;
    }

    :deep(.el-tag) {
      color: #ffb36b;
      background: rgb(249 115 22 / 14%);
      border-color: rgb(255 157 66 / 20%);
    }
  }
}

.action-group {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px;
  background: rgb(255 249 243 / 92%);
  border: 1px solid rgb(243 224 206 / 88%);
  border-radius: 14px;

  .dark & {
    background: rgb(59 46 37 / 55%);
    border-color: #4a392e;
  }
}

/* 当前文档状态 */
.doc-status-selector {
  position: relative;
  flex-shrink: 0;
}

.doc-status-btn {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  max-width: 248px;
  height: 46px;
  padding: 0 12px;
  color: #4b3d32;
  cursor: pointer;
  outline: none;
  background: rgb(255 249 243 / 92%);
  border: 1px solid rgb(243 224 206 / 88%);
  border-radius: 14px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover,
  &.active {
    background: #fff;
    border-color: #ffc995;
    box-shadow: 0 8px 20px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  &.active {
    border-color: #ffb36b;
    box-shadow:
      0 0 0 3px rgb(255 138 38 / 8%),
      0 8px 20px rgb(249 115 22 / 10%);
  }

  .dark & {
    color: #f1e7df;
    background: rgb(59 46 37 / 55%);
    border-color: #4a392e;

    &:hover,
    &.active {
      background: #3b2e26;
      border-color: rgb(255 157 66 / 32%);
      box-shadow: 0 10px 24px rgb(0 0 0 / 28%);
    }
  }
}

.doc-status-title {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
}

.doc-status-value {
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-arrow {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: #b5a79b;
  transition:
    color 0.18s ease,
    transform 0.18s ease;

  .doc-status-btn:hover &,
  .doc-status-btn.active & {
    color: #f97316;
  }

  &.open {
    transform: rotate(180deg);
  }
}

/* 文档状态弹窗 */
.doc-status-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 110;
  width: 360px;
  max-height: 420px;
  padding: 12px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background: rgb(255 255 255 / 98%);
  border: 1px solid rgb(242 222 204 / 94%);
  border-radius: 18px;
  box-shadow:
    0 18px 48px rgb(92 54 24 / 14%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
  backdrop-filter: blur(18px);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #dc9857;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::before {
    position: absolute;
    top: -5px;
    right: 28px;
    width: 10px;
    height: 10px;
    content: '';
    background: inherit;
    border-top: 1px solid rgb(242 222 204 / 94%);
    border-left: 1px solid rgb(242 222 204 / 94%);
    transform: rotate(45deg);
  }

  .dark & {
    scrollbar-color: #76513a transparent;
    background: rgb(35 27 22 / 98%);
    border-color: #4a392e;
    box-shadow: 0 18px 48px rgb(0 0 0 / 38%);

    &::before {
      border-color: #4a392e;
    }

    &::-webkit-scrollbar-thumb {
      background: #76513a;
    }
  }
}

.doc-status-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f1e1d2;

  .dark & {
    border-bottom-color: #4a392e;
  }
}

.doc-status-menu-title {
  font-size: 14px;
  font-weight: 800;
  color: #33291f;

  .dark & {
    color: #fffaf5;
  }
}

.doc-status-menu-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #aa9b8f;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 12px;
  cursor: pointer;
  background: #fffaf5;
  border: 1px solid #f2e3d5;
  border-radius: 14px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;

  &:hover {
    background: #fff;
    border-color: #ffc995;
    box-shadow: 0 8px 20px rgb(249 115 22 / 7%);
    transform: translateY(-1px);
  }

  .dark & {
    background: rgb(64 49 39 / 45%);
    border-color: #4a392e;

    &:hover {
      background: rgb(71 53 42 / 78%);
      border-color: rgb(255 157 66 / 28%);
      box-shadow: 0 10px 24px rgb(0 0 0 / 18%);
    }
  }
}

.doc-info {
  min-width: 0;
}

.doc-name {
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 700;
  color: #4b3d32;
  white-space: nowrap;

  .dark & {
    color: #f1e7df;
  }
}

.doc-meta {
  margin-top: 5px;
  font-size: 12px;
  color: #aa9b8f;
}

.doc-empty {
  padding: 30px 12px;
  font-size: 13px;
  color: #aa9b8f;
  text-align: center;
}

/* 重试 */
.doc-retry-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #f97316;
  cursor: pointer;
  user-select: none;
  background: #fff4e9;
  border: 1px solid #ffd3aa;
  border-radius: 999px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;

  &:hover {
    color: #e86408;
    background: #ffe8d2;
    border-color: #ffbd7c;
    box-shadow: 0 6px 14px rgb(249 115 22 / 12%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: none;
    transform: translateY(0);
  }

  .dark & {
    color: #ffb36b;
    background: rgb(249 115 22 / 14%);
    border-color: rgb(255 157 66 / 20%);

    &:hover {
      color: #ffd0a4;
      background: rgb(249 115 22 / 20%);
      border-color: rgb(255 157 66 / 34%);
    }
  }
}

.doc-state-pill,
.doc-status-tag {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 999px;
}

.status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

/* 已完成：保留绿色语义 */
.status-completed {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;

  &.status-dot {
    background: #22c55e;
    box-shadow: 0 0 0 3px rgb(34 197 94 / 14%);
  }
}

/* 等待处理：橙黄色 */
.status-pending {
  color: #c25f05;
  background: #fff7ed;
  border-color: #fed7aa;

  &.status-dot {
    background: #f59e0b;
    box-shadow: 0 0 0 3px rgb(245 158 11 / 14%);
  }
}

/* 进行中：统一橙色 */
.status-ongoing {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;

  &.status-dot {
    background: #ff8a26;
    box-shadow: 0 0 0 3px rgb(255 138 38 / 14%);
    animation: status-pulse 1.5s ease-in-out infinite;
  }
}

/* 失败：保留红色语义 */
.status-failed {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;

  &.status-dot {
    background: #ef4444;
    box-shadow: 0 0 0 3px rgb(239 68 68 / 12%);
  }
}

.status-empty {
  color: #7c6c60;
  background: #faf7f4;
  border-color: #eadfd5;

  &.status-dot {
    background: #aa9b8f;
    box-shadow: 0 0 0 3px rgb(170 155 143 / 14%);
  }
}

@keyframes status-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgb(255 138 38 / 14%);
  }

  50% {
    box-shadow: 0 0 0 6px rgb(255 138 38 / 5%);
  }
}

/* 通用图标按钮 */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: #7c6c60;
  cursor: pointer;
  outline: none;
  background: transparent;
  border: none;
  border-radius: 11px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    opacity 0.18s ease;

  &:hover:not(:disabled) {
    color: #f97316;
    background: #fff;
    box-shadow: 0 8px 20px rgb(126 72 24 / 9%);
    transform: translateY(-1px);

    .dark & {
      color: #ffbd7c;
      background: #3b2e26;
      box-shadow: 0 10px 24px rgb(0 0 0 / 28%);
    }
  }

  &:active:not(:disabled) {
    box-shadow: none;
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }

  &.danger:hover:not(:disabled) {
    color: #ef4444;
    background: #fef2f2;

    .dark & {
      color: #fca5a5;
      background: rgb(239 68 68 / 12%);
    }
  }
}

.toggle-sidebar-btn {
  flex-shrink: 0;
  background: #fff8f1;
  border: 1px solid #f1e1d2;

  .dark & {
    background: #3b2e26;
    border-color: #4f3d32;
  }
}

.more-wrapper {
  position: relative;
}

/* 更多菜单 */
.more-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 100;
  min-width: 190px;
  padding: 8px;
  background: rgb(255 255 255 / 98%);
  border: 1px solid rgb(242 222 204 / 94%);
  border-radius: 16px;
  box-shadow:
    0 18px 48px rgb(92 54 24 / 14%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
  backdrop-filter: blur(18px);

  &::before {
    position: absolute;
    top: -5px;
    right: 18px;
    width: 10px;
    height: 10px;
    content: '';
    background: inherit;
    border-top: 1px solid rgb(242 222 204 / 94%);
    border-left: 1px solid rgb(242 222 204 / 94%);
    transform: rotate(45deg);
  }

  .dark & {
    background: rgb(35 27 22 / 98%);
    border-color: #4a392e;
    box-shadow: 0 18px 48px rgb(0 0 0 / 38%);

    &::before {
      border-color: #4a392e;
    }
  }
}

.menu-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 38px;
  padding: 9px 11px;
  font-size: 14px;
  font-weight: 500;
  color: #4b3d32;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;

  .dark & {
    color: #f1e7df;
  }

  &:hover {
    color: #f97316;
    background: #fff4e9;
    transform: translateX(2px);

    .dark & {
      color: #ffbd7c;
      background: rgb(249 115 22 / 12%);
    }

    svg {
      color: currentcolor;
    }
  }

  svg {
    flex-shrink: 0;
    color: #8c7b6e;
    transition: color 0.16s ease;
  }
}

.menu-divider {
  height: 1px;
  margin: 7px 6px;
  background: #f0e0d2;

  .dark & {
    background: #4a392e;
  }
}

/* Element Plus 橙色统一 */
:deep(.el-button--primary) {
  color: #fff;
  background: #ff8a26;
  border-color: #ff8a26;

  &:hover,
  &:focus {
    background: #f97a16;
    border-color: #f97a16;
  }

  &:active {
    background: #e9690a;
    border-color: #e9690a;
  }
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* 中等屏幕 */
@media (width <= 960px) {
  .chat-header {
    min-height: 68px;
    padding: 10px 16px;
  }

  .title {
    max-width: 360px;
    font-size: 18px;
  }

  .title-small {
    max-width: 420px;
  }

  .header-right {
    gap: 8px;
  }

  .knowledge-select {
    width: 220px;
  }

  .action-group {
    gap: 2px;
  }

  .doc-status-btn {
    max-width: 220px;
  }
}

/* 小屏幕 */
@media (width <= 640px) {
  .chat-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    padding: 12px;
  }

  .header-left,
  .header-right {
    width: 100%;
    margin-left: 0;
  }

  .header-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .knowledge-selector {
    width: 100%;
  }

  .knowledge-select {
    flex: 1;
    width: auto;
  }

  .title-row {
    flex-wrap: wrap;
  }

  .title,
  .title-small {
    max-width: 100%;
  }

  .action-group {
    justify-content: flex-end;
    width: 100%;
  }

  .doc-status-selector {
    width: 100%;
  }

  .doc-status-btn {
    justify-content: flex-start;
    width: 100%;
    max-width: none;
  }

  .doc-status-value {
    max-width: none;
  }

  .doc-status-menu,
  .more-menu {
    right: 0;
  }

  .doc-status-menu {
    width: 100%;
  }
}
</style>
