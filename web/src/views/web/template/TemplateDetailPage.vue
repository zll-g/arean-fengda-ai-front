<template>
  <div v-loading="loading" class="template-detail-page">
    <div class="detail-header">
      <el-button text @click="router.back()">
        <el-icon>
          <ArrowLeft />
        </el-icon>
        {{ t('templateDetail.back') }}
      </el-button>

      <div class="header-actions">
        <el-button @click="router.push(`/web/template/edit/${templateId}`)">
          <el-icon>
            <Edit />
          </el-icon>
          {{ t('templateDetail.edit') }}
        </el-button>

        <el-button type="primary" @click="router.push(`/web/form/${templateId}`)">
          <el-icon>
            <Microphone />
          </el-icon>
          {{ t('templateDetail.voiceFill') }}
        </el-button>
      </div>
    </div>

    <div v-if="detail" class="detail-card">
      <div class="card-top">
        <div class="card-icon" :style="{ background: detail.color }">
          <el-icon :size="32" color="#fff">
            <component :is="detail.icon || 'Document'" />
          </el-icon>
        </div>

        <div>
          <h2>{{ detail.templateName }}</h2>

          <div class="meta-row">
            <el-tag>{{ detail.category }}</el-tag>
            <el-tag type="info">v{{ detail.currentVersion }}</el-tag>

            <el-tag :type="detail.status === 1 ? 'success' : 'danger'">
              {{ detail.status === 1 ? t('templateDetail.enabled') : t('templateDetail.disabled') }}
            </el-tag>

            <span class="meta-code">{{ detail.templateCode }}</span>
          </div>
        </div>
      </div>

      <p class="detail-desc">
        {{ detail.description || t('templateDetail.noDescription') }}
      </p>

      <div v-if="detail.sampleSpeech" class="speech-box">
        <el-icon>
          <Microphone />
        </el-icon>
        <span>{{ detail.sampleSpeech }}</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane :label="t('templateDetail.tab.fields')" name="fields">
        <el-table :data="detail?.fields || []" stripe border>
          <el-table-column :label="t('templateDetail.field.index')" type="index" width="50" />

          <el-table-column
            :label="t('templateDetail.field.fieldCode')"
            prop="fieldCode"
            width="150"
          >
            <template #default="{ row }">
              <code>{{ row.fieldCode }}</code>
            </template>
          </el-table-column>

          <el-table-column
            :label="t('templateDetail.field.fieldName')"
            prop="fieldName"
            width="130"
          />

          <el-table-column :label="t('templateDetail.field.type')" prop="fieldType" width="90">
            <template #default="{ row }">
              <el-tag size="small">{{ row.fieldType }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column :label="t('templateDetail.field.required')" width="70">
            <template #default="{ row }">
              <el-icon v-if="row.required === 1" color="#10b981">
                <CircleCheckFilled />
              </el-icon>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column :label="t('templateDetail.field.sensitive')" width="70">
            <template #default="{ row }">
              <el-icon v-if="row.sensitive === 1" color="#f59e0b">
                <Lock />
              </el-icon>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column :label="t('templateDetail.field.unit')" prop="unit" width="70" />

          <el-table-column
            :label="t('templateDetail.field.voiceAlias')"
            prop="voiceAlias"
            min-width="150"
            show-overflow-tooltip
          />

          <el-table-column
            :label="t('templateDetail.field.masterData')"
            prop="masterDataCode"
            width="120"
          />

          <el-table-column
            :label="t('templateDetail.field.wizardStep')"
            prop="wizardStep"
            width="100"
          />
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('templateDetail.tab.rules')" name="rules">
        <el-table :data="detail?.rules || []" stripe border>
          <el-table-column
            :label="t('templateDetail.rule.ruleName')"
            prop="ruleName"
            min-width="150"
          />

          <el-table-column :label="t('templateDetail.rule.type')" prop="ruleType" width="120">
            <template #default="{ row }">
              <el-tag :type="row.ruleType === 'calculation' ? 'success' : 'warning'" size="small">
                {{ getRuleTypeLabel(row.ruleType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            :label="t('templateDetail.rule.triggerField')"
            prop="triggerField"
            width="120"
          />

          <el-table-column :label="t('templateDetail.rule.condition')" width="180">
            <template #default="{ row }">
              {{ JSON.stringify(row.triggerCondition) }}
            </template>
          </el-table-column>

          <el-table-column
            :label="t('templateDetail.rule.targetField')"
            prop="targetField"
            width="120"
          />

          <el-table-column :label="t('templateDetail.rule.action')" min-width="180">
            <template #default="{ row }">
              {{ JSON.stringify(row.action) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('templateDetail.tab.versions')" name="versions">
        <el-timeline>
          <el-timeline-item
            v-for="versionItem in versions"
            :key="versionItem.version"
            :timestamp="versionItem.createdAt"
            placement="top"
          >
            <el-card shadow="hover">
              <div style="display: flex; gap: 12px; align-items: center">
                <el-tag>v{{ versionItem.version }}</el-tag>

                <span style="color: #6b7280">
                  {{ versionItem.changeLog }}
                </span>

                <span style="margin-left: auto; font-size: 12px; color: #9ca3af">
                  {{ versionItem.createdBy }}
                </span>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <el-empty v-if="versions.length === 0" :description="t('templateDetail.version.empty')" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import type { TemplateDetail } from '@/types';
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowLeft, CircleCheckFilled, Edit, Lock, Microphone } from '@element-plus/icons-vue';
import api from '@/api';

const { t } = useI18n();

const router = useRouter();
const route = useRoute();

const templateId = computed(() => Number(route.params.id));
const loading = ref(false);
const activeTab = ref('fields');
const detail = ref<TemplateDetail | null>(null);
const versions = ref<any[]>([]);

const getRuleTypeLabel = (ruleType: string) => {
  if (ruleType === 'calculation') {
    return t('templateDetail.rule.calculation');
  }

  if (ruleType === 'visibility') {
    return t('templateDetail.rule.visibility');
  }

  return ruleType;
};

onMounted(async () => {
  loading.value = true;

  try {
    const res = await api.form.getTemplateDetail(templateId.value);
    detail.value = res.data;

    const versionRes = await api.voiceForm.getVersionList(templateId.value);
    versions.value = versionRes.data || [];
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.template-detail-page {
  width: 100%;
  max-width: 1100px;
  min-height: 100%;
  padding: 4px;
  margin: 0 auto;
  color: #4a382c;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, #fffaf5 0%, #fff 260px);
}

/* 顶部操作栏 */
.detail-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 20px;
  background: rgb(255 255 255 / 97%);
  border: 1px solid #f0dfcf;
  border-radius: 14px;
  box-shadow:
    0 7px 20px rgb(126 72 24 / 6%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;

    :deep(.el-button:not(.el-button--primary)) {
      color: #806b5b;
      background: #fff;
      border-color: #ead8c8;

      &:hover {
        color: #f97316;
        background: #fff7ef;
        border-color: #ffc58f;
        box-shadow: 0 6px 14px rgb(249 115 22 / 8%);
        transform: translateY(-1px);
      }
    }

    :deep(.el-button--primary) {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-color: #ff8a26;
      box-shadow: 0 7px 16px rgb(249 115 22 / 20%);

      &:hover:not(.is-disabled) {
        background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
        border-color: #f97316;
        box-shadow: 0 9px 20px rgb(249 115 22 / 26%);
        transform: translateY(-1px);
      }

      &:active:not(.is-disabled) {
        box-shadow: 0 4px 12px rgb(249 115 22 / 16%);
        transform: translateY(0);
      }
    }
  }

  :deep(.el-button) {
    min-height: 38px;
    padding: 0 16px;
    font-weight: 600;
    border-radius: 10px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  :deep(.el-button.is-text) {
    color: #806b5b;

    &:hover {
      color: #f97316;
      background: #fff0e2;
      transform: translateX(-1px);
    }
  }
}

/* 模板详情卡片 */
.detail-card {
  position: relative;
  padding: 24px;
  margin-bottom: 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 32%),
    rgb(255 255 255 / 98%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 10px 28px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;

  &::before {
    position: absolute;
    top: 0;
    right: 24px;
    left: 24px;
    height: 2px;
    content: '';
    background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
  }
}

/* 详情顶部 */
.card-top {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;

  .card-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border: 1px solid rgb(255 255 255 / 40%);
    border-radius: 16px;
    box-shadow:
      0 10px 22px rgb(249 115 22 / 18%),
      0 0 0 5px rgb(255 138 38 / 6%);
  }

  > div:last-child {
    min-width: 0;
  }

  h2 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 20px;
    font-weight: 700;
    color: #4a382c;
    white-space: nowrap;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 8px;

    .meta-code {
      padding: 3px 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 600;
      color: #b85b0a;
      background: #fff7ef;
      border: 1px solid #ffd8b5;
      border-radius: 6px;
    }
  }
}

/* 标签 */
:deep(.detail-card .el-tag) {
  font-weight: 600;
  border-radius: 7px;
}

:deep(.detail-card .el-tag:not(.el-tag--success, .el-tag--danger, .el-tag--info)) {
  color: #e86f0b;
  background: #fff4e9;
  border-color: #ffd3aa;
}

:deep(.detail-card .el-tag--info) {
  color: #b85b0a;
  background: #fff7ed;
  border-color: #fed7aa;
}

:deep(.detail-card .el-tag--success) {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

:deep(.detail-card .el-tag--danger) {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

/* 描述 */
.detail-desc {
  padding: 12px 14px;
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.7;
  color: #806b5b;
  background: #fffaf5;
  border: 1px solid #f3e4d6;
  border-radius: 10px;
}

/* 示例语音 */
.speech-box {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #d95f06;
  background: linear-gradient(135deg, #fff0e2 0%, #fff7ef 100%);
  border: 1px solid #ffd3aa;
  border-radius: 10px;

  .el-icon {
    flex-shrink: 0;
    color: #f97316;
  }
}

/* Tabs */
.detail-tabs {
  padding: 0 24px 24px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 10px 28px rgb(126 72 24 / 6%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;

  :deep(.el-tabs__header) {
    padding-top: 16px;
    margin-bottom: 18px;
  }

  :deep(.el-table .el-icon) {
    font-size: 16px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: #f0dfcf;
  }

  /* 表格 */

  :deep(.el-table) {
    overflow: hidden;
    color: #5b4738;
    background: #fff;
    border-radius: 12px;
  }

  :deep(.el-table th.el-table__cell) {
    height: 48px;
    font-weight: 700;
    color: #806b5b;
    background: linear-gradient(180deg, #fff7ef 0%, #fffaf5 100%);
    border-color: #f0dfcf;
  }

  :deep(.el-table td.el-table__cell) {
    height: 48px;
    border-color: #f3e4d6;
  }

  :deep(.el-table--border .el-table__cell) {
    border-right-color: #f0dfcf;
  }

  :deep(.el-table__row) {
    transition: background 0.18s ease;
  }

  :deep(.el-table__row:hover > td.el-table__cell) {
    background: #fffaf5;
  }

  :deep(.el-table__body tr.el-table__row--striped td.el-table__cell) {
    background: #fffdf9;
  }

  :deep(.el-table__body tr.el-table__row--striped:hover td.el-table__cell) {
    background: #fff7ef;
  }

  :deep(.el-table__inner-wrapper::before) {
    background: #f0dfcf;
  }

  :deep(.el-table__border-left-patch) {
    background: #fff7ef;
  }

  /* 字段类型标签 */

  :deep(.el-table .el-tag) {
    font-weight: 600;
    border-radius: 7px;
  }

  :deep(.el-table .el-tag:not(.el-tag--success, .el-tag--warning)) {
    color: #e86f0b;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  :deep(.el-table .el-tag--success) {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  :deep(.el-table .el-tag--warning) {
    color: #d97706;
    background: #fff7ed;
    border-color: #fed7aa;
  }

  :deep(.el-tabs__item) {
    font-weight: 600;
    color: #8d7868;
    transition: color 0.2s ease;

    &:hover {
      color: #f97316;
    }

    &.is-active {
      color: #e86f0b;
    }
  }

  :deep(.el-tabs__active-bar) {
    height: 3px;
    background: linear-gradient(90deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 999px;
  }
}

/* 字段代码 */
code {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: #c45c08;
  white-space: nowrap;
  background: #fff1e5;
  border: 1px solid #ffd8b5;
  border-radius: 6px;
}

/* 版本时间线 */
:deep(.el-timeline) {
  padding: 10px 0 0 8px;
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
  border-radius: 12px;
  box-shadow: 0 5px 16px rgb(126 72 24 / 5%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: #ffc58f;
    box-shadow: 0 9px 20px rgb(249 115 22 / 9%);
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

/* 空状态 */
:deep(.el-empty) {
  padding: 36px 0;
}

:deep(.el-empty__description p) {
  color: #a18b7b;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgb(255 250 245 / 78%);
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 滚动条 */
:deep(.el-scrollbar__thumb) {
  background: #e7b889;

  &:hover {
    background: #d99a5d;
  }
}

/* 响应式 */
@media (width <=768px) {
  .template-detail-page {
    padding: 0;
  }

  .detail-header {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;

    .header-actions {
      width: 100%;

      :deep(.el-button) {
        flex: 1;
      }
    }
  }

  .detail-card {
    padding: 18px;
    border-radius: 14px;
  }

  .card-top {
    align-items: flex-start;

    .card-icon {
      width: 54px;
      height: 54px;
      border-radius: 14px;
    }

    h2 {
      font-size: 18px;
    }

    .meta-row {
      gap: 6px;
    }
  }

  .detail-tabs {
    padding: 0 14px 16px;
    border-radius: 14px;
  }

  :deep(.el-tabs__content) {
    overflow-x: auto;
  }
}

@media (width <=480px) {
  .detail-header {
    .header-actions {
      flex-direction: column;

      :deep(.el-button) {
        width: 100%;
        margin-left: 0;
      }
    }
  }

  .card-top {
    flex-direction: column;

    .card-icon {
      width: 52px;
      height: 52px;
    }
  }

  .detail-desc {
    padding: 10px 12px;
  }

  .speech-box {
    align-items: flex-start;
  }
}
</style>
