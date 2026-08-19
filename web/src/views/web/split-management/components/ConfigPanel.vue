<template>
  <div class="config-panel">
    <!-- ==================== 当前生效配置 ==================== -->
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="card-header">
          <el-icon>
            <View />
          </el-icon>
          <span>{{ t('splitManagement.effectiveTitle') }}</span>
          <span v-if="savedButPending" class="pending-tag">
            {{ t('splitManagement.savedButPending') }}
          </span>
        </div>
      </template>

      <div v-if="effectiveConfig" class="effective-list">
        <div v-for="field in configFields" :key="field.key" class="effective-item">
          <span class="effective-label">{{ t(field.labelKey) }}</span>
          <div class="effective-value-box">
            <span class="effective-value">{{ displayValue(field.key) }}</span>
            <el-tag :type="sourceTagType(sourceOf(field.key))" size="small" effect="plain" round>
              {{ sourceLabel(sourceOf(field.key)) }}
            </el-tag>
          </div>
        </div>
      </div>
      <el-skeleton v-else :rows="5" animated />
    </el-card>

    <!-- ==================== 试参表单 ==================== -->
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="card-header">
          <el-icon>
            <MagicStick />
          </el-icon>
          <span>{{ t('splitManagement.trialTitle') }}</span>
        </div>
      </template>

      <div class="trial-tip">{{ t('splitManagement.trialTip') }}</div>

      <el-form label-position="top" size="default" class="trial-form">
        <!-- 分片策略 -->
        <div class="field-row">
          <div class="field-label">
            <span>{{ t('splitManagement.strategy') }}</span>
            <el-checkbox v-model="overrideFlags.strategy" class="override-check">
              {{ t('splitManagement.override') }}
            </el-checkbox>
          </div>
          <el-select
            v-model="trialForm.strategy"
            :disabled="!overrideFlags.strategy"
            class="full-width"
          >
            <el-option
              v-for="opt in strategyOptions"
              :key="opt.value"
              style="height: 43px"
              :label="opt.label"
              :value="opt.value"
            >
              <div class="strategy-option">
                <span class="strategy-name">{{ opt.label }}</span>
                <span class="strategy-desc">{{ opt.desc }}</span>
              </div>
            </el-option>
          </el-select>
        </div>

        <!-- 切块尺寸 / 重叠尺寸 -->
        <div class="field-pair">
          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.chunkSize') }}</span>
              <el-checkbox v-model="overrideFlags.chunkSize" class="override-check">
                {{ t('splitManagement.override') }}
              </el-checkbox>
            </div>
            <el-input-number
              v-model="trialForm.chunkSize"
              :disabled="!overrideFlags.chunkSize"
              :min="50"
              :max="100000"
              :step="64"
              class="full-width"
            />
          </div>

          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.chunkOverlap') }}</span>
              <el-checkbox v-model="overrideFlags.chunkOverlap" class="override-check">
                {{ t('splitManagement.override') }}
              </el-checkbox>
            </div>
            <el-input-number
              v-model="trialForm.chunkOverlap"
              :disabled="!overrideFlags.chunkOverlap"
              :min="0"
              :max="100000"
              :step="16"
              class="full-width"
            />
          </div>
        </div>

        <!-- 尺寸单位 -->
        <div class="field-row">
          <div class="field-label">
            <span>{{ t('splitManagement.sizeUnit') }}</span>
            <el-checkbox v-model="overrideFlags.sizeUnit" class="override-check">
              {{ t('splitManagement.override') }}
            </el-checkbox>
          </div>
          <el-radio-group v-model="trialForm.sizeUnit" :disabled="!overrideFlags.sizeUnit">
            <el-radio-button value="char">{{ t('splitManagement.sizeUnitChar') }}</el-radio-button>
            <el-radio-button value="token">
              {{ t('splitManagement.sizeUnitToken') }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 表格拆分 -->
        <div class="field-pair">
          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.tableRowSplitEnabled') }}</span>
              <el-checkbox v-model="overrideFlags.tableRowSplitEnabled" class="override-check">
                {{ t('splitManagement.override') }}
              </el-checkbox>
            </div>
            <el-switch
              v-model="trialForm.tableRowSplitEnabled"
              :disabled="!overrideFlags.tableRowSplitEnabled"
            />
          </div>

          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.tableRowBatchSize') }}</span>
              <el-checkbox v-model="overrideFlags.tableRowBatchSize" class="override-check">
                {{ t('splitManagement.override') }}
              </el-checkbox>
            </div>
            <el-input-number
              v-model="trialForm.tableRowBatchSize"
              :disabled="!overrideFlags.tableRowBatchSize || !trialForm.tableRowSplitEnabled"
              :min="1"
              :max="200"
              class="full-width"
            />
          </div>
        </div>
      </el-form>

      <!-- ==================== 操作按钮 ==================== -->
      <div class="action-group">
        <el-button type="primary" plain :loading="previewLoading" @click="handlePreview">
          {{ t('splitManagement.preview') }}
        </el-button>

        <div class="compare-toggle">
          <span>{{ t('splitManagement.compareMode') }}</span>
          <el-switch v-model="compareMode" />
        </div>
      </div>

      <!-- ==================== A/B 对比:配置 B ==================== -->
      <template v-if="compareMode">
        <el-divider content-position="left">{{ t('splitManagement.configB') }}</el-divider>
        <el-form label-position="top" size="default" class="trial-form">
          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.strategy') }}</span>
            </div>
            <el-select v-model="configB.strategy" class="full-width">
              <el-option
                v-for="opt in strategyOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>

          <div class="field-pair">
            <div class="field-row">
              <div class="field-label">
                <span>{{ t('splitManagement.chunkSize') }}</span>
              </div>
              <el-input-number
                v-model="configB.chunkSize"
                :min="50"
                :max="100000"
                :step="64"
                class="full-width"
              />
            </div>
            <div class="field-row">
              <div class="field-label">
                <span>{{ t('splitManagement.chunkOverlap') }}</span>
              </div>
              <el-input-number
                v-model="configB.chunkOverlap"
                :min="0"
                :max="100000"
                :step="16"
                class="full-width"
              />
            </div>
          </div>

          <div class="field-row">
            <div class="field-label">
              <span>{{ t('splitManagement.sizeUnit') }}</span>
            </div>
            <el-radio-group v-model="configB.sizeUnit">
              <el-radio-button value="char">
                {{ t('splitManagement.sizeUnitChar') }}
              </el-radio-button>
              <el-radio-button value="token">
                {{ t('splitManagement.sizeUnitToken') }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <div class="field-pair">
            <div class="field-row">
              <div class="field-label">
                <span>{{ t('splitManagement.tableRowSplitEnabled') }}</span>
              </div>
              <el-switch v-model="configB.tableRowSplitEnabled" />
            </div>
            <div class="field-row">
              <div class="field-label">
                <span>{{ t('splitManagement.tableRowBatchSize') }}</span>
              </div>
              <el-input-number
                v-model="configB.tableRowBatchSize"
                :disabled="!configB.tableRowSplitEnabled"
                :min="1"
                :max="200"
                class="full-width"
              />
            </div>
          </div>
        </el-form>

        <el-button
          type="primary"
          plain
          class="compare-btn"
          :loading="compareLoading"
          @click="handleCompare"
        >
          {{ t('splitManagement.compare') }}
        </el-button>
      </template>

      <el-divider />

      <!-- ==================== 落库操作 ==================== -->
      <div class="persist-group">
        <el-button :loading="saving" @click="handleSave">
          {{ t('splitManagement.saveConfig') }}
        </el-button>
        <el-button type="danger" :loading="resplitting" @click="handleResplit">
          {{ t('splitManagement.resplit') }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MagicStick, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { EffectiveSplitConfig, SplitConfigDto } from '@/api/modules/split';

const props = defineProps<{
  effectiveConfig: EffectiveSplitConfig | null;
  previewLoading?: boolean;
  compareLoading?: boolean;
  saving?: boolean;
  resplitting?: boolean;
  /** 已保存但尚未重切生效(保存配置后提示) */
  savedButPending?: boolean;
}>();

const emit = defineEmits<{
  preview: [trial: SplitConfigDto];
  compare: [configA: SplitConfigDto, configB: SplitConfigDto];
  save: [merged: SplitConfigDto];
  resplit: [merged: SplitConfigDto];
}>();

const { t } = useI18n();

/**
 * 覆盖语义(与后端 SplitConfigDto 空值约定严格对齐):
 * 勾选「自定义」的字段 → 以表单值作为文档级覆盖提交;
 * 未勾选 → 提交 null = 清除文档级覆盖,回退 知识库级 > 全局默认。
 */
const overrideFlags = reactive({
  strategy: false,
  chunkSize: false,
  chunkOverlap: false,
  sizeUnit: false,
  tableRowSplitEnabled: false,
  tableRowBatchSize: false,
});

const trialForm = reactive<Required<Omit<SplitConfigDto, 'strategy'>> & { strategy: string }>({
  strategy: 'recursive',
  chunkSize: 512,
  chunkOverlap: 64,
  sizeUnit: 'char',
  tableRowSplitEnabled: true,
  tableRowBatchSize: 10,
});

const compareMode = ref(false);
const configB = reactive({
  strategy: 'recursive',
  chunkSize: 512,
  chunkOverlap: 64,
  sizeUnit: 'char',
  tableRowSplitEnabled: true,
  tableRowBatchSize: 10,
});

const strategyOptions = computed(() => {
  const names = ['custom', 'recursive', 'paragraph', 'sentence', 'semantic', 'fixed'] as const;

  return names.map((name) => ({
    value: name,
    label: t(`splitManagement.strategyName.${name}`),
    desc: t(`splitManagement.strategyDesc.${name}`),
  }));
});

const configFields = [
  { key: 'strategy', labelKey: 'splitManagement.strategy' },
  { key: 'chunkSize', labelKey: 'splitManagement.chunkSize' },
  { key: 'chunkOverlap', labelKey: 'splitManagement.chunkOverlap' },
  { key: 'sizeUnit', labelKey: 'splitManagement.sizeUnit' },
  { key: 'tableRowSplitEnabled', labelKey: 'splitManagement.tableRowSplitEnabled' },
  { key: 'tableRowBatchSize', labelKey: 'splitManagement.tableRowBatchSize' },
] as const;

/** 生效配置变化时回填表单(策略名直接可读;数值单位走 strategyName 映射) */
const displayValue = (key: string) => {
  const effective = props.effectiveConfig?.effective as any;

  if (!effective) return '-';

  const value = effective[key];

  if (value === null || value === undefined) return '-';
  if (key === 'strategy') {
    return strategyOptions.value.find((o) => o.value === value)?.label || value;
  }
  if (key === 'sizeUnit') {
    return value === 'token'
      ? t('splitManagement.sizeUnitToken')
      : t('splitManagement.sizeUnitChar');
  }
  if (key === 'tableRowSplitEnabled') {
    return value ? '✓' : '✕';
  }

  return String(value);
};

const sourceOf = (key: string) => {
  return props.effectiveConfig?.sources?.[key] || 'default';
};

const sourceLabel = (source: string) => {
  if (source === 'document') return t('splitManagement.sourceDocument');
  if (source === 'knowledge_base') return t('splitManagement.sourceKnowledgeBase');

  return t('splitManagement.sourceDefault');
};

const sourceTagType = (source: string) => {
  if (source === 'document') return 'primary';
  if (source === 'knowledge_base') return 'warning';

  return 'info';
};

/** 依据生效配置+文档级原值回填表单与覆盖开关(documentOverride 非 null 字段 => 打开覆盖) */
const refillFromEffective = () => {
  const cfg = props.effectiveConfig;

  if (!cfg) return;

  const effective = cfg.effective || {};
  const override = cfg.documentOverride || {};

  (Object.keys(overrideFlags) as Array<keyof typeof overrideFlags>).forEach((key) => {
    const overrideValue = (override as any)[key];
    const overridden = overrideValue !== null && overrideValue !== undefined;

    overrideFlags[key] = overridden;

    const next = overridden ? overrideValue : (effective as any)[key];

    if (next !== null && next !== undefined) {
      (trialForm as any)[key] = next;
      (configB as any)[key] = next;
    }
  });
};

watch(() => props.effectiveConfig, refillFromEffective, { immediate: true, deep: true });

/** 汇总试参提交体:勾选覆盖的字段传表单值,未勾选传 null(=清除覆盖/跟随上级) */
const buildTrialPayload = (): SplitConfigDto => {
  return {
    strategy: overrideFlags.strategy ? trialForm.strategy : null,
    chunkSize: overrideFlags.chunkSize ? trialForm.chunkSize : null,
    chunkOverlap: overrideFlags.chunkOverlap ? trialForm.chunkOverlap : null,
    sizeUnit: overrideFlags.sizeUnit ? trialForm.sizeUnit : null,
    tableRowSplitEnabled: overrideFlags.tableRowSplitEnabled
      ? trialForm.tableRowSplitEnabled
      : null,
    tableRowBatchSize: overrideFlags.tableRowBatchSize ? trialForm.tableRowBatchSize : null,
  };
};

/** 校验 overlap < chunkSize(与生效值合并后的最终口径比较) */
const validateTrial = (): boolean => {
  const payload = buildTrialPayload();
  const mergedSize = payload.chunkSize ?? props.effectiveConfig?.effective?.chunkSize ?? null;
  const mergedOverlap =
    payload.chunkOverlap ?? props.effectiveConfig?.effective?.chunkOverlap ?? null;

  if (mergedSize !== null && mergedOverlap !== null && mergedOverlap >= mergedSize) {
    ElMessage.error(t('splitManagement.overlapTooLarge'));
    return false;
  }

  return true;
};

const handlePreview = () => {
  if (!validateTrial()) return;

  emit('preview', buildTrialPayload());
};

const handleCompare = () => {
  if (!validateTrial()) return;

  emit('compare', buildTrialPayload(), { ...configB });
};

const handleSave = () => {
  if (!validateTrial()) return;

  emit('save', buildTrialPayload());
};

const handleResplit = async () => {
  if (!validateTrial()) return;

  try {
    await ElMessageBox.confirm(
      t('splitManagement.resplitConfirmContent'),
      t('splitManagement.resplitConfirmTitle'),
      {
        confirmButtonText: t('knowledgeBase.message.confirm'),
        cancelButtonText: t('knowledgeBase.message.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  emit('resplit', buildTrialPayload());
};
</script>

<style scoped lang="scss">
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;

  /* 工作台定高后,配置面板自身占满栏高,内容超出时内部滚动 */
  height: 100%;
  min-height: 0;
  padding-bottom: 2px;
  overflow: hidden auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
}

.panel-card {
  border: 1px solid #f0dfcf;
  border-radius: 14px;

  :deep(.el-card__header) {
    padding: 12px 16px;
    background: #fff7ef;
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }
}

.card-header {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #4a382c;

  .el-icon {
    color: #f97316;
  }
}

.pending-tag {
  padding: 2px 8px;
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: #c25f05;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
}

.effective-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.effective-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  background: #fffaf5;
  border: 1px solid #f3e7da;
  border-radius: 9px;

  .effective-label {
    font-size: 13px;
    color: #806b5b;
  }

  .effective-value-box {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .effective-value {
    font-size: 13px;
    font-weight: 600;
    color: #4a382c;
  }
}

.trial-tip {
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #92400e;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid rgb(245 158 11 / 22%);
  border-radius: 9px;
}

.trial-form {
  .field-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field-row {
    margin-bottom: 14px;
  }

  .field-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #6b5545;

    .override-check {
      height: auto;
      margin-right: 0;
      font-size: 11px;
      font-weight: 400;

      :deep(.el-checkbox__label) {
        font-size: 11px;
        color: #a18b7b;
      }
    }
  }

  .full-width {
    width: 100%;
  }
}

.strategy-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  line-height: 1.4;

  .strategy-name {
    font-size: 13px;
    font-weight: 600;
    color: #4a382c;
  }

  .strategy-desc {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
    color: #a18b7b;
    white-space: nowrap;
  }

  :deep(&) {
    height: auto;
  }
}

:deep(.el-select-dropdown__item) {
  height: auto;
  min-height: 34px;
  padding: 6px 12px;
}

.action-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;

  .compare-toggle {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: #806b5b;
  }
}

.compare-btn {
  width: 100%;
  margin-top: 4px;
}

.persist-group {
  display: flex;
  gap: 10px;

  .el-button {
    flex: 1;
    margin-left: 0;
  }
}
</style>
