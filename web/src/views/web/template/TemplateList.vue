<template>
  <div class="template-list-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="keyword"
        :placeholder="t('templateList.searchPlaceholder')"
        :prefix-icon="Search"
        clearable
        size="large"
        class="search-input"
        @input="handleSearch"
      />

      <div class="category-tabs">
        <el-button
          v-for="category in categories"
          :key="category.code"
          :type="activeCategory === category.code ? 'primary' : ''"
          round
          :disabled="!category.enabled"
          @click="activeCategory = category.code"
        >
          {{ category.name }}
        </el-button>

        <el-button type="primary" @click="router.push('/web/template/create')">
          <el-icon><Plus /></el-icon>
          {{ t('templateList.createTemplate') }}
        </el-button>
      </div>
    </div>

    <!-- 模板列表 -->
    <div v-loading="loading" class="template-grid">
      <TransitionGroup name="list" tag="div" class="grid-inner">
        <div
          v-for="item in filteredTemplates"
          :key="item.id"
          class="template-card"
          :style="{ '--card-color': item.color || '#4F46E5' }"
        >
          <!-- 置顶标记 -->
          <div v-if="item.pinned" class="pin-badge">
            <el-icon :size="12"><Top /></el-icon>
            {{ t('templateList.pinned') }}
          </div>

          <div class="card-header">
            <div class="card-icon" :style="{ background: item.color || '#4F46E5' }">
              <el-icon :size="28" color="#fff">
                <component :is="item.icon || 'Document'" />
              </el-icon>
            </div>

            <div class="card-info">
              <h3 class="card-name">{{ item.templateName }}</h3>

              <div class="card-tags">
                <el-tag size="small">{{ handleName(item.category) }}</el-tag>
                <el-tag size="small" type="info">v{{ item.currentVersion }}</el-tag>
              </div>
            </div>
          </div>

          <p class="card-desc">
            {{ item.description || t('templateList.noDescription') }}
          </p>

          <div class="card-stats">
            <div class="stat-item">
              <el-icon><Edit /></el-icon>
              <span>{{ t('templateList.fieldCount', { count: item.fieldCount || 0 }) }}</span>
            </div>

            <div class="stat-item">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>

          <!-- 示范话术 -->
          <div v-if="item.sampleSpeech" class="card-speech">
            <div class="speech-label">
              <el-icon><Microphone /></el-icon>
              {{ t('templateList.voiceGuide') }}
            </div>

            <div class="speech-text">{{ item.sampleSpeech }}</div>
          </div>

          <div class="card-footer">
            <el-button type="primary" round @click="handleStartForm(item)">
              <el-icon><Microphone /></el-icon>
              {{ t('templateList.voiceFill') }}
            </el-button>

            <div class="footer-actions">
              <el-dropdown trigger="click">
                <el-button circle>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>

                <template #dropdown>
                  <el-dropdown-menu>
                    <!-- <el-dropdown-item @click="handleViewVersions(item)">
                      <el-icon><Clock /></el-icon>
                      {{ t('templateList.versionHistory') }}
                    </el-dropdown-item> -->

                    <el-dropdown-item @click="handleEditTemplate(item)">
                      <el-icon><Edit /></el-icon>
                      {{ t('templateList.editTemplate') }}
                    </el-dropdown-item>

                    <!-- <el-dropdown-item @click="handleToggleStatus(item)">
                      <el-icon><Switch /></el-icon>
                      {{ item.status === 1 ? t('templateList.disable') : t('templateList.enable') }}
                    </el-dropdown-item> -->

                    <el-dropdown-item type="danger" divided @click="handleDeleteTemplate(item)">
                      <el-icon><Delete /></el-icon>
                      {{ t('templateList.deleteTemplate') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <el-empty
        v-if="!loading && filteredTemplates.length === 0"
        :description="t('templateList.empty')"
      />
    </div>

    <!-- 版本历史弹窗 -->
    <el-dialog
      v-model="showVersionDialog"
      :title="t('templateList.versionDialog.title')"
      width="600px"
    >
      <el-timeline v-if="versionList.length > 0">
        <el-timeline-item
          v-for="versionItem in versionList"
          :key="versionItem.version"
          :timestamp="versionItem.createdAt"
          placement="top"
        >
          <el-card shadow="hover">
            <div class="version-header">
              <el-tag>v{{ versionItem.version }}</el-tag>
              <span class="version-user">{{ versionItem.createdBy }}</span>
            </div>

            <p class="version-log">{{ versionItem.changeLog }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <el-empty v-else :description="t('templateList.versionDialog.empty')" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Clock,
  Delete,
  Edit,
  Microphone,
  MoreFilled,
  Plus,
  Search,
  Top,
} from '@element-plus/icons-vue';
import type { Template } from '@/types';
import dayjs from 'dayjs';
import { useDebounceFn } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api';

const { t } = useI18n();

const router = useRouter();

const loading = ref(false);
const templates = ref<Template[]>([]);
const keyword = ref('');
const activeCategory = ref('all');
const showVersionDialog = ref(false);
const versionList = ref<any[]>([]);

const categories = ref([] as any[]);

const filteredTemplates = computed(() => {
  let list = templates.value;

  if (activeCategory.value !== 'all') {
    list = list.filter((template) => template.category === activeCategory.value);
  }

  if (keyword.value) {
    const kw = keyword.value.toLowerCase();

    list = list.filter((template) => {
      return (
        template.templateName.toLowerCase().includes(kw) ||
        (template.description && template.description.toLowerCase().includes(kw))
      );
    });
  }

  return list;
});

const handleSearch = useDebounceFn(() => {}, 300);

const handleName = (code: string) => {
  return categories.value.find((item: any) => item.code === code)?.name || code;
};

async function loadTemplates() {
  loading.value = true;

  try {
    const res = await api.voiceForm.getTemplateList();

    templates.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

function handleStartForm(item: Template) {
  router.push(`/web/form/${item.id}`);
}

// async function handleViewVersions(item: Template) {
//   const res = await api.voiceForm.getVersionList(item.id);

//   versionList.value = res.data || [];
//   showVersionDialog.value = true;
// }

function formatDate(date: string) {
  return date ? dayjs(date).format('MM-DD HH:mm') : '';
}

function handleEditTemplate(item: Template) {
  router.push(`/web/template/edit/${item.id}`);
}

// async function handleToggleStatus(item: Template) {
//   const newStatus = item.status === 1 ? 0 : 1;
//   const actionText = newStatus === 1 ? t('templateList.enable') : t('templateList.disable');

//   await ElMessageBox.confirm(
//     t('templateList.message.toggleConfirm', { action: actionText }),
//     t('templateList.message.tips'),
//   );

//   await api.voiceForm.toggleTemplateStatus(item.id, newStatus);

//   ElMessage.success(t('templateList.message.toggleSuccess', { action: actionText }));

//   loadTemplates();
// }

async function handleDeleteTemplate(item: Template) {
  await ElMessageBox.confirm(
    t('templateList.message.deleteConfirm'),
    t('templateList.message.deleteTitle'),
    {
      type: 'warning',
    },
  );

  await api.voiceForm.deleteTemplate(item.id);

  ElMessage.success(t('templateList.message.deleteSuccess'));

  loadTemplates();
}

onMounted(() => {
  api.voiceForm.getFormType().then((res) => {
    categories.value = res.data || [];
  });

  loadTemplates();
});
</script>

<style lang="scss" scoped>
.template-list-page {
  width: 100%;
  min-height: 100%;
  padding: 4px;
  margin: 0 auto;
  color: #4a382c;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 8%) 0%, transparent 30%),
    linear-gradient(180deg, #fffaf5 0%, #fff 280px);
}

/* 搜索与分类区域 */
.search-bar {
  position: sticky;
  top: 0;
  z-index: 8;
  padding: 18px 20px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at top left, rgb(255 138 38 / 10%), transparent 36%),
    radial-gradient(circle at bottom right, rgb(249 115 22 / 5%), transparent 30%),
    linear-gradient(135deg, rgb(255 255 255 / 97%), rgb(255 250 245 / 95%));
  border: 1px solid #f0dfcf;
  border-radius: 20px;
  box-shadow:
    0 14px 36px rgb(126 72 24 / 8%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  backdrop-filter: blur(10px);

  .search-input {
    margin-bottom: 16px;

    :deep(.el-input__wrapper) {
      min-height: 46px;
      background: rgb(255 255 255 / 96%);
      border-radius: 14px;
      box-shadow: 0 0 0 1px #f0dfcf inset;
      transition:
        background 0.22s ease,
        box-shadow 0.22s ease;
    }

    :deep(.el-input__wrapper:hover) {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    :deep(.el-input__wrapper.is-focus) {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 9%);
    }

    :deep(.el-input__inner) {
      font-size: 14px;
      color: #4a382c;

      &::placeholder {
        color: #b09b8c;
      }
    }

    :deep(.el-input__prefix) {
      color: #d98a49;
    }

    :deep(.el-input__clear) {
      color: #b09b8c;

      &:hover {
        color: #f97316;
      }
    }
  }

  .category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;

    :deep(.el-button) {
      height: 34px;
      padding: 0 16px;
      margin-left: 0;
      font-weight: 600;
      color: #806b5b;
      background: #fff;
      border-color: #ead8c8;
      border-radius: 999px;
      transition:
        color 0.22s ease,
        background 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        transform 0.22s ease;
    }

    :deep(.el-button:hover:not(.is-disabled)) {
      color: #f97316;
      background: #fff7ef;
      border-color: #ffc58f;
      box-shadow: 0 8px 18px rgb(249 115 22 / 10%);
      transform: translateY(-1px);
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 10px 22px rgb(249 115 22 / 22%);

      &:hover:not(.is-disabled) {
        color: #fff;
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 12px 26px rgb(249 115 22 / 28%);
      }
    }

    :deep(.el-button.is-disabled) {
      color: #c7ad99;
      background: #fff8f1;
      border-color: #f0dfcf;
      opacity: 0.7;
    }
  }
}

/* 列表区域 */
.template-grid {
  position: relative;
}

.grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 22px;
  align-items: stretch;

  @media (width <= 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* 模板卡片 */
.template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 252px;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgb(255 138 38 / 9%), transparent 36%),
    linear-gradient(180deg, rgb(255 255 255 / 99%), rgb(255 250 245 / 98%));
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 12px 32px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  transition:
    transform 0.28s ease,
    box-shadow 0.28s ease,
    border-color 0.28s ease;

  &::before {
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    content: '';
    background: linear-gradient(90deg, #ff9a3d 0%, #f97316 52%, rgb(249 115 22 / 0%) 100%);
    opacity: 0.95;
  }

  &::after {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 150px;
    height: 150px;
    pointer-events: none;
    content: '';
    background: rgb(255 138 38 / 9%);
    border: 1px solid rgb(255 138 38 / 8%);
    border-radius: 999px;
  }

  &:hover {
    border-color: #ffc58f;
    box-shadow:
      0 22px 46px rgb(249 115 22 / 14%),
      0 0 0 4px rgb(255 138 38 / 4%);
    transform: translateY(-5px);

    .card-icon {
      box-shadow:
        0 14px 26px rgb(249 115 22 / 28%),
        0 0 0 5px rgb(255 138 38 / 7%);
      transform: translateY(-1px) scale(1.03);
    }
  }

  /* 置顶 */
  .pin-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    color: #c25f05;
    background: linear-gradient(135deg, #fff7ed 0%, #fff0d7 100%);
    border: 1px solid #fed7aa;
    border-radius: 999px;
    box-shadow: 0 8px 16px rgb(245 158 11 / 14%);

    .el-icon {
      color: #f59e0b;
    }
  }

  /* 卡片头部 */
  .card-header {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 16px;
    padding-right: 72px;
    margin-bottom: 16px;

    .card-icon {
      position: relative;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 58px;
      height: 58px;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%) !important;
      border: 1px solid rgb(255 255 255 / 38%);
      border-radius: 18px;
      box-shadow:
        0 12px 22px rgb(249 115 22 / 24%),
        0 0 0 4px rgb(255 138 38 / 6%);
      transition:
        box-shadow 0.22s ease,
        transform 0.22s ease;

      &::after {
        position: absolute;
        inset: 1px;
        pointer-events: none;
        content: '';
        border: 1px solid rgb(255 255 255 / 30%);
        border-radius: 17px;
      }
    }

    .card-info {
      flex: 1;
      min-width: 0;
    }

    .card-name {
      margin: 2px 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.35;
      color: #4a382c;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      :deep(.el-tag) {
        font-weight: 600;
        border-radius: 999px;
      }

      :deep(.el-tag:not(.el-tag--info)) {
        color: #e86f0b;
        background: #fff4e9;
        border-color: #ffd3aa;
      }

      :deep(.el-tag--info) {
        color: #b85b0a;
        background: #fff7ed;
        border-color: #fed7aa;
      }
    }
  }

  /* 描述 */
  .card-desc {
    position: relative;
    z-index: 1;
    display: -webkit-box;
    min-height: 42px;
    margin: 0 0 16px;
    overflow: hidden;
    -webkit-line-clamp: 2;
    font-size: 13px;
    line-height: 1.7;
    color: #806b5b;
    -webkit-box-orient: vertical;
  }

  /* 统计信息 */
  .card-stats {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;

    .stat-item {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #806b5b;
      background: #fff7ef;
      border: 1px solid #f3e4d6;
      border-radius: 999px;

      .el-icon {
        color: #f97316;
      }
    }
  }

  /* 语音引导 */
  .card-speech {
    position: relative;
    z-index: 1;
    padding: 12px 14px;
    margin-bottom: 16px;
    background:
      radial-gradient(circle at top right, rgb(255 138 38 / 10%), transparent 38%),
      linear-gradient(135deg, #fff0e2 0%, #fff7ef 100%);
    border: 1px solid #ffd3aa;
    border-radius: 16px;

    .speech-label {
      display: flex;
      gap: 5px;
      align-items: center;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #d95f06;

      .el-icon {
        color: #f97316;
      }
    }

    .speech-text {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      font-size: 12px;
      line-height: 1.65;
      color: #6b5545;
      -webkit-box-orient: vertical;
    }
  }

  /* 卡片底部 */
  .card-footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    margin-top: auto;
    border-top: 1px dashed #ead8c8;

    > :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 10px 22px rgb(249 115 22 / 22%);
      transition:
        background 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        transform 0.22s ease;

      &:hover {
        color: #fff;
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 13px 26px rgb(249 115 22 / 28%);
        transform: translateY(-1px);
      }
    }

    .footer-actions {
      display: flex;
      gap: 8px;
      align-items: center;

      :deep(.el-button.is-circle) {
        width: 34px;
        height: 34px;
        color: #806b5b;
        background: #fff7ef;
        border: 1px solid #f0dfcf;
        box-shadow: none;
        transition:
          color 0.22s ease,
          background 0.22s ease,
          border-color 0.22s ease,
          box-shadow 0.22s ease,
          transform 0.22s ease;
      }

      :deep(.el-button.is-circle:hover) {
        color: #fff;
        background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
        border-color: #ff8a26;
        box-shadow: 0 10px 18px rgb(249 115 22 / 22%);
        transform: translateY(-1px);
      }
    }
  }
}

/* 空状态 */
:deep(.el-empty) {
  padding: 44px 0;
  margin-top: 52px;
  background:
    radial-gradient(circle at 50% 0%, rgb(255 138 38 / 6%), transparent 34%), rgb(255 250 245 / 78%);
  border: 1px dashed #e8c6a8;
  border-radius: 22px;
}

:deep(.el-empty__description p) {
  color: #a18b7b;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgb(255 250 245 / 78%);
  backdrop-filter: blur(2px);
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 版本历史弹窗 */
:deep(.el-dialog) {
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 20px;
  box-shadow:
    0 24px 70px rgb(92 54 24 / 20%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 14px;
  margin-right: 0;
  background:
    radial-gradient(circle at top right, rgb(255 138 38 / 8%), transparent 32%),
    linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-bottom: 1px solid #f3e4d6;
}

:deep(.el-dialog__title) {
  font-weight: 800;
  color: #4a382c;
}

:deep(.el-dialog__headerbtn) {
  top: 13px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #fff0e2;
    transform: rotate(90deg);

    .el-dialog__close {
      color: #f97316;
    }
  }
}

:deep(.el-dialog__body) {
  padding: 22px 24px 26px;
}

/* 时间线 */
:deep(.el-timeline) {
  padding: 8px 0 0 8px;
}

:deep(.el-timeline-item__tail) {
  border-left-color: #f0d4bb;
}

:deep(.el-timeline-item__node) {
  background: #ff8a26;
  box-shadow: 0 0 0 4px rgb(255 138 38 / 10%);
}

:deep(.el-timeline-item__timestamp) {
  color: #a18b7b;
}

:deep(.el-timeline .el-card) {
  border: 1px solid #f0dfcf;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 10px 22px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }
}

:deep(.el-timeline .el-card__body) {
  padding: 14px 16px;
}

:deep(.el-timeline .el-tag) {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
  border-radius: 7px;
}

.version-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;

  .version-user {
    font-size: 13px;
    font-weight: 600;
    color: #8d7868;
  }
}

.version-log {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: #6b5545;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.38s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* 移动端 */
@media (width <= 768px) {
  .template-list-page {
    padding: 0;
  }

  .search-bar {
    position: static;
    padding: 16px;
    border-radius: 18px;

    .category-tabs {
      gap: 8px;

      :deep(.el-button) {
        height: 32px;
        padding: 0 12px;
      }
    }
  }

  .template-card {
    padding: 20px;
    border-radius: 20px;

    .card-header {
      padding-right: 0;

      .card-name {
        white-space: normal;
      }
    }

    .pin-badge {
      position: static;
      width: fit-content;
      margin-bottom: 12px;
    }
  }
}

@media (width <= 480px) {
  .search-bar {
    padding: 14px;

    .category-tabs {
      :deep(.el-button) {
        flex: 1;
        min-width: 100px;
      }
    }
  }

  .template-card {
    padding: 18px;

    .card-header {
      gap: 12px;

      .card-icon {
        width: 52px;
        height: 52px;
        border-radius: 15px;
      }

      .card-name {
        font-size: 16px;
      }
    }

    .card-footer {
      gap: 10px;

      > :deep(.el-button--primary) {
        flex: 1;
      }
    }
  }
}
</style>
