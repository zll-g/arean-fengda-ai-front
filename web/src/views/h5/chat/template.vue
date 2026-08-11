<template>
  <van-nav-bar title="表单模板" left-text="返回" left-arrow @click-left="onClickLeft" />
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

            <!-- <div class="footer-actions">
              <el-dropdown trigger="click">
                <el-button circle>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>

                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleToggleStatus(item)">
                      <el-icon><Switch /></el-icon>
                      {{ item.status === 1 ? t('templateList.disable') : t('templateList.enable') }}
                    </el-dropdown-item>

                    <el-dropdown-item type="danger" divided @click="handleDeleteTemplate(item)">
                      <el-icon><Delete /></el-icon>
                      {{ t('templateList.deleteTemplate') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div> -->
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
import { Clock, Edit, Microphone, Search, Top } from '@element-plus/icons-vue';
import type { Template } from '@/types';
import dayjs from 'dayjs';
import { useDebounceFn } from '@vueuse/core';
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

const onClickLeft = () => {
  router.back();
};

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
  router.push(`/h5/form/${item.id}`);
}

function formatDate(date: string) {
  return date ? dayjs(date).format('MM-DD HH:mm') : '';
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

// async function handleDeleteTemplate(item: Template) {
//   await ElMessageBox.confirm(
//     t('templateList.message.deleteConfirm'),
//     t('templateList.message.deleteTitle'),
//     {
//       type: 'warning',
//     },
//   );

//   await api.voiceForm.deleteTemplate(item.id);

//   ElMessage.success(t('templateList.message.deleteSuccess'));

//   loadTemplates();
// }

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
  color: #1f2937;
}

/* 搜索与分类区域 */
.search-bar {
  position: sticky;
  top: 0;
  z-index: 8;
  padding: 18px 20px;
  margin-bottom: 24px;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 96%), rgb(248 250 252 / 92%)),
    radial-gradient(circle at top left, rgb(79 70 229 / 8%), transparent 36%);
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 20px;
  box-shadow: 0 14px 36px rgb(15 23 42 / 6%);
  backdrop-filter: blur(10px);

  .search-input {
    margin-bottom: 16px;

    :deep(.el-input__wrapper) {
      min-height: 46px;
      background: rgb(255 255 255 / 95%);
      border-radius: 14px;
      box-shadow: 0 0 0 1px rgb(226 232 240 / 95%);
      transition: all 0.25s ease;
    }

    :deep(.el-input__wrapper:hover) {
      box-shadow: 0 0 0 1px rgb(99 102 241 / 32%);
    }

    :deep(.el-input__wrapper.is-focus) {
      box-shadow:
        0 0 0 1px rgb(79 70 229 / 75%),
        0 10px 24px rgb(79 70 229 / 12%);
    }

    :deep(.el-input__inner) {
      font-size: 14px;
      color: #111827;
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
      font-weight: 600;
      background: #fff;
      border-color: #e5e7eb;
      border-radius: 999px;
      transition: all 0.22s ease;
    }

    :deep(.el-button:hover) {
      box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
      transform: translateY(-1px);
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
      border: none;
      box-shadow: 0 10px 22px rgb(79 70 229 / 22%);
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

  @media (width <= 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

/* 卡片 */
.template-card {
  position: relative;
  min-height: 252px;
  padding: 24px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 98%), rgb(248 250 252 / 98%)),
    radial-gradient(
      circle at top right,
      color-mix(in srgb, var(--card-color) 16%, transparent),
      transparent 36%
    );
  border: 1px solid rgb(226 232 240 / 86%);
  border-radius: 22px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 6%);
  transition:
    transform 0.28s ease,
    box-shadow 0.28s ease,
    border-color 0.28s ease;

  &::before {
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    content: '';
    background: linear-gradient(90deg, var(--card-color), rgb(255 255 255 / 0%));
    opacity: 0.9;
  }

  &::after {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 150px;
    height: 150px;
    pointer-events: none;
    content: '';
    background: color-mix(in srgb, var(--card-color) 10%, transparent);
    border-radius: 999px;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--card-color) 34%, #e5e7eb);
    box-shadow: 0 22px 46px rgb(15 23 42 / 11%);
    transform: translateY(-5px);
  }

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
    color: #b45309;
    background: linear-gradient(135deg, #fff7ed, #fef3c7);
    border: 1px solid rgb(245 158 11 / 22%);
    border-radius: 999px;
    box-shadow: 0 8px 16px rgb(245 158 11 / 14%);
  }

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
      border-radius: 18px;
      box-shadow:
        0 12px 22px color-mix(in srgb, var(--card-color) 26%, transparent),
        inset 0 1px 0 rgb(255 255 255 / 26%);

      &::after {
        position: absolute;
        inset: 1px;
        content: '';
        border: 1px solid rgb(255 255 255 / 28%);
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
      color: #0f172a;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      :deep(.el-tag) {
        font-weight: 600;
        border: none;
        border-radius: 999px;
      }
    }
  }

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
    color: #64748b;
    -webkit-box-orient: vertical;
  }

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
      color: #64748b;
      background: #f8fafc;
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px #edf2f7;

      .el-icon {
        color: var(--card-color);
      }
    }
  }

  .card-speech {
    position: relative;
    z-index: 1;
    padding: 12px 14px;
    margin-bottom: 16px;
    background:
      linear-gradient(135deg, rgb(240 253 244 / 98%), rgb(236 253 245 / 86%)),
      radial-gradient(circle at top right, rgb(34 197 94 / 12%), transparent 38%);
    border: 1px solid rgb(34 197 94 / 14%);
    border-radius: 16px;

    .speech-label {
      display: flex;
      gap: 5px;
      align-items: center;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #16a34a;
    }

    .speech-text {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      font-size: 12px;
      line-height: 1.65;
      color: #475569;
      -webkit-box-orient: vertical;
    }
  }

  .card-footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    margin-top: auto;
    border-top: 1px dashed #e5e7eb;

    .footer-actions {
      display: flex;
      gap: 8px;
      align-items: center;

      :deep(.el-button.is-circle) {
        width: 34px;
        height: 34px;
        color: #475569;
        background: #f8fafc;
        border: none;
        box-shadow: inset 0 0 0 1px #e5e7eb;
        transition: all 0.22s ease;
      }

      :deep(.el-button.is-circle:hover) {
        color: #fff;
        background: var(--card-color);
        box-shadow: 0 10px 18px color-mix(in srgb, var(--card-color) 22%, transparent);
        transform: translateY(-1px);
      }
    }

    :deep(.el-button:hover) {
      box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
      transform: translateY(-1px);
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
      border: none;
      box-shadow: 0 10px 22px rgb(79 70 229 / 22%);
    }
  }
}

/* 空状态 */
:deep(.el-empty) {
  padding: 44px 0;
  margin-top: 52px;
  background: rgb(248 250 252 / 72%);
  border: 1px dashed #dbe3ef;
  border-radius: 22px;
}

/* 下拉菜单细节 */
:deep(.el-dropdown-menu) {
  padding: 8px;
  border-radius: 14px;
}

:deep(.el-dropdown-menu__item) {
  font-weight: 600;
  border-radius: 10px;
}

/* 版本历史弹窗 */
:deep(.el-dialog) {
  overflow: hidden;
  border-radius: 20px;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 14px;
  margin-right: 0;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.el-dialog__title) {
  font-weight: 800;
  color: #0f172a;
}

:deep(.el-dialog__body) {
  padding: 22px 24px 26px;
}

.version-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;

  .version-user {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
}

.version-log {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: #475569;
}

/* 列表过渡动画 */
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

/* 移动端优化 */
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
</style>
