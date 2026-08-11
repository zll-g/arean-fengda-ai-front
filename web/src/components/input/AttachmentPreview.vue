<template>
  <div class="attachment-preview">
    <TransitionGroup name="attachment">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="attachment-item"
        :class="attachment.type"
      >
        <!-- 图片预览 -->
        <template v-if="attachment.type === 'image'">
          <img :src="attachment.url" :alt="attachment.name" class="preview-image" />
        </template>

        <!-- 视频预览 -->
        <template v-else-if="attachment.type === 'video'">
          <div class="preview-video">
            <img v-if="attachment.thumbnail" :src="attachment.thumbnail" :alt="attachment.name" />
            <div v-else class="video-placeholder">
              <Video :size="24" />
            </div>
            <div class="video-badge">
              <Play :size="12" />
            </div>
          </div>
        </template>

        <!-- 文件预览 -->
        <template v-else>
          <div class="preview-file">
            <span class="file-emoji">{{ getFileEmoji(attachment.mimeType) }}</span>
            <div class="file-details">
              <span class="file-name">{{ truncateName(attachment.name) }}</span>
              <span class="file-size">{{ formatSize(attachment.size) }}</span>
            </div>
          </div>
        </template>

        <!-- 删除按钮 -->
        <button class="remove-btn" @click="$emit('remove', attachment)">
          <X :size="14" />
        </button>

        <!-- 上传进度 -->
        <div v-if="attachment.uploading" class="upload-progress">
          <div class="progress-bar" :style="{ width: `${attachment.progress || 0}%` }" />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { Play, Video, X } from '@/components/icons';
import { formatFileSize, getFileIcon, truncateText } from '@/utils/helpers';

interface AttachmentWithProgress {
  id: string;
  name: string;
  type: 'image' | 'file' | 'video';
  url: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  uploading?: boolean;
  progress?: number;
}

defineProps<{
  attachments: AttachmentWithProgress[];
}>();

defineEmits<{
  remove: [attachment: object];
}>();

function getFileEmoji(mimeType?: string) {
  return getFileIcon(mimeType || '');
}

function formatSize(size?: number) {
  return size ? formatFileSize(size) : '';
}

function truncateName(name: string) {
  return truncateText(name, 20);
}
</script>

<style lang="scss" scoped>
.attachment-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;

  .dark & {
    border-bottom-color: #374151;
  }
}

.attachment-item {
  position: relative;
  overflow: hidden;
  background: #f3f4f6;
  border-radius: 12px;

  .dark & {
    background: #374151;
  }

  &.image,
  &.video {
    width: 80px;
    height: 80px;
  }

  &.file {
    padding: 10px 40px 10px 12px;
  }
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-video {
  position: relative;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #9ca3af;
    background: #e5e7eb;

    .dark & {
      background: #4b5563;
    }
  }

  .video-badge {
    position: absolute;
    bottom: 6px;
    left: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: white;
    background: rgb(0 0 0 / 70%);
    border-radius: 50%;
  }
}

.preview-file {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-emoji {
  font-size: 24px;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;

  .dark & {
    color: #e5e7eb;
  }
}

.file-size {
  font-size: 11px;
  color: #9ca3af;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: white;
  cursor: pointer;
  background: rgb(0 0 0 / 60%);
  border: none;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s ease;

  .attachment-item:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgb(239 68 68 / 90%);
  }
}

.upload-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgb(0 0 0 / 20%);

  .progress-bar {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }
}

// 过渡动画
.attachment-enter-active,
.attachment-leave-active {
  transition: all 0.3s ease;
}

.attachment-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.attachment-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
