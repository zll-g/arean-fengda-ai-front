<template>
  <div
    class="message-bubble"
    :class="[
      `role-${message.role}`,
      {
        'is-streaming': message.isStreaming,
        'is-end': !message.isEnd && message.role !== 'USER',
        'is-error': message.isError,
        compact: compact,
      },
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 头像 -->
    <div class="avatar">
      <div class="avatar-inner" :class="message.role">
        <Bot v-if="message.role === 'ASSISTANT'" :size="20" />
        <User v-else :size="20" />
      </div>
    </div>

    <!-- 消息内容区域 -->
    <div class="message-content-wrapper">
      <!-- 角色名称 -->
      <div class="message-header">
        <span class="role-name">
          {{
            message.role === 'ASSISTANT' ? t('messageBubble.aiAssistant') : t('messageBubble.you')
          }}
        </span>

        <span v-if="showTimestamp" class="timestamp">
          {{ formattedTime }}
        </span>
      </div>

      <!-- 消息主体 -->
      <div class="message-body">
        <!-- 错误状态 -->
        <div v-if="message.isError" class="error-content">
          <AlertCircle :size="18" />
          <span>{{ message.errorMessage || t('messageBubble.sendFailed') }}</span>

          <button class="retry-btn" @click="$emit('retry')">
            <RefreshCw :size="14" />
            {{ t('messageBubble.retry') }}
          </button>
        </div>

        <!-- 正常内容 -->
        <template v-else>
          <!-- 文本内容 - 使用 markstream-vue -->
          <div v-if="message.content" class="text-content markstream-vue">
            <MarkdownRender
              v-if="message.role !== 'USER'"
              :content="message.content"
              :custom-html-tags="['think']"
              custom-id="playground-demo"
              :escape-html-tags="['question', 'answer']"
              @copy="textCopy"
            />

            <div v-else style="white-space: pre-wrap">
              {{ message.content }}
            </div>
          </div>

          <!-- 推荐选项 -->
          <div v-if="message.reference && JSON.parse(message.reference).length" class="suggestions">
            <button
              v-for="suggestion in JSON.parse(message.reference)"
              :key="suggestion.id"
              class="suggestion-btn"
              @click="handlePreviewFile(suggestion)"
            >
              <Zap :size="14" />
              {{ suggestion.documentName }}
              <Download :size="16" @click.stop="handleDownloadDocument(suggestion)" />
            </button>
          </div>

          <!-- 图片展示 -->
          <div v-if="message.imageList?.length" class="images-grid">
            <div
              v-for="(image, index) in message.imageList"
              :key="image.id || image.url"
              class="image-item"
              @click="openImagePreview(Number(index))"
            >
              <img :src="image.url" :alt="image.originalName" loading="lazy" />

              <div class="image-overlay">
                <Maximize2 :size="18" />
              </div>
            </div>
          </div>

          <!-- 图片放大预览 -->
          <ElImageViewer
            v-if="previewVisible"
            :url-list="previewUrlList"
            :initial-index="previewIndex"
            :hide-on-click-modal="true"
            teleported
            @close="previewVisible = false"
          />

          <!-- 单个视频 -->
          <!-- <div v-if="message.content.videos?.length === 1" class="single-video">
            <video
              :src="message.content.videos[0].url"
              :poster="message.content.videos[0].poster"
              controls
              preload="metadata"
            />
          </div> -->

          <!-- 多个视频 -->
          <!-- <div
            v-if="message.content.videos && message.content.videos.length > 1"
            class="videos-grid"
          >
            <div
              v-for="video in message.content.videos"
              :key="video.id"
              class="video-item"
              @click="$emit('play-video', video)"
            >
              <img :src="video.poster" :alt="video.title" />
              <div class="video-overlay">
                <Play :size="32" />
              </div>
              <span v-if="video.duration" class="video-duration">
                {{ formatDuration(video.duration) }}
              </span>
            </div>
          </div> -->

          <!-- 附件列表 -->
          <div v-if="message.fileList?.length" class="files-list">
            <div
              v-for="file in message.fileList"
              :key="file.id"
              class="file-item"
              @click="handlePreviewFile(file)"
            >
              <div class="file-icon">
                {{ getFileEmoji(file.mimeType) }}
              </div>
              <div class="file-info">
                <span class="file-name">{{ file.originalName }}</span>
                <span class="file-size">{{ formatSize(file.size) }}</span>
              </div>
              <button
                class="download-btn"
                @click.stop="handleDownload(file.originalName, file.savedFileName)"
              >
                <Download :size="16" />
              </button>
            </div>
          </div>
        </template>

        <!-- 加载动画 -->
        <div v-if="message.isStreaming && !message.content" class="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>

      <!-- 操作栏 -->
      <MessageActions
        v-if="message.role === 'ASSISTANT' && !message.isStreaming && !message.isError"
        :content="message.content || ''"
        :feedback="message.feedback"
        :show-regenerate="true"
        :is-hovered="isHovered"
        :is-break="message.isBreak"
        @copy="handleCopy"
        @like="handleLike"
        @dislike="handleDislike"
        @regenerate="$emit('regenerate')"
      />

      <FilePreviewDialog ref="filePreviewDialogRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
// 正确导入 markstream-vue
import { MarkdownRender, setCustomComponents } from 'markstream-vue';
import FilePreviewDialog from '@/components/filePreviewDialog/index.vue';
import { AlertCircle, Bot, Download, Maximize2, RefreshCw, User, Zap } from '@/components/icons';
import MessageActions from './MessageActions.vue';
import { formatFileSize, formatTimestamp, getFileIcon } from '@/utils/helpers';
import type { Attachment, Message, Suggestion, VideoInfo } from '@/types/chat';
import ThinkingNode from './components/ThinkingNode.vue';
import EChartsContainerNode from './components/EChartsContainerNode.vue';
import { ElImageViewer, ElMessage } from 'element-plus';
import api from '@/api/index.ts';
const filePreviewDialogRef = ref();
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    message: Message;
    showTimestamp?: boolean;
    compact?: boolean;
  }>(),
  {
    showTimestamp: true,
    compact: false,
  },
);

const { copy } = useClipboard({ legacy: true });

const emit = defineEmits<{
  retry: [];
  regenerate: [];
  copy: [];
  like: [];
  dislike: [];
  'select-suggestion': [suggestion: Suggestion];
  'preview-image': [image: Attachment, index: number];
  'play-video': [video: VideoInfo];
  'download-file': [file: Attachment];
}>();

const isHovered = ref(false);
const previewVisible = ref(false);
const previewIndex = ref(0);

const previewUrlList = computed(() => {
  return props.message.imageList?.map((item: any) => item.url) || [];
});

function openImagePreview(index: number) {
  previewIndex.value = index;
  previewVisible.value = true;
}

const formattedTime = computed(() => {
  return formatTimestamp(props.message.createdAt);
});

function textCopy(data: any) {
  if (typeof data === 'string') {
    copy(data);
  }
}

function handleCopy() {
  emit('copy');
}

function handleLike() {
  emit('like');
}

function handleDislike() {
  emit('dislike');
}

const handlePreviewFile = async (row: any) => {
  console.log(row, 9998);
  try {
    // 知识库引用文件
    if (row.documentId) {
      const { data } = await api.base.getDocumentFileName(row.documentId);

      filePreviewDialogRef.value?.open({
        id: row.id || row.documentId,
        fileUrl: `/oss/downloadByFileName?fileName=${encodeURIComponent(data)}`,
        fileOriginalName: row.documentName || row.fileOriginalName || data,
        fileName: data,
        fileSuffix: getSuffixByName(row.documentName || data),
        fileType: row.fileType || '',
      });

      return;
    }

    // 聊天上传附件
    if (row.savedFileName) {
      filePreviewDialogRef.value?.open({
        id: row.id || row.savedFileName,
        fileUrl: `/oss/downloadByBucketFileName?bucketName=temp&fileName=${encodeURIComponent(
          row.savedFileName,
        )}`,
        fileOriginalName: row.originalName || row.fileOriginalName || row.savedFileName,
        fileName: row.savedFileName,
        fileSuffix: getSuffixByName(row.originalName || row.savedFileName),
        fileType: row.mimeType || row.fileType || '',
      });

      return;
    }

    // 文件列表接口返回的数据
    filePreviewDialogRef.value?.open(row);
  } catch (error) {
    console.error('文件预览失败：', error);
    ElMessage.error('文件预览失败');
  }
};

const getSuffixByName = (fileName = '') => {
  const list = fileName.split('.');
  return list.length > 1 ? list[list.length - 1] : '';
};

async function handleDownloadDocument(row: any) {
  try {
    const { data } = await api.base.getDocumentFileName(row.documentId);
    const res = await fetch(`/oss/downloadByFileName?fileName=${encodeURIComponent(data)}`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error('下载失败');
    }

    const blob = await res.blob();
    const fileName = row.fileOriginalName || row.fileName || '下载文件';

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success('下载成功');
  } catch (error) {
    console.error('下载失败：', error);
  }
}

async function handleDownload(fileName: string, SaveName: string) {
  try {
    const res = await fetch(`/oss/downloadByBucketFileName?bucketName=temp&fileName=${SaveName}`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error('下载失败');
    }

    const blob = await res.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = fileName;
    a.click();

    window.URL.revokeObjectURL(blobUrl);

    ElMessage.success('下载成功');
  } catch (error) {
    console.error('下载失败：', error);
  }
}

function getFileEmoji(mimeType?: string) {
  return getFileIcon(mimeType || '');
}

function formatSize(size?: number) {
  return size ? formatFileSize(size) : '';
}

setCustomComponents('playground-demo', {
  think: ThinkingNode,
  vmr_container: EChartsContainerNode,
});
</script>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  gap: 14px;
  padding: 18px 24px;
  color: #3f332a;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: rgb(255 138 38 / 3%);
  }

  &.role-USER {
    flex-direction: row-reverse;

    .message-content-wrapper {
      align-items: flex-end;
      max-width: min(720px, 78%);
    }

    .message-header {
      flex-direction: row-reverse;
    }

    .message-body {
      width: fit-content;
      max-width: 100%;
      padding: 12px 14px;
      color: #4a3424;
      background: #fff3e8;
      border: 1px solid #ffd8b5;
      border-radius: 18px;
      box-shadow: 0 6px 16px rgb(249 115 22 / 7%);

      .dark & {
        color: #fff3e8;
        background: rgb(249 115 22 / 14%);
        border-color: rgb(255 138 38 / 24%);
        box-shadow: none;
      }
    }

    .text-content {
      max-width: 100%;

      :deep(a) {
        color: #ea6b0b;
      }

      :deep(code:not(pre code)) {
        color: #5c3519;
        background: rgb(249 115 22 / 10%);
      }
    }

    .images-grid,
    .files-list {
      max-width: 100%;
    }
  }

  &.role-ASSISTANT {
    .message-body {
      padding: 14px 16px;
      color: #3f332a;
      background: #fff;
      border: 1px solid #f0dfcf;
      border-radius: 18px;
      box-shadow:
        0 1px 2px rgb(126 72 24 / 4%),
        0 8px 20px rgb(126 72 24 / 3%);

      .dark & {
        color: #f4e9e0;
        background: #2e241e;
        border-color: #49382e;
        box-shadow: none;
      }
    }
  }

  &.compact {
    padding: 12px 20px;

    .avatar-inner {
      width: 30px;
      height: 30px;
      border-radius: 9px;

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  &.is-end {
    .message-body {
      position: relative;

      &::after {
        position: absolute;
        right: -14px;
        bottom: 10px;
        width: 6px;
        height: 6px;
        content: '';
        background: #ff8a26;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgb(255 138 38 / 12%);
        animation: pulse 1.4s infinite;
      }
    }
  }

  &.is-error {
    .message-body {
      width: 100%;
    }
  }

  .dark & {
    color: #f4e9e0;

    &:hover {
      background: rgb(249 115 22 / 5%);
    }
  }
}

.avatar {
  flex-shrink: 0;
  padding-top: 2px;
}

.avatar-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &.ASSISTANT {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    box-shadow:
      0 6px 14px rgb(249 115 22 / 20%),
      0 0 0 3px rgb(255 138 38 / 6%);
  }

  &.USER {
    color: #d86208;
    background: #fff4e9;
    border: 1px solid #ffd7b0;
  }

  .message-bubble:hover & {
    transform: translateY(-1px);
  }

  .dark &.ASSISTANT {
    box-shadow:
      0 6px 14px rgb(0 0 0 / 20%),
      0 0 0 3px rgb(255 138 38 / 7%);
  }

  .dark &.USER {
    color: #ffb36b;
    background: rgb(249 115 22 / 12%);
    border-color: rgb(255 138 38 / 20%);
  }
}

.message-content-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: min(1000px, calc(100% - 52px));
}

.message-header {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 20px;
}

.role-name {
  font-size: 13px;
  font-weight: 600;
  color: #4a382c;

  .dark & {
    color: #f5e9df;
  }
}

.timestamp {
  font-size: 12px;
  color: #b09a89;

  .dark & {
    color: #8f7969;
  }
}

.message-body {
  max-width: 100%;
  line-height: 1.75;
  overflow-wrap: break-word;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  .dark & {
    color: #f0e6de;
  }
}

.text-content {
  font-size: 15px;

  :deep(p) {
    margin: 0 0 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 22px;
    margin: 10px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(code:not(pre code)) {
    padding: 2px 6px;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 0.9em;
    color: #b95008;
    background: #fff1e5;
    border: 1px solid #ffe0c2;
    border-radius: 6px;

    .dark & {
      color: #ffc38a;
      background: rgb(249 115 22 / 12%);
      border-color: rgb(255 138 38 / 16%);
    }
  }

  :deep(pre) {
    max-width: 100%;
    margin: 14px 0;
    overflow: auto;
    background: #1f1712;
    border: 1px solid #3c2d24;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgb(61 34 18 / 12%);
  }

  :deep(pre code) {
    display: block;
    min-width: 0;
    padding: 14px 16px;
    overflow-x: auto;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    line-height: 1.65;
    color: #f4e8df;
    white-space: pre;
    background: transparent;
  }

  :deep(a) {
    font-weight: 500;
    color: #f97316;
    text-decoration: none;
    text-underline-offset: 3px;

    &:hover {
      color: #e86408;
      text-decoration: underline;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 14px 0;
    overflow: hidden;
    border-spacing: 0;
    border-collapse: separate;
    border: 1px solid #f0ddcb;
    border-radius: 10px;

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      border-right: 1px solid #f0ddcb;
      border-bottom: 1px solid #f0ddcb;

      &:last-child {
        border-right: none;
      }
    }

    tr:last-child td {
      border-bottom: none;
    }

    th {
      font-weight: 600;
      color: #4a382c;
      background: #fff6ed;
    }

    tbody tr {
      transition: background 0.18s ease;

      &:hover {
        background: #fffaf5;
      }
    }

    .dark & {
      border-color: #4a382e;

      th,
      td {
        border-color: #4a382e;
      }

      th {
        color: #f4e9e0;
        background: #382b24;
      }

      tbody tr:hover {
        background: rgb(249 115 22 / 6%);
      }
    }
  }

  :deep(blockquote) {
    padding: 10px 14px;
    margin: 14px 0;
    color: #765e4c;
    background: #fff7ef;
    border-left: 3px solid #ff9a3d;
    border-radius: 8px;

    p {
      margin: 0;
    }

    .dark & {
      color: #d5c3b5;
      background: rgb(249 115 22 / 8%);
      border-left-color: #ff8a26;
    }
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 18px 0 10px;
    font-weight: 650;
    line-height: 1.35;
    color: inherit;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h1) {
    font-size: 1.45em;
  }

  :deep(h2) {
    font-size: 1.28em;
  }

  :deep(h3) {
    font-size: 1.15em;
  }

  :deep(h4) {
    font-size: 1em;
  }

  :deep(hr) {
    height: 1px;
    margin: 20px 0;
    background: #f0ddcb;
    border: none;

    .dark & {
      background: #4a382e;
    }
  }
}

.error-content {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  font-size: 14px;
  color: #b42318;
  background: #fff4f3;
  border: 1px solid #ffd7d3;
  border-radius: 12px;

  .retry-btn {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 6px 12px;
    margin-left: auto;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    background: #ef4444;
    border: none;
    border-radius: 999px;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover {
      background: #dc2626;
      box-shadow: 0 6px 14px rgb(239 68 68 / 20%);
      transform: translateY(-1px);
    }

    &:active {
      box-shadow: none;
      transform: translateY(0);
    }
  }

  .dark & {
    color: #fecaca;
    background: rgb(239 68 68 / 10%);
    border-color: rgb(239 68 68 / 25%);
  }
}

/* 推荐引用 */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.suggestion-btn {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  max-width: 100%;
  padding: 8px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #6f4b32;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0ddcb;
  border-radius: 999px;
  box-shadow: 0 3px 10px rgb(126 72 24 / 4%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  svg {
    flex-shrink: 0;
    color: #ff8a26;
  }

  &:hover {
    color: #d95f06;
    background: #fff4e9;
    border-color: #ffc58f;
    box-shadow: 0 6px 16px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  .dark & {
    color: #eaded5;
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      color: #ffbd7c;
      background: rgb(249 115 22 / 12%);
      border-color: rgb(255 138 38 / 32%);
    }
  }
}

/* 图片展示 */
.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  margin-top: 10px;
}

.image-item {
  position: relative;
  flex: 0 0 auto;
  width: 132px;
  height: 132px;
  overflow: hidden;
  cursor: zoom-in;
  background: #fff5eb;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 5px 14px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }

  .image-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgb(103 52 16 / 38%);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover {
    border-color: #ffbd7c;
    box-shadow: 0 8px 20px rgb(249 115 22 / 12%);
    transform: translateY(-1px);

    img {
      transform: scale(1.04);
    }

    .image-overlay {
      opacity: 1;
    }
  }

  .dark & {
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      border-color: rgb(255 138 38 / 32%);
    }
  }
}

.single-video {
  margin-top: 12px;

  video {
    width: 100%;
    max-width: 520px;
    overflow: hidden;
    background: #000;
    border: 1px solid #f0ddcb;
    border-radius: 14px;
    box-shadow: 0 8px 20px rgb(126 72 24 / 8%);
  }
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.video-item {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  cursor: pointer;
  background: #fff5eb;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 5px 14px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgb(103 52 16 / 28%);
    transition: background 0.2s ease;
  }

  .video-duration {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 2px 8px;
    font-size: 12px;
    color: #fff;
    background: rgb(65 34 15 / 75%);
    border-radius: 999px;
  }

  &:hover {
    border-color: #ffbd7c;
    box-shadow: 0 8px 20px rgb(249 115 22 / 12%);
    transform: translateY(-1px);

    .video-overlay {
      background: rgb(103 52 16 / 46%);
    }
  }
}

/* 文件展示 */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, 100%);
  margin-top: 10px;
}

.file-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0ddcb;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgb(126 72 24 / 4%);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff8f1;
    border-color: #ffc58f;
    box-shadow: 0 7px 18px rgb(249 115 22 / 9%);
    transform: translateY(-1px);

    .file-icon {
      background: #ffead7;
      transform: scale(1.03);
    }
  }

  .dark & {
    background: #30251f;
    border-color: #4a382e;
    box-shadow: none;

    &:hover {
      background: #382b24;
      border-color: rgb(255 138 38 / 30%);
    }
  }
}

.file-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 20px;
  background: #fff4e9;
  border: 1px solid #ffe0c2;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  .dark & {
    background: rgb(249 115 22 / 10%);
    border-color: rgb(255 138 38 / 14%);
  }
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: #4a382c;
  white-space: nowrap;

  .dark & {
    color: #f4e9e0;
  }
}

.file-size {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.3;
  color: #aa9585;

  .dark & {
    color: #8f7969;
  }
}

.download-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: #a16d48;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #f97316;
    background: #ffead7;
    box-shadow: 0 4px 10px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }

  &:active {
    box-shadow: none;
    transform: translateY(0);
  }

  .dark & {
    color: #c9b4a5;

    &:hover {
      color: #ffb36b;
      background: rgb(249 115 22 / 12%);
      box-shadow: none;
    }
  }
}

/* 加载动画 */
.loading-dots {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 6px 0;

  span {
    width: 7px;
    height: 7px;
    background: #ff8a26;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgb(255 138 38 / 8%);
    animation: loading-dot 1.2s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.24s;
    }

    &:nth-child(2) {
      animation-delay: -0.12s;
    }
  }
}

@media (width <= 768px) {
  .message-bubble {
    gap: 10px;
    padding: 14px 12px;

    &.role-USER {
      .message-content-wrapper {
        max-width: calc(100% - 44px);
      }

      .message-body {
        max-width: 100%;
      }
    }
  }

  .message-content-wrapper {
    max-width: calc(100% - 44px);
  }

  .image-item {
    width: 108px;
    height: 108px;
    border-radius: 12px;
  }

  .files-list {
    width: min(320px, 100%);
  }
}

@keyframes loading-dot {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: scale(0.75);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
}
</style>
