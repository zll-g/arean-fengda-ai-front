<template>
  <div class="preview-pane">
    <el-card shadow="never" class="preview-card" :body-style="{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }">
      <template #header>
        <div class="card-header">
          <el-icon><DataAnalysis /></el-icon>
          <span>{{ mode === 'compare' ? t('splitManagement.compareMode') : t('splitManagement.preview') }}</span>

          <template v-if="mode === 'single' && preview">
            <el-tag v-if="preview.parseCacheHit" type="success" size="small" effect="plain" round>
              {{ t('splitManagement.parseCacheHit') }}
            </el-tag>
            <span class="duration">{{ t('splitManagement.duration') }} {{ formatMs(preview.durationMs) }}</span>
          </template>

          <el-tag v-if="mode === 'compare' && compareResult?.parseCacheHit" type="success" size="small" effect="plain" round>
            {{ t('splitManagement.parseCacheHit') }}
          </el-tag>
        </div>
      </template>

      <div v-loading="loading" :element-loading-text="t('splitManagement.previewing')" class="preview-body">
        <!-- 空态 -->
        <div v-if="mode === 'idle'" class="empty-hint">
          <el-icon :size="40"><MagicStick /></el-icon>
          <p>{{ t('splitManagement.noPreview') }}</p>
        </div>

        <!-- ==================== 单预览 ==================== -->
        <template v-else-if="mode === 'single' && preview">
          <StatsGrid :stats="preview.stats" />
          <div class="applied-config">
            {{ t('splitManagement.effectiveTitle') }}:
            {{ describeConfig(preview.appliedConfig) }}
          </div>
          <ChunkCardList :chunks="preview.chunks" />
        </template>

        <!-- ==================== A/B 对比 ==================== -->
        <template v-else-if="mode === 'compare' && compareResult">
          <div class="compare-grid">
            <div class="compare-col">
              <div class="compare-title">
                <el-tag type="primary" size="small" effect="dark">{{ t('splitManagement.configA') }}</el-tag>
                <span class="compare-config-text">{{ describeConfig(compareResult.configA) }}</span>
              </div>
              <StatsGrid :stats="compareResult.statsA" compact />
              <ChunkCardList :chunks="compareResult.sampleChunksA" compact />
            </div>

            <div class="compare-col">
              <div class="compare-title">
                <el-tag type="warning" size="small" effect="dark">{{ t('splitManagement.configB') }}</el-tag>
                <span class="compare-config-text">{{ describeConfig(compareResult.configB) }}</span>
              </div>
              <StatsGrid :stats="compareResult.statsB" compact />
              <ChunkCardList :chunks="compareResult.sampleChunksB" compact />
            </div>
          </div>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { useI18n } from 'vue-i18n';
import { DataAnalysis, MagicStick } from '@element-plus/icons-vue';
import type {
  ChunkPreviewVO,
  SplitCompareResult,
  SplitConfigDto,
  SplitPreviewVO,
  SplitStatsVO,
} from '@/api/modules/split';

withDefaults(
  defineProps<{
    mode: 'idle' | 'single' | 'compare';
    preview?: SplitPreviewVO | null;
    compareResult?: SplitCompareResult | null;
    loading?: boolean;
  }>(),
  { preview: null, compareResult: null, loading: false },
);

const { t, locale } = useI18n();

const charsUnit = () => (locale.value === 'en-US' ? ' chars' : '字');

const formatMs = (ms?: number) => {
  const value = Math.max(0, ms ?? 0);

  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
};

/** 配置的一句话描述(用于预览/对比标题行) */
const describeConfig = (cfg?: SplitConfigDto | null) => {
  if (!cfg) return '-';

  const strategyKey = cfg.strategy || 'recursive';

  const parts = [
    t(`splitManagement.strategyName.${strategyKey}`),
    `${cfg.chunkSize ?? '-'}${cfg.sizeUnit === 'token' ? 'tok' : '字'}`,
    `+${cfg.chunkOverlap ?? '-'}`,
  ];

  if (cfg.tableRowSplitEnabled) {
    parts.push(`${t('splitManagement.tableRowSplitEnabled')}×${cfg.tableRowBatchSize ?? '-'}`);
  }

  return parts.join(' · ');
};

/** ==================== 内联渲染:统计网格 ==================== */
const StatsGrid = (gridProps: { stats: SplitStatsVO; compact?: boolean }) => {
  const s = gridProps.stats;

  if (!s) return null;

  const items = [
    { label: t('splitManagement.totalChunks'), value: s.totalChunks },
    { label: t('splitManagement.avgChars'), value: s.avgChars },
    { label: t('splitManagement.minMaxChars'), value: `${s.minChars} / ${s.maxChars}` },
    { label: t('splitManagement.overSizeCount'), value: s.overSizeCount, warn: s.overSizeCount > 0 },
    { label: t('splitManagement.tinyCount'), value: s.tinyCount, warn: s.tinyCount > 0 },
    { label: t('splitManagement.tableChunkCount'), value: s.tableChunkCount },
    { label: t('splitManagement.headingCoverage'), value: `${Math.round((s.headingCoverage || 0) * 100)}%` },
  ];

  return h(
    'div',
    { class: ['stats-grid', gridProps.compact && 'compact'] },
    items.map((item) =>
      h('div', { class: ['stat-chip', item.warn && 'warn'] }, [
        h('span', { class: 'stat-value' }, String(item.value ?? '-')),
        h('span', { class: 'stat-label' }, item.label),
      ]),
    ),
  );
};

StatsGrid.props = ['stats', 'compact'];

/** ==================== 内联渲染:切块卡片列表 ==================== */
const contentTypeTag = (type?: string | null) => {
  if (type === 'table') return 'warning';

  return 'info';
};

const ChunkCardList = (listProps: { chunks?: ChunkPreviewVO[]; compact?: boolean }) => {
  const chunks = listProps.chunks || [];

  if (!chunks.length) return null;

  return h(
    'div',
    { class: ['chunk-list', listProps.compact && 'compact'] },
    chunks.map((chunk) =>
      h('div', { class: 'chunk-card', key: chunk.index }, [
        h('div', { class: 'chunk-head' }, [
          h('span', { class: 'chunk-index' }, `#${chunk.index}`),
          h('span', { class: 'chunk-metric' }, `${chunk.charCount}${charsUnit()}`),
          h('span', { class: 'chunk-metric' }, `${chunk.tokenEstimate} tok`),
          chunk.contentType
            ? h('span', { class: ['chunk-type', contentTypeTag(chunk.contentType)] }, chunk.contentType)
            : null,
          chunk.textTruncated
            ? h('span', { class: 'chunk-truncated' }, t('splitManagement.textTruncated'))
            : null,
        ]),
        chunk.sectionHeading
          ? h('div', { class: 'chunk-section' }, `§ ${chunk.sectionHeading}`)
          : null,
        chunk.tableName
          ? h(
              'div',
              { class: 'chunk-section' },
              `${t('splitManagement.tableName')}: ${chunk.tableName}${chunk.rowRange ? ` (${chunk.rowRange})` : ''}`,
            )
          : null,
        h('div', { class: 'chunk-text' }, chunk.text),
      ]),
    ),
  );
};

ChunkCardList.props = ['chunks', 'compact'];
</script>

<style scoped lang="scss">
.preview-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.preview-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 420px;
  border: 1px solid #f0dfcf;
  border-radius: 14px;

  :deep(.el-card__header) {
    padding: 12px 16px;
    background: #fff7ef;
    border-bottom: 1px solid #f3e4d6;
  }

  :deep(.el-card__body) {
    padding: 16px;
    overflow: hidden;
  }
}

.card-header {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #4a382c;

  .el-icon {
    color: #f97316;
  }

  .duration {
    margin-left: auto;
    font-size: 12px;
    font-weight: 500;
    color: #a18b7b;
  }
}

.preview-body {
  flex: 1;
  min-height: 260px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: #b8a99b;

  p {
    margin-top: 10px;
    font-size: 13px;
  }
}

.applied-config {
  margin: 10px 0 12px;
  font-size: 12px;
  color: #806b5b;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.compare-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;

  .compare-config-text {
    overflow: hidden;
    font-size: 12px;
    color: #806b5b;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ============ 统计网格(内联组件样式) ============ */
:deep(.stats-grid) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  margin-bottom: 8px;

  .stat-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    padding: 8px 6px;
    background: #fffaf5;
    border: 1px solid #f3e7da;
    border-radius: 9px;

    .stat-value {
      font-size: 16px;
      font-weight: 700;
      color: #4a382c;
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      font-size: 11px;
      color: #a18b7b;
    }

    &.warn {
      background: #fff7ed;
      border-color: #fed7aa;

      .stat-value {
        color: #c25f05;
      }
    }
  }

  &.compact {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));

    .stat-chip {
      padding: 6px 4px;

      .stat-value {
        font-size: 14px;
      }
    }
  }
}

/* ============ 切块卡片(内联组件样式) ============ */
:deep(.chunk-list) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 4px;

  .chunk-card {
    padding: 10px 12px;
    background: #fff;
    border: 1px solid #f1e1d2;
    border-radius: 10px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;

    &:hover {
      border-color: #ffc58f;
      box-shadow: 0 5px 14px rgb(249 115 22 / 7%);
    }
  }

  .chunk-head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
  }

  .chunk-index {
    font-size: 12px;
    font-weight: 700;
    color: #f97316;
    font-variant-numeric: tabular-nums;
  }

  .chunk-metric {
    font-size: 11px;
    color: #a18b7b;
    font-variant-numeric: tabular-nums;
  }

  .chunk-type {
    padding: 0 7px;
    font-size: 10px;
    line-height: 18px;
    border-radius: 999px;

    &.warning {
      color: #c25f05;
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }

    &.info {
      color: #6b7280;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }
  }

  .chunk-truncated {
    font-size: 10px;
    color: #b8a99b;
  }

  .chunk-section {
    margin-bottom: 5px;
    overflow: hidden;
    font-size: 11px;
    color: #c88752;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chunk-text {
    font-size: 12px;
    line-height: 1.7;
    color: #5b4738;
    word-break: break-word;
    white-space: pre-wrap;
  }

  &.compact .chunk-text {
    font-size: 11px;
  }
}
</style>
