<template>
  <div class="usage-stats-page">
    <!-- 顶部筛选区:日期区间 + 刷新 -->
    <div class="page-header">
      <div class="page-title">{{ t('usageStats.title') }}</div>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :clearable="false"
          :shortcuts="rangeShortcuts"
          :start-placeholder="t('usageStats.startDate')"
          :end-placeholder="t('usageStats.endDate')"
          style="width: 280px"
          @change="handleRangeChange"
        />
        <el-button type="primary" :loading="loading.charts" @click="loadAll">
          {{ t('usageStats.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- 指标卡(2 行 × 4 列) -->
    <div v-loading="loading.overview" class="stat-cards">
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.todayEvents') }}</div>
        <div class="stat-value">{{ formatNumber(overview.todayEvents) }}</div>
        <div class="stat-sub">
          {{ t('usageStats.card.rangeTotal') }} {{ formatNumber(overview.totalEvents) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.todayActiveUsers') }}</div>
        <div class="stat-value">{{ formatNumber(overview.todayActiveUsers) }}</div>
        <div class="stat-sub">
          {{ t('usageStats.card.rangeTotal') }} {{ formatNumber(overview.activeUsers) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.chatRequests') }}</div>
        <div class="stat-value">{{ formatNumber(overview.chatRequests) }}</div>
        <div class="stat-sub">{{ t('usageStats.card.chatRequestsSub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.successRate') }}</div>
        <div class="stat-value">{{ overview.successRate.toFixed(1) }}%</div>
        <div class="stat-sub">{{ t('usageStats.card.chatOnly') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.avgLatency') }}</div>
        <div class="stat-value">{{ formatLatency(overview.avgLatencyMs) }}</div>
        <div class="stat-sub">{{ t('usageStats.card.chatOnly') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.totalTokens') }}</div>
        <div class="stat-value">{{ formatNumber(overview.totalTokens) }}</div>
        <div class="stat-sub">{{ t('usageStats.card.tokenSub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.docUploads') }}</div>
        <div class="stat-value">{{ formatNumber(overview.docUploads) }}</div>
        <div class="stat-sub">{{ t('usageStats.card.docUploadsSub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('usageStats.card.kbCreates') }}</div>
        <div class="stat-value">{{ formatNumber(overview.kbCreates) }}</div>
        <div class="stat-sub">{{ t('usageStats.card.kbCreatesSub') }}</div>
      </div>
    </div>

    <!-- 图表区:趋势折线 + 功能分布 -->
    <div class="chart-row">
      <div class="chart-panel chart-panel-lg">
        <div class="panel-title">{{ t('usageStats.trendTitle') }}</div>
        <div ref="trendChartRef" class="chart-box" />
      </div>
      <div class="chart-panel chart-panel-sm">
        <div class="panel-title">{{ t('usageStats.featureDistTitle') }}</div>
        <div ref="featureChartRef" class="chart-box" />
      </div>
    </div>

    <!-- 图表区第二行:状态分布 + 用户排行 -->
    <div class="chart-row">
      <div class="chart-panel chart-panel-sm">
        <div class="panel-title">{{ t('usageStats.statusDistTitle') }}</div>
        <div ref="statusChartRef" class="chart-box" />
      </div>
      <div class="chart-panel chart-panel-lg">
        <div class="panel-title">{{ t('usageStats.userRankTitle') }}</div>
        <el-table :data="userRank" size="small" height="300">
          <el-table-column type="index" width="50" :label="t('usageStats.rankCol')" />
          <el-table-column :label="t('usageStats.userCol')" min-width="140">
            <template #default="{ row }">
              <span>{{ displayUser(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="workno" :label="t('usageStats.worknoCol')" width="100">
            <template #default="{ row }">{{ row.workno || '-' }}</template>
          </el-table-column>
          <el-table-column prop="events" :label="t('usageStats.eventsCol')" width="90" sortable />
          <el-table-column
            prop="chatRequests"
            :label="t('usageStats.chatRequestsCol')"
            width="100"
            sortable
          />
          <el-table-column :label="t('usageStats.tokensCol')" width="110">
            <template #default="{ row }">{{ formatNumber(row.tokens) }}</template>
          </el-table-column>
          <el-table-column
            prop="lastActiveTime"
            :label="t('usageStats.lastActiveCol')"
            width="160"
          />
        </el-table>
      </div>
    </div>

    <!-- 事件明细(筛选 + 分页) -->
    <div class="chart-panel detail-panel">
      <div class="panel-title">{{ t('usageStats.detailTitle') }}</div>
      <div class="detail-filters">
        <el-select
          v-model="filters.eventType"
          clearable
          :placeholder="t('usageStats.eventTypeFilter')"
          style="width: 180px"
          @change="handleFilterChange"
        >
          <el-option
            v-for="item in eventTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.feature"
          clearable
          filterable
          :placeholder="t('usageStats.featureFilter')"
          style="width: 190px"
          @change="handleFilterChange"
        >
          <el-option
            v-for="item in featureOptions"
            :key="item"
            :label="featureLabel(item)"
            :value="item"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          clearable
          :placeholder="t('usageStats.statusFilter')"
          style="width: 140px"
          @change="handleFilterChange"
        >
          <el-option value="SUCCESS" :label="t('usageStats.statusSuccess')" />
          <el-option value="ERROR" :label="t('usageStats.statusError')" />
          <el-option value="INTERRUPTED" :label="t('usageStats.statusInterrupted')" />
        </el-select>
        <el-input
          v-model="filters.userKw"
          clearable
          :placeholder="t('usageStats.userKwPlaceholder')"
          style="width: 220px"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        />
        <el-button type="primary" @click="handleFilterChange">
          {{ t('usageStats.search') }}
        </el-button>
      </div>
      <el-table v-loading="loading.events" :data="events.list" size="small" height="420">
        <el-table-column prop="createdTime" :label="t('usageStats.timeCol')" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdTime) }}</template>
        </el-table-column>
        <el-table-column :label="t('usageStats.typeCol')" width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="eventTypeTagType(row.eventType)">
              {{ eventTypeLabel(row.eventType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('usageStats.featureCol')" width="150">
          <template #default="{ row }">{{ featureLabel(row.feature) }}</template>
        </el-table-column>
        <el-table-column :label="t('usageStats.userCol')" min-width="130">
          <template #default="{ row }">{{ displayUser(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('usageStats.statusCol')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('usageStats.latencyCol')" width="90">
          <template #default="{ row }">
            {{ row.latencyMs != null ? formatLatency(row.latencyMs) : '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="t('usageStats.tokensCol')" width="110">
          <template #default="{ row }">{{ formatTokenPair(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('usageStats.questionCol')" min-width="220">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.question"
              :content="row.question"
              placement="top"
              :show-after="300"
              max-width="480"
            >
              <span class="ellipsis-cell">{{ row.question }}</span>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('usageStats.detailCol')" min-width="200">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.errorMsg || row.detail"
              :content="row.errorMsg || row.detail"
              placement="top"
              :show-after="300"
              max-width="480"
            >
              <span class="ellipsis-cell" :class="{ 'error-text': row.errorMsg }">{{
                row.errorMsg || row.detail
              }}</span>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('usageStats.noData')" :image-size="80" />
        </template>
      </el-table>
      <div class="detail-pager">
        <el-pagination
          v-model:current-page="events.page"
          v-model:page-size="events.size"
          :total="events.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="loadEvents"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import {
  type UsageEventItem,
  type UsageFeatureDist,
  type UsageOverview,
  type UsageStatusDist,
  type UsageTrendItem,
  type UsageUserRank,
  getUsageEvents,
  getUsageFeatureDist,
  getUsageOverview,
  getUsageStatusDist,
  getUsageTrend,
  getUsageUserRank,
} from '@/api/modules/usage-stats';
import { ensureUsageAccess } from '@/utils/usageAccess';

const { t } = useI18n();
const router = useRouter();

// ==================== 状态 ====================

const defaultOverview = (): UsageOverview => ({
  totalEvents: 0,
  todayEvents: 0,
  chatRequests: 0,
  activeUsers: 0,
  todayActiveUsers: 0,
  successRate: 0,
  avgLatencyMs: 0,
  totalTokens: 0,
  docUploads: 0,
  kbCreates: 0,
});

const overview = ref<UsageOverview>(defaultOverview());
const trend = ref<UsageTrendItem[]>([]);
const featureDist = ref<UsageFeatureDist[]>([]);
const statusDist = ref<UsageStatusDist[]>([]);
const userRank = ref<UsageUserRank[]>([]);

const events = reactive({
  list: [] as UsageEventItem[],
  total: 0,
  page: 1,
  size: 20,
});

const filters = reactive({
  eventType: '',
  feature: '',
  status: '',
  userKw: '',
});

const loading = reactive({
  overview: false,
  charts: false,
  events: false,
});

const formatDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const lastDays = (days: number): [string, string] => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return [formatDateString(start), formatDateString(end)];
};

/** 日期区间(默认近 7 天,value-format 字符串) */
const dateRange = ref<[string, string]>(lastDays(7));

const rangeShortcuts = computed(() => [
  {
    text: t('usageStats.last7Days'),
    value: () => {
      const [start, end] = lastDays(7);
      return [new Date(start), new Date(end)];
    },
  },
  {
    text: t('usageStats.last30Days'),
    value: () => {
      const [start, end] = lastDays(30);
      return [new Date(start), new Date(end)];
    },
  },
]);

// ==================== 图表实例 ====================

const trendChartRef = ref<HTMLElement | null>(null);
const featureChartRef = ref<HTMLElement | null>(null);
const statusChartRef = ref<HTMLElement | null>(null);

let trendChart: echarts.ECharts | null = null;
let featureChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;

const handleWindowResize = () => {
  trendChart?.resize();
  featureChart?.resize();
  statusChart?.resize();
};

// ==================== 工具函数 ====================

const formatNumber = (value?: number | null) => {
  if (value == null) return '0';
  return value.toLocaleString();
};

const formatLatency = (ms?: number | null) => {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  // LocalDateTime 序列化为 ISO(2026-08-11T12:00:00)或数组,统一裁到秒便于阅读
  return value.replace('T', ' ').substring(0, 19);
};

const formatTokenPair = (row: UsageEventItem) => {
  const input = row.inputTokens ?? 0;
  const output = row.outputTokens ?? 0;
  if (input === 0 && output === 0) return '-';
  return `${formatNumber(input)} / ${formatNumber(output)}`;
};

const displayUser = (row: {
  userId?: string | null;
  account?: string | null;
  workno?: string | null;
}) => {
  if (row.account) return row.workno ? `${row.account}(${row.workno})` : row.account;
  return row.userId || t('usageStats.anonymous');
};

/** 事件类型 → i18n 文案(码值与后端 UsageEventType 常量一一对应) */
const eventTypeLabel = (eventType?: string | null) => {
  switch (eventType) {
    case 'KB_CHAT_ASK':
      return t('usageStats.type.kbAsk');
    case 'KB_CHAT_REGENERATE':
      return t('usageStats.type.kbRegenerate');
    case 'DI_CHAT_ASK':
      return t('usageStats.type.diAsk');
    case 'DI_CHAT_REGENERATE':
      return t('usageStats.type.diRegenerate');
    case 'DOC_ANALYSIS_ASK':
      return t('usageStats.type.docAnalysis');
    case 'DOC_UPLOAD':
      return t('usageStats.type.docUpload');
    case 'KB_CREATE':
      return t('usageStats.type.kbCreate');
    default:
      return eventType || t('usageStats.type.unknown');
  }
};

const eventTypeTagType = (eventType?: string | null) => {
  if (!eventType) return 'info';
  if (eventType.startsWith('KB_CHAT')) return 'primary';
  if (eventType.startsWith('DI_CHAT')) return 'success';
  if (eventType === 'DOC_ANALYSIS_ASK') return 'warning';
  return 'info';
};

/** 功能码值 → i18n 文案 */
const featureLabel = (feature?: string | null) => {
  switch (feature) {
    case 'KNOWLEDGE_QA':
      return t('usageStats.feature.knowledgeQa');
    case 'DEEP_SEARCH':
      return t('usageStats.feature.deepSearch');
    case 'DOCUMENT_ANALYSIS':
      return t('usageStats.feature.docAnalysis');
    case 'WEB_SEARCH':
      return t('usageStats.feature.webSearch');
    case 'DEEP_RESEARCH':
      return t('usageStats.feature.deepResearch');
    case 'OPEN_API':
      return t('usageStats.feature.openApi');
    case 'NL2SQL':
      return t('usageStats.feature.nl2sql');
    case 'DOCUMENT':
      return t('usageStats.feature.document');
    case 'KNOWLEDGE_BASE':
      return t('usageStats.feature.knowledgeBase');
    default:
      return feature && feature !== 'UNKNOWN' ? feature : t('usageStats.feature.unknown');
  }
};

const statusLabel = (status?: string | null) => {
  switch (status) {
    case 'SUCCESS':
      return t('usageStats.statusSuccess');
    case 'ERROR':
      return t('usageStats.statusError');
    case 'INTERRUPTED':
      return t('usageStats.statusInterrupted');
    default:
      return status || '-';
  }
};

const statusTagType = (status?: string | null) => {
  if (status === 'SUCCESS') return 'success';
  if (status === 'ERROR') return 'danger';
  if (status === 'INTERRUPTED') return 'warning';
  return 'info';
};

const eventTypeOptions = computed(() => [
  { value: 'KB_CHAT_ASK', label: t('usageStats.type.kbAsk') },
  { value: 'KB_CHAT_REGENERATE', label: t('usageStats.type.kbRegenerate') },
  { value: 'DI_CHAT_ASK', label: t('usageStats.type.diAsk') },
  { value: 'DI_CHAT_REGENERATE', label: t('usageStats.type.diRegenerate') },
  { value: 'DOC_ANALYSIS_ASK', label: t('usageStats.type.docAnalysis') },
  { value: 'DOC_UPLOAD', label: t('usageStats.type.docUpload') },
  { value: 'KB_CREATE', label: t('usageStats.type.kbCreate') },
]);

/** 功能筛选项:当前区间内真实出现过的 feature(动态,避免列出一堆无数据项) */
const featureOptions = computed(() => featureDist.value.map((item) => item.feature));

const rangeParams = () => {
  const [start, end] = dateRange.value || [];
  return { startDate: start, endDate: end };
};

// ==================== 数据加载 ====================

const loadAll = async () => {
  loading.charts = true;
  loading.overview = true;
  try {
    const params = rangeParams();
    const [overviewRes, trendRes, featureRes, statusRes, rankRes] = await Promise.all([
      getUsageOverview(params),
      getUsageTrend(params),
      getUsageFeatureDist(params),
      getUsageStatusDist(params),
      getUsageUserRank({ ...params, limit: 10 }),
    ]);
    overview.value = (overviewRes as any)?.data ?? defaultOverview();
    trend.value = (trendRes as any)?.data ?? [];
    featureDist.value = (featureRes as any)?.data ?? [];
    statusDist.value = (statusRes as any)?.data ?? [];
    userRank.value = (rankRes as any)?.data ?? [];
    renderTrendChart();
    renderFeatureChart();
    renderStatusChart();
  } catch {
    // http 拦截器已统一报错提示(403/500);此处保持静默,避免重复弹窗
  } finally {
    loading.charts = false;
    loading.overview = false;
  }
};

const loadEvents = async () => {
  loading.events = true;
  try {
    const res = await getUsageEvents({
      ...rangeParams(),
      eventType: filters.eventType || undefined,
      feature: filters.feature || undefined,
      status: filters.status || undefined,
      userKw: filters.userKw || undefined,
      page: events.page,
      size: events.size,
    });
    const data = (res as any)?.data;
    events.list = data?.list ?? [];
    events.total = data?.total ?? 0;
  } catch {
    // 同上:拦截器统一提示
  } finally {
    loading.events = false;
  }
};

const handleRangeChange = () => {
  events.page = 1;
  loadAll();
  loadEvents();
};

const handleFilterChange = () => {
  events.page = 1;
  loadEvents();
};

const handleSizeChange = () => {
  events.page = 1;
  loadEvents();
};

// ==================== 图表渲染 ====================

const renderTrendChart = () => {
  if (!trendChartRef.value) return;
  if (!trendChart) trendChart = echarts.init(trendChartRef.value);
  const dates = trend.value.map((item) => item.date);
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: [t('usageStats.eventsLine'), t('usageStats.usersLine')], top: 0 },
    grid: { left: 50, right: 50, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: [
      { type: 'value', name: t('usageStats.eventsLine'), minInterval: 1 },
      {
        type: 'value',
        name: t('usageStats.usersLine'),
        minInterval: 1,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: t('usageStats.eventsLine'),
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.12 },
        data: trend.value.map((item) => item.events),
      },
      {
        name: t('usageStats.usersLine'),
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: trend.value.map((item) => item.activeUsers),
      },
    ],
  });
};

const renderFeatureChart = () => {
  if (!featureChartRef.value) return;
  if (!featureChart) featureChart = echarts.init(featureChartRef.value);
  featureChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        label: { formatter: '{b}\n{d}%' },
        data: featureDist.value.map((item) => ({
          name: featureLabel(item.feature),
          value: item.events,
        })),
      },
    ],
  });
};

const renderStatusChart = () => {
  if (!statusChartRef.value) return;
  if (!statusChart) statusChart = echarts.init(statusChartRef.value);
  statusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    color: ['#67c23a', '#f56c6c', '#e6a23c'],
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        label: { formatter: '{b}\n{d}%' },
        data: statusDist.value.map((item) => ({
          name: statusLabel(item.status),
          value: item.events,
        })),
      },
    ],
  });
};

// ==================== 生命周期 ====================

onMounted(async () => {
  // 路由守卫已拦一道,此处兜底(守卫依赖同一单例,重复调用命中缓存)
  const allowed = await ensureUsageAccess();
  if (!allowed) {
    ElMessage.warning(t('usageStats.noPermission'));
    router.replace('/web/home');
    return;
  }
  window.addEventListener('resize', handleWindowResize);
  loadAll();
  loadEvents();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  trendChart?.dispose();
  featureChart?.dispose();
  statusChart?.dispose();
  trendChart = null;
  featureChart = null;
  statusChart = null;
});
</script>

<style scoped lang="scss">
.usage-stats-page {
  box-sizing: border-box;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2f3d;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  min-height: 96px;
  margin-bottom: 14px;
}

.stat-card {
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(31 45 61 / 6%);
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin: 6px 0 4px;
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1f2f3d;
}

.stat-sub {
  font-size: 12px;
  color: #b0b6bf;
}

.chart-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.chart-panel {
  min-width: 0;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(31 45 61 / 6%);
}

.chart-panel-lg {
  flex: 2;
}

.chart-panel-sm {
  flex: 1;
}

.panel-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2f3d;
}

.chart-box {
  width: 100%;
  height: 300px;
}

.detail-panel {
  margin-bottom: 14px;
}

.detail-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.detail-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.error-text {
  color: #f56c6c;
}

@media (width <=1280px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
