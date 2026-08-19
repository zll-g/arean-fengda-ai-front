<template>
  <div class="split-page">
    <!-- ==================== 页面头 ==================== -->
    <header class="page-header">
      <el-button class="back-btn" text @click="goBack">
        <el-icon>
          <ArrowLeft />
        </el-icon>
        {{ t('splitManagement.back') }}
      </el-button>

      <div class="header-title">
        <h2>{{ t('splitManagement.pageTitle') }}</h2>
        <span class="doc-name" :title="documentName">
          {{ t('splitManagement.document') }}: {{ documentName || `#${documentId}` }}
        </span>
      </div>

      <div v-if="effectiveConfig" class="header-meta">
        <el-tag :type="statusTagType(effectiveConfig.documentStatus)" size="small" round>
          {{ statusLabel(effectiveConfig.documentStatus) }}
        </el-tag>
        <el-tag size="small" effect="plain" round>
          {{ effectiveConfig.segmentCount ?? 0 }} {{ t('splitManagement.segmentUnit') }}
        </el-tag>
        <el-tag v-if="rebuilding" type="warning" size="small" effect="dark" round>
          {{ t('splitManagement.rebuilding') }}
        </el-tag>
      </div>
    </header>

    <!-- ==================== 上部:配置 + 预览 ==================== -->
    <div class="workbench">
      <ConfigPanel
        :effective-config="effectiveConfig"
        :preview-loading="previewLoading"
        :compare-loading="compareLoading"
        :saving="saving"
        :resplitting="rebuilding"
        :saved-but-pending="savedButPending"
        @preview="handlePreview"
        @compare="handleCompare"
        @save="handleSave"
        @resplit="handleResplit"
      />

      <PreviewPane
        :mode="previewMode"
        :preview="previewResult"
        :compare-result="compareResult"
        :loading="previewLoading || compareLoading"
      />
    </div>

    <!-- ==================== 下部:线上分片 ==================== -->
    <el-card shadow="never" class="online-card">
      <template #header>
        <div class="card-header">
          <el-icon>
            <Files />
          </el-icon>
          <span>{{ t('splitManagement.onlineTitle') }}</span>

          <!-- 全文质量统计 chips -->
          <div v-if="chunkStats" class="stats-chips">
            <span class="stat-chip">{{ t('splitManagement.totalChunks') }} {{ chunkStats.totalChunks }}</span>
            <span class="stat-chip">{{ t('splitManagement.avgChars') }} {{ chunkStats.avgChars }}</span>
            <span class="stat-chip warn-chip" :class="{ active: chunkStats.overSizeCount > 0 }">
              {{ t('splitManagement.overSizeCount') }} {{ chunkStats.overSizeCount }}
            </span>
            <span class="stat-chip warn-chip" :class="{ active: chunkStats.tinyCount > 0 }">
              {{ t('splitManagement.tinyCount') }} {{ chunkStats.tinyCount }}
            </span>
            <span class="stat-chip">{{ t('splitManagement.tableChunkCount') }} {{ chunkStats.tableChunkCount }}</span>
            <span class="stat-chip warn-chip" :class="{ active: chunkStats.disabledCount > 0 }">
              {{ t('splitManagement.disabledCount') }} {{ chunkStats.disabledCount }}
            </span>
            <span class="stat-chip">
              {{ t('splitManagement.headingCoverage') }}
              {{ Math.round((chunkStats.headingCoverage || 0) * 100) }}%
            </span>
            <span class="stat-chip scope">{{ t('splitManagement.statsOfPage') }}</span>
          </div>

          <div class="online-header-actions">
            <!-- 批量合并条 -->
            <template v-if="selectedChunks.length > 0">
              <span class="selected-tip">
                {{ t('splitManagement.selectedCount', { n: selectedChunks.length }) }}
              </span>
              <el-button type="primary" size="small" plain @click="handleMergeSelected">
                {{ t('splitManagement.mergeSelected') }}
              </el-button>
            </template>

            <el-button text size="small" :icon="Refresh" @click="fetchChunks(chunkPage)" />
          </div>
        </div>
      </template>

      <el-table
        v-loading="chunksLoading"
        :data="chunks"
        style="width: 100%"
        row-key="chunkId"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" reserve-selection />

        <el-table-column type="expand">
          <template #default="scope">
            <div class="chunk-expand">
              <div class="expand-row">
                <span class="expand-label">ID</span>
                <span class="expand-value mono">{{ scope.row.chunkId }}</span>
                <el-button text size="small" type="primary" @click="copyChunkId(scope.row.chunkId)">
                  {{ t('splitManagement.copyId') }}
                </el-button>
              </div>
              <div v-if="scope.row.contextPrefix" class="expand-row">
                <span class="expand-label">{{ t('splitManagement.sectionHeading') }}</span>
                <span class="expand-value">{{ scope.row.contextPrefix }}</span>
              </div>
              <div class="expand-row">
                <span class="expand-label">Text</span>
                <span class="expand-value full-text">{{ scope.row.text }}</span>
              </div>
              <div
                v-if="scope.row.metadata && Object.keys(scope.row.metadata).length"
                class="expand-row"
              >
                <span class="expand-label">{{ t('splitManagement.metadata') }}</span>
                <div class="metadata-list">
                  <span v-for="(v, k) in scope.row.metadata" :key="k" class="metadata-item">
                    {{ k }}={{ v }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="'#'" width="80" align="center">
          <template #default="scope">
            <span class="seg-index">{{ scope.row.segmentIndex }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="'Text'" min-width="320">
          <template #default="scope">
            <div class="chunk-summary">{{ scope.row.text }}</div>
          </template>
        </el-table-column>

        <el-table-column :label="t('splitManagement.avgChars')" width="120" align="center">
          <template #default="scope">
            <span class="metric">{{ scope.row.charCount }}</span>
            <span class="metric-sub"> / {{ scope.row.tokenEstimate }} tok</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('splitManagement.sectionHeading')" min-width="140">
          <template #default="scope">
            <span class="section-text" :title="scope.row.sectionHeading || ''">
              {{ scope.row.sectionHeading || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="t('splitManagement.contentType')" width="96" align="center">
          <template #default="scope">
            <el-tag
              :type="scope.row.contentType === 'table' ? 'warning' : 'info'"
              size="small"
              effect="plain"
              round
            >
              {{ scope.row.contentType || 'text' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column :label="t('splitManagement.enable')" width="90" align="center">
          <template #default="scope">
            <el-switch
              :model-value="scope.row.isApply === '1'"
              :loading="applySwitchingId === scope.row.chunkId"
              @change="(val: boolean | string | number) => handleApplyToggle(scope.row, !!val)"
            />
          </template>
        </el-table-column>

        <el-table-column
          :label="t('knowledgeBase.table.action')"
          width="180"
          align="center"
          fixed="right"
        >
          <template #default="scope">
            <div class="row-actions">
              <el-button text type="primary" size="small" @click="openEditDialog(scope.row)">
                {{ t('splitManagement.editAction') }}
              </el-button>
              <el-button text type="warning" size="small" @click="openSplitDialog(scope.row)">
                {{ t('splitManagement.splitAction') }}
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteChunk(scope.row)">
                {{ t('splitManagement.deleteAction') }}
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty :description="t('splitManagement.emptyChunks')" :image-size="70" />
        </template>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="chunkPage"
          v-model:page-size="chunkSize"
          :total="chunkTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          small
          @current-change="fetchChunks"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- ==================== 编辑分片弹窗 ==================== -->
    <el-dialog
      v-model="editDialog.visible"
      :title="t('splitManagement.editTitle')"
      width="720px"
      destroy-on-close
    >
      <div class="dialog-tip">{{ t('splitManagement.editTip') }}</div>
      <el-input
        v-model="editDialog.text"
        type="textarea"
        :rows="14"
        maxlength="60000"
        show-word-limit
      />
      <template #footer>
        <el-button @click="editDialog.visible = false">
          {{ t('knowledgeBase.message.cancel') }}
        </el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="submitEditChunk">
          {{ t('knowledgeBase.message.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 二次切分弹窗 ==================== -->
    <el-dialog
      v-model="splitDialog.visible"
      :title="t('splitManagement.splitTitle')"
      width="560px"
      destroy-on-close
    >
      <el-radio-group v-model="splitDialog.mode">
        <el-radio value="target">{{ t('splitManagement.splitByTarget') }}</el-radio>
        <el-radio value="points">{{ t('splitManagement.splitByPoints') }}</el-radio>
      </el-radio-group>

      <div class="split-form">
        <template v-if="splitDialog.mode === 'target'">
          <div class="field-label">{{ t('splitManagement.targetSize') }}</div>
          <el-input-number
            v-model="splitDialog.targetSize"
            :min="20"
            :max="60000"
            :step="50"
            style="width: 220px"
          />
        </template>

        <template v-else>
          <div class="field-label">{{ t('splitManagement.splitPoints') }}</div>
          <el-input
            v-model="splitDialog.pointsText"
            :placeholder="'200, 450'"
            style="width: 100%"
          />
          <div class="field-tip">{{ t('splitManagement.splitPointsTip') }}</div>
        </template>
      </div>

      <template #footer>
        <el-button @click="splitDialog.visible = false">
          {{ t('knowledgeBase.message.cancel') }}
        </el-button>
        <el-button type="primary" :loading="splitDialog.saving" @click="submitSplitChunk">
          {{ t('knowledgeBase.message.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Files, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';
import ConfigPanel from './components/ConfigPanel.vue';
import PreviewPane from './components/PreviewPane.vue';
import type {
  ChunkListResult,
  DocumentChunkVO,
  EffectiveSplitConfig,
  SplitCompareResult,
  SplitConfigDto,
  SplitPreviewVO,
  SplitStatsVO,
} from '@/api/modules/split';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const documentId = String(route.params.documentId || '');
const documentName = String(route.query.name || '');

// ==================== 状态 ====================
const effectiveConfig = ref<EffectiveSplitConfig | null>(null);
const previewMode = ref<'idle' | 'single' | 'compare'>('idle');
const previewResult = ref<SplitPreviewVO | null>(null);
const compareResult = ref<SplitCompareResult | null>(null);
const previewLoading = ref(false);
const compareLoading = ref(false);
const saving = ref(false);
const savedButPending = ref(false);
const rebuilding = ref(false);

const chunks = ref<DocumentChunkVO[]>([]);
const chunkStats = ref<SplitStatsVO | null>(null);
const chunkTotal = ref(0);
const chunkPage = ref(1);
const chunkSize = ref(20);
const chunksLoading = ref(false);
const selectedChunks = ref<DocumentChunkVO[]>([]);
const applySwitchingId = ref<string>('');

const onSelectionChange = (rows: DocumentChunkVO[]) => {
  selectedChunks.value = rows;
};

const editDialog = ref({ visible: false, saving: false, chunkId: '', text: '' });
const splitDialog = ref({
  visible: false,
  saving: false,
  chunkId: '',
  mode: 'target' as 'target' | 'points',
  targetSize: 256,
  pointsText: '',
});

/** 重切后轮询(split-config 返回的 documentStatus 反映入库进度) */
const RESPLIT_POLL_INTERVAL = 2500;
const RESPLIT_POLL_TIMEOUT = 5 * 60 * 1000;
let resplitTimer: number | null = null;
let resplitStartedAt = 0;

const processingStatusSet = new Set(['PENDING', 'PARSING', 'SPLITTING', 'EMBEDDING']);

// ==================== 通用 ====================
const statusKeyMap: Record<string, string> = {
  PENDING: 'knowledgeBase.status.pending',
  PARSING: 'knowledgeBase.status.parsing',
  SPLITTING: 'knowledgeBase.status.splitting',
  EMBEDDING: 'knowledgeBase.status.embedding',
  COMPLETED: 'knowledgeBase.status.completed',
  FAILED: 'knowledgeBase.status.failed',
};

const statusLabel = (status?: string) => {
  if (!status) return '-';

  const key = statusKeyMap[status];

  return key ? t(key) : status;
};

const statusTagType = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'danger';
    default:
      return 'warning';
  }
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: 'KnowledgeBase' });
  }
};

// ==================== 数据加载 ====================
const fetchEffectiveConfig = async () => {
  const res = await api.split.getSplitConfig(documentId);

  effectiveConfig.value = res.data as EffectiveSplitConfig;

  return res.data as EffectiveSplitConfig;
};

const fetchChunks = async (page?: number) => {
  if (page) chunkPage.value = page;

  chunksLoading.value = true;

  try {
    const res = await api.split.getDocumentChunks(documentId, chunkPage.value, chunkSize.value);
    const data = res.data as ChunkListResult;

    chunks.value = data.chunks || [];
    chunkStats.value = data.stats || null;
    chunkTotal.value = data.total || 0;
  } finally {
    chunksLoading.value = false;
  }
};

const handleSizeChange = () => {
  chunkPage.value = 1;
  fetchChunks(1);
};

// ==================== 预览 / 对比 ====================
const handlePreview = async (trial: SplitConfigDto) => {
  previewLoading.value = true;
  previewMode.value = 'single';

  try {
    const res = await api.split.previewSplit(documentId, trial);

    previewResult.value = res.data as SplitPreviewVO;
  } finally {
    previewLoading.value = false;
  }
};

const handleCompare = async (configA: SplitConfigDto, configB: SplitConfigDto) => {
  compareLoading.value = true;
  previewMode.value = 'compare';

  try {
    const res = await api.split.compareSplit(documentId, {
      configA,
      configB,
      sampleChunks: 10,
    });

    compareResult.value = res.data as SplitCompareResult;
  } finally {
    compareLoading.value = false;
  }
};

// ==================== 保存 / 重切 ====================
const handleSave = async (merged: SplitConfigDto) => {
  saving.value = true;

  try {
    await api.split.saveSplitConfig(documentId, merged);
    ElMessage.success(t('splitManagement.saveSuccess'));
    savedButPending.value = true;
    await fetchEffectiveConfig();
  } finally {
    saving.value = false;
  }
};

const handleResplit = async (merged: SplitConfigDto) => {
  await api.split.resplitDocument(documentId, merged);
  ElMessage.success(t('splitManagement.resplitAccepted'));
  savedButPending.value = false;
  startResplitPolling();
};

const stopResplitPolling = () => {
  if (resplitTimer) {
    window.clearTimeout(resplitTimer);
    resplitTimer = null;
  }
};

/**
 * 重切轮询:documentStatus 离开处理中集合即终态;
 * COMPLETED 刷新分片与配置,FAILED 提示;超时 5 分钟保守退出。
 */
const scheduleResplitPoll = () => {
  stopResplitPolling();

  resplitTimer = window.setTimeout(pollResplitOnce, RESPLIT_POLL_INTERVAL);
};

const pollResplitOnce = async () => {
  try {
    const cfg = await fetchEffectiveConfig();
    const status = cfg.documentStatus || '';

    if (!processingStatusSet.has(status)) {
      rebuilding.value = false;

      if (status === 'COMPLETED') {
        ElMessage.success(t('splitManagement.rebuildDone'));
        selectedChunks.value = [];
        chunkPage.value = 1;
        await fetchChunks(1);
      } else if (status === 'FAILED') {
        ElMessage.error(t('splitManagement.rebuildFailed'));
      } else {
        // 未知状态:保守停轮询,引导手动刷新
        await fetchChunks(chunkPage.value);
      }

      return;
    }

    if (Date.now() - resplitStartedAt > RESPLIT_POLL_TIMEOUT) {
      rebuilding.value = false;
      ElMessage.warning(t('splitManagement.rebuilding'));

      return;
    }

    scheduleResplitPoll();
  } catch {
    // 单次轮询失败不致命,延迟续投
    scheduleResplitPoll();
  }
};

const startResplitPolling = () => {
  rebuilding.value = true;
  resplitStartedAt = Date.now();
  scheduleResplitPoll();
};

// ==================== 线上分片手动干预 ====================
const handleApplyToggle = async (row: DocumentChunkVO, next: boolean) => {
  if (!next) {
    // 停用作风险提示;启用直接执行
    try {
      await ElMessageBox.confirm(
        t('splitManagement.disableConfirm'),
        t('splitManagement.disable'),
        {
          confirmButtonText: t('knowledgeBase.message.confirm'),
          cancelButtonText: t('knowledgeBase.message.cancel'),
          type: 'warning',
        },
      );
    } catch {
      return;
    }
  }

  applySwitchingId.value = row.chunkId;

  try {
    await api.split.setChunkApply(documentId, row.chunkId, next);
    row.isApply = next ? '1' : '0';

    // 局部校正统计(避免整表刷新闪烁)
    if (chunkStats.value) {
      chunkStats.value.disabledCount += next ? -1 : 1;
    }

    ElMessage.success(t('splitManagement.operateSuccess'));
  } finally {
    applySwitchingId.value = '';
  }
};

const handleDeleteChunk = async (row: DocumentChunkVO) => {
  try {
    await ElMessageBox.confirm(
      t('splitManagement.deleteConfirm'),
      t('splitManagement.deleteAction'),
      {
        confirmButtonText: t('knowledgeBase.message.confirm'),
        cancelButtonText: t('knowledgeBase.message.cancel'),
        type: 'error',
      },
    );
  } catch {
    return;
  }

  await api.split.deleteChunk(documentId, row.chunkId);
  ElMessage.success(t('splitManagement.operateSuccess'));
  await fetchChunks(chunkPage.value);
};

/** 分片序号数值序(支持子序号 "12.1"):合并按传入顺序拼接,前端先按序号排序保证语义顺序 */
const sortBySegmentIndex = (list: DocumentChunkVO[]) => {
  return [...list].sort((a, b) =>
    String(a.segmentIndex).localeCompare(String(b.segmentIndex), undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  );
};

const handleMergeSelected = async () => {
  const selected = selectedChunks.value;

  if (selected.length < 2 || selected.length > 10) {
    ElMessage.warning(t('splitManagement.mergeLimit'));
    return;
  }

  try {
    await ElMessageBox.confirm(
      t('splitManagement.mergeOrderTip', { n: selected.length }),
      t('splitManagement.mergeConfirm'),
      {
        confirmButtonText: t('knowledgeBase.message.confirm'),
        cancelButtonText: t('knowledgeBase.message.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  const orderedIds = sortBySegmentIndex(selected).map((chunk) => chunk.chunkId);

  await api.split.mergeChunks(documentId, orderedIds);
  ElMessage.success(t('splitManagement.mergeSuccess'));
  await fetchChunks(chunkPage.value);
};

const openEditDialog = (row: DocumentChunkVO) => {
  editDialog.value = { visible: true, saving: false, chunkId: row.chunkId, text: row.text };
};

const submitEditChunk = async () => {
  const text = editDialog.value.text.trim();

  if (!text) {
    ElMessage.warning(t('splitManagement.editEmpty'));
    return;
  }

  editDialog.value.saving = true;

  try {
    await api.split.updateChunkText(documentId, editDialog.value.chunkId, text);
    ElMessage.success(t('splitManagement.operateSuccess'));
    editDialog.value.visible = false;
    await fetchChunks(chunkPage.value);
  } finally {
    editDialog.value.saving = false;
  }
};

const openSplitDialog = (row: DocumentChunkVO) => {
  splitDialog.value = {
    visible: true,
    saving: false,
    chunkId: row.chunkId,
    mode: 'target',
    targetSize: 256,
    pointsText: '',
  };
};

const parsePoints = (raw: string): number[] | null => {
  const points = raw
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);

  if (
    !points.length ||
    points.some((p) => !Number.isInteger(p) || p < 1 || p > 60000) ||
    points.some((p, i) => i > 0 && p <= points[i - 1])
  ) {
    return null;
  }

  return points;
};

const submitSplitChunk = async () => {
  let payload: { targetSize?: number; points?: number[] };

  if (splitDialog.value.mode === 'target') {
    payload = { targetSize: splitDialog.value.targetSize };
  } else {
    const points = parsePoints(splitDialog.value.pointsText);

    if (!points) {
      ElMessage.error(t('splitManagement.splitPointsInvalid'));
      return;
    }

    payload = { points };
  }

  splitDialog.value.saving = true;

  try {
    const res = await api.split.splitChunk(documentId, splitDialog.value.chunkId, payload);
    const pieces = (res.data || []) as DocumentChunkVO[];

    ElMessage.success(`${t('splitManagement.operateSuccess')} (${pieces.length})`);
    splitDialog.value.visible = false;
    await fetchChunks(chunkPage.value);
  } finally {
    splitDialog.value.saving = false;
  }
};

const copyChunkId = async (chunkId: string) => {
  try {
    await navigator.clipboard.writeText(chunkId);
    ElMessage.success(t('splitManagement.copied'));
  } catch {
    ElMessage.warning(chunkId);
  }
};

// ==================== 生命周期 ====================
onMounted(async () => {
  // 文档ID守卫：缺失/非法(如参数字面量 ":documentId",多见于误从导航菜单直达)时
  // 提示并回退知识库管理页,避免发出取参错误的接口请求
  if (!documentId || documentId.startsWith(':')) {
    ElMessage.warning(t('splitManagement.invalidDocument'));
    router.replace({ name: 'KnowledgeBase' });
    return;
  }

  try {
    await Promise.all([fetchEffectiveConfig(), fetchChunks(1)]);
  } catch (error) {
    console.error('分片管理页初始化失败:', error);
  }
});

onBeforeUnmount(stopResplitPolling);
</script>

<style scoped lang="scss">
.split-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 22px;
  overflow: hidden auto;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, #fff9f3 0%, #fdf8f3 100%);
}

/* ==================== 页面头 ==================== */
.page-header {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;

  .back-btn {
    flex-shrink: 0;
    font-size: 13px;
    color: #806b5b;

    &:hover {
      color: #f97316;
    }
  }

  .header-title {
    display: flex;
    gap: 12px;
    align-items: baseline;
    min-width: 0;

    h2 {
      position: relative;
      flex-shrink: 0;
      padding-left: 13px;
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #4a382c;

      &::before {
        position: absolute;
        top: 50%;
        left: 0;
        width: 4px;
        height: 20px;
        content: '';
        background: linear-gradient(180deg, #ff9a3d, #f97316);
        border-radius: 999px;
        transform: translateY(-50%);
      }
    }

    .doc-name {
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
      color: #a18b7b;
      white-space: nowrap;
    }
  }

  .header-meta {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    margin-left: auto;
  }
}

/* ==================== 工作台区 ==================== */
.workbench {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 400px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;

  /* 定高工作台:左右两栏同高且各自内部滚动,预览切块再多也不会撑破整体布局 */
  height: clamp(460px, 52vh, 760px);
  min-height: 0;
}

/* ==================== 线上分片 ==================== */
.online-card {
  flex-shrink: 0;
  border: 1px solid #f0dfcf;
  border-radius: 14px;

  :deep(.el-card__header) {
    padding: 12px 16px;
    background: #fff7ef;
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-card__body) {
    padding: 14px 16px;
  }

  .card-header {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    font-size: 14px;
    font-weight: 700;
    color: #4a382c;

    .el-icon {
      color: #f97316;
    }

    .stats-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;

      .stat-chip {
        padding: 2px 9px;
        font-size: 11px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: #806b5b;
        background: #fff;
        border: 1px solid #f1e1d2;
        border-radius: 999px;

        &.warn-chip.active {
          font-weight: 700;
          color: #c25f05;
          background: #fff7ed;
          border-color: #fed7aa;
        }

        &.scope {
          color: #b8a99b;
          border-style: dashed;
        }
      }
    }

    .online-header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-left: auto;

      .selected-tip {
        font-size: 12px;
        color: #f97316;
      }
    }
  }
}

/* 表格内容 */
.seg-index {
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #f97316;
}

.chunk-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.65;
  color: #5b4738;
  word-break: break-word;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
}

.metric {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #4a382c;
}

.metric-sub {
  font-size: 11px;
  color: #a18b7b;
}

.section-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #c88752;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  justify-content: center;

  .el-button + .el-button {
    margin-left: 6px;
  }
}

/* 展开行 */
.chunk-expand {
  padding: 10px 14px;
  background: #fffaf5;
  border-radius: 10px;

  .expand-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 8px;
    font-size: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .expand-label {
    flex-shrink: 0;
    width: 60px;
    font-weight: 600;
    color: #a18b7b;
  }

  .expand-value {
    flex: 1;
    min-width: 0;
    color: #5b4738;
    word-break: break-all;

    &.mono {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 11px;
    }

    &.full-text {
      max-height: 220px;
      overflow-y: auto;
      line-height: 1.7;
      white-space: pre-wrap;
    }
  }

  .metadata-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .metadata-item {
      padding: 2px 8px;
      font-size: 11px;
      color: #806b5b;
      background: #fff;
      border: 1px solid #f1e1d2;
      border-radius: 6px;
    }
  }
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

/* ==================== 弹窗 ==================== */
.dialog-tip {
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #92400e;
  background: linear-gradient(135deg, #fff7ed, #fffbeb);
  border: 1px solid rgb(245 158 11 / 22%);
  border-radius: 9px;
}

.split-form {
  margin-top: 14px;

  .field-label {
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #6b5545;
  }

  .field-tip {
    margin-top: 6px;
    font-size: 12px;
    color: #a18b7b;
  }
}

/* 表格主题对齐知识库页 */
:deep(.el-table) {
  color: #5b4738;

  --el-table-border-color: #f2e2d4;
  --el-table-header-bg-color: #fff7ef;
  --el-table-row-hover-bg-color: #fffaf5;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 600;
  color: #6b5545;
  background: #fff7ef;
}

:deep(.el-table td.el-table__cell) {
  border-bottom-color: #f3e4d6;
}

/* ==================== 响应式 ==================== */
@media (width <=1100px) {
  .workbench {
    grid-template-columns: 1fr;

    /* 单列堆叠时放开定高约束:配置面板自适应,预览面板单独限高 */
    height: auto;

    :deep(.preview-pane) {
      height: clamp(380px, 56vh, 620px);
    }
  }
}

@media (width <=768px) {
  .split-page {
    padding: 12px;
  }

  .page-header {
    flex-wrap: wrap;
  }
}
</style>
