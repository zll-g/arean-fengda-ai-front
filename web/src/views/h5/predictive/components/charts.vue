<template>
  <div class="mobile-prediction-page">
    <div class="dashboard-header">
      <div class="title-block">
        <h2 class="dashboard-title">丰达启动锅炉实时预测</h2>
        <div class="subtitle-row">
          <van-tag type="primary" plain>{{ metadata.modelStatus || '模型状态读取中' }}</van-tag>
          <span class="subtitle-text">神经网络实时预测与 FGR 调节建议</span>
        </div>
      </div>

      <van-button
        size="small"
        icon="replay"
        type="primary"
        :loading="activeTab === 'realtime' ? realtime.loading : history.loadingPrediction"
        @click="handleTopRefresh"
      >
        刷新
      </van-button>
    </div>

    <van-tabs
      v-model:active="activeTab"
      animated
      swipeable
      class="mode-tabs"
      @change="handleModeChange"
    >
      <van-tab title="实时预测" name="realtime">
        <section class="control-card">
          <div class="control-row">
            <div>
              <p class="control-title">自动刷新</p>
              <p class="control-desc">开启后按固定间隔拉取最新预测</p>
            </div>
            <van-switch v-model="realtime.autoRefresh" size="22px" @change="syncRealtimeTimer" />
          </div>

          <div class="control-row compact">
            <span class="control-label">刷新间隔</span>
            <div class="interval-actions">
              <van-stepper
                v-model="realtime.intervalSeconds"
                integer
                :min="1"
                :max="10"
                button-size="24"
                input-width="34"
                @change="syncRealtimeTimer"
              />
              <span class="unit-text">秒</span>
            </div>
          </div>

          <div class="status-line" :class="{ error: realtime.error }">
            <span class="status-dot" />
            <span>{{ realtime.message }}</span>
          </div>
        </section>

        <section class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">输入窗口</span>
            <strong>{{
              formatTimeRange(realtime.response?.inputStart, realtime.response?.inputEnd)
            }}</strong>
          </div>

          <div class="summary-card">
            <span class="summary-label">预测窗口</span>
            <strong>{{
              formatTimeRange(realtime.response?.forecastStart, realtime.response?.forecastEnd)
            }}</strong>
          </div>

          <div class="summary-card primary">
            <span class="summary-label">输入数量</span>
            <strong>{{ realtime.response?.dataQuality?.inputCount ?? '--' }}</strong>
          </div>
        </section>

        <section class="metrics-grid">
          <div v-for="item in realtimeMetricCards" :key="item.key" class="metric-card">
            <div class="metric-header">
              <span class="metric-label">{{ item.label }}</span>
              <van-tag :type="item.tagType">{{ item.status }}</van-tag>
            </div>

            <div class="metric-value-group">
              <span class="metric-value">{{ item.value }}</span>
              <span class="metric-unit">{{ item.unit }}</span>
            </div>

            <van-progress
              :percentage="item.percentage"
              :color="item.color"
              :track-color="item.trackColor"
              stroke-width="6"
            />
          </div>
        </section>

        <FgrCard
          :recommendation="realtime.response?.fgrRecommendation"
          title="FGR 智能建议"
          empty-text="暂无实时预测反馈，请先刷新或开启自动刷新。"
        />

        <ChartCard title="输入参数趋势" tag="近 60 秒">
          <div ref="realtimeInputChartDom" class="chart-container" />
        </ChartCard>

        <ChartCard title="目标 / 预测趋势" tag="未来 60 秒">
          <div ref="realtimeTargetChartDom" class="chart-container" />
        </ChartCard>

        <!-- 设备故障预警 -->
        <section class="chart-card fault-panel-card">
          <div class="chart-header">
            <div class="fault-header-text">
              <h3 class="chart-title">设备故障预警</h3>
              <p class="fault-desc">实时监测设备运行指标，异常告警与故障记录</p>
            </div>
          </div>

          <div class="fault-filters">
            <label class="mobile-field">
              <span>年月</span>
              <select v-model="runningFaults.month" @change="onFaultMonthChange">
                <option v-for="month in runningFaults.months" :key="month" :value="month">
                  {{ formatMonthLabel(month) }}
                </option>
              </select>
            </label>

            <label class="mobile-field">
              <span>指标类型</span>
              <select v-model="runningFaults.metricType" @change="onFaultFilterChange">
                <option value="all">全部指标</option>
                <option v-for="type in runningFaults.metricTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </label>

            <van-button
              size="small"
              plain
              type="primary"
              :loading="runningFaults.loading"
              @click="loadRealtimeFaults({ resetPage: true })"
            >
              刷新
            </van-button>
          </div>

          <div class="fault-list">
            <div v-if="runningFaults.items.length === 0" class="fault-empty">
              {{ runningFaults.loading ? '正在加载' : '暂无故障记录' }}
            </div>

            <div
              v-for="item in runningFaults.items"
              :key="item.id"
              :class="['fault-card', faultLevelClass(item.level)]"
            >
              <div class="fault-card-top">
                <span class="fault-level-tag" :class="faultLevelClass(item.level)">
                  {{ faultLevelText(item.level) }}
                </span>
                <span class="fault-time">{{ formatFaultTime(item.alarmTime) }}</span>
              </div>

              <div class="fault-name">{{ item.metricName }}</div>
              <div v-if="item.detail" class="fault-detail">{{ item.detail }}</div>

              <div class="fault-metrics">
                <div class="fault-metric">
                  <span>指标类型</span>
                  <strong>{{ item.metricType }}</strong>
                </div>
                <div class="fault-metric">
                  <span>当前值</span>
                  <strong>{{ item.currentValue }}</strong>
                </div>
                <div class="fault-metric">
                  <span>正常范围</span>
                  <strong>{{ item.normalRange }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="fault-footer">
            <span class="fault-message" :class="{ error: runningFaults.error }">
              {{ runningFaults.message }}
            </span>

            <div class="fault-pagination">
              <van-button
                size="small"
                plain
                :disabled="runningFaults.page <= 1 || runningFaults.loading"
                @click="changeFaultPage(runningFaults.page - 1)"
              >
                上一页
              </van-button>
              <span class="page-info">{{ runningFaults.page }} / {{ runningFaultTotalPages }}</span>
              <van-button
                size="small"
                plain
                :disabled="runningFaults.page >= runningFaultTotalPages || runningFaults.loading"
                @click="changeFaultPage(runningFaults.page + 1)"
              >
                下一页
              </van-button>
            </div>
          </div>
        </section>
      </van-tab>

      <van-tab title="历史预测" name="history">
        <section class="control-card history-card">
          <div class="field-grid">
            <label class="mobile-field">
              <span>日期</span>
              <input v-model="history.date" type="date" />
            </label>

            <label class="mobile-field">
              <span>采样间隔</span>
              <select v-model.number="history.intervalSeconds">
                <option :value="5">5 秒</option>
                <option :value="10">10 秒</option>
                <option :value="30">30 秒</option>
                <option :value="60">60 秒</option>
              </select>
            </label>
          </div>

          <van-button
            block
            round
            type="primary"
            size="small"
            :loading="history.loadingOverview"
            @click="loadHistoryOverview"
          >
            加载单日概览
          </van-button>

          <label class="mobile-field full">
            <span>预测时间</span>
            <input v-model="history.selectedLocalTime" type="datetime-local" step="1" />
          </label>

          <div class="history-actions">
            <van-button size="small" plain type="primary" @click="moveHistory(-1)">
              前一秒
            </van-button>
            <van-button
              size="small"
              type="primary"
              :loading="history.loadingPrediction"
              @click="loadHistoryPrediction"
            >
              执行预测
            </van-button>
            <van-button size="small" plain type="primary" @click="moveHistory(1)">
              后一秒
            </van-button>
          </div>

          <div class="history-actions auto-actions">
            <van-button
              size="small"
              plain
              :type="history.autoDirection === -1 ? 'primary' : 'default'"
              @click="startHistoryAuto(-1)"
            >
              自动上推
            </van-button>
            <van-button
              size="small"
              plain
              :type="history.autoDirection === 1 ? 'primary' : 'default'"
              @click="startHistoryAuto(1)"
            >
              自动下推
            </van-button>
            <van-button
              size="small"
              plain
              type="danger"
              :disabled="history.autoDirection === 0"
              @click="stopHistoryAuto('自动步进已停止。')"
            >
              停止
            </van-button>
          </div>

          <div class="control-row compact">
            <span class="control-label">步进速度</span>
            <select
              v-model.number="history.autoIntervalMs"
              class="mini-select"
              @change="syncHistoryAutoTimer"
            >
              <option :value="200">200ms</option>
              <option :value="400">400ms</option>
              <option :value="600">600ms</option>
              <option :value="800">800ms</option>
              <option :value="1000">1000ms</option>
            </select>
          </div>

          <div class="status-line" :class="{ error: history.error }">
            <span class="status-dot" />
            <span>{{ history.message }}</span>
          </div>
        </section>

        <section class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">输入窗口</span>
            <strong>{{
              formatTimeRange(history.response?.inputStart, history.response?.inputEnd)
            }}</strong>
          </div>

          <div class="summary-card">
            <span class="summary-label">预测窗口</span>
            <strong>{{
              formatTimeRange(history.response?.forecastStart, history.response?.forecastEnd)
            }}</strong>
          </div>

          <div class="summary-card primary">
            <span class="summary-label">采样点</span>
            <strong>{{ history.overview?.sampleCount ?? '--' }}</strong>
          </div>
        </section>

        <section class="metrics-grid">
          <div v-for="item in historyMetricCards" :key="item.key" class="metric-card">
            <div class="metric-header">
              <span class="metric-label">{{ item.label }}</span>
              <van-tag :type="item.tagType">{{ item.status }}</van-tag>
            </div>

            <div class="metric-value-group">
              <span class="metric-value">{{ item.value }}</span>
              <span class="metric-unit">{{ item.unit }}</span>
            </div>

            <van-progress
              :percentage="item.percentage"
              :color="item.color"
              :track-color="item.trackColor"
              stroke-width="6"
            />
          </div>
        </section>

        <FgrCard
          :recommendation="history.response?.fgrRecommendation"
          title="历史快照建议"
          empty-text="请在概览图点击采样点，或选择精准时间后执行预测。"
        />

        <ChartCard
          title="单日全景数据概览"
          :tag="history.overview ? history.overview.sampleCount + ' 点' : '待加载'"
        >
          <div ref="overviewChartDom" class="chart-container overview" />
        </ChartCard>

        <ChartCard title="输入参数趋势" tag="历史切片">
          <div ref="historyInputChartDom" class="chart-container" />
        </ChartCard>

        <ChartCard title="目标 / 预测趋势" tag="历史预测">
          <div ref="historyTargetChartDom" class="chart-container" />
        </ChartCard>
      </van-tab>
    </van-tabs>

    <div class="update-time">数据更新时间：{{ updateTime || '--' }}</div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  resolveComponent,
} from 'vue';
import { showToast } from 'vant';

interface PointMeta {
  pointName: string;
  label: string;
  unit?: string;
  displayOrder: number;
  isModelInput?: boolean;
  isModelTarget?: boolean;
  snapshotPropertyName: string;
  lowScale?: number | string;
  highScale?: number | string;
}

interface SnapshotRecord {
  recordedAt: string;
  [key: string]: unknown;
}

interface ForecastPoint {
  timestamp: string;
  value: number | string;
}

interface ForecastSeries {
  pointName: string;
  points: ForecastPoint[];
}

interface PredictionResponse {
  inputStart?: string;
  inputEnd?: string;
  forecastStart?: string;
  forecastEnd?: string;
  dataQuality?: {
    inputCount?: number;
  };
  inputData?: SnapshotRecord[];
  actualFutureData?: SnapshotRecord[];
  forecast?: {
    series?: ForecastSeries[];
  };
  fgrRecommendation?: FgrRecommendation;
}

interface FgrRecommendation {
  level?: number | string;
  title?: string;
  detail?: string;
  currentValvePct?: number | string;
  suggestedValvePct?: number | string;
  currentFanHz?: number | string;
  suggestedFanHz?: number | string;
}

interface HistoryOverview {
  sampleCount: number;
  samples: SnapshotRecord[];
}

interface ChartSeriesItem {
  key: string;
  point: PointMeta;
  label: string;
  color: string;
  points: Array<{ timestamp: string; value: number }>;
  dashed: boolean;
}

type ModeTab = 'realtime' | 'history';
type ChartKey = 'overview' | 'realtimeInput' | 'realtimeTarget' | 'historyInput' | 'historyTarget';
type TagType = 'primary' | 'success' | 'danger' | 'warning';

const chartColors = [
  '#4A90E2',
  '#52C41A',
  '#FF9500',
  '#FF4D4F',
  '#722ED1',
  '#13C2C2',
  '#2F80ED',
  '#FAAD14',
];

const metricColorList = [
  { color: '#FF9500', trackColor: '#FFF3E0' },
  { color: '#4A90E2', trackColor: '#E3F2FD' },
  { color: '#52C41A', trackColor: '#F6FFED' },
  { color: '#722ED1', trackColor: '#F9F0FF' },
];

const activeTab = ref<ModeTab>('realtime');
const updateTime = ref('');
const metadata = ref<{ modelStatus: string; points: PointMeta[] }>({
  modelStatus: '',
  points: [],
});

const realtime = reactive({
  autoRefresh: true,
  intervalSeconds: 2,
  timer: null as ReturnType<typeof window.setInterval> | null,
  loading: false,
  fetching: false,
  error: false,
  message: '等待数据接收',
  response: null as PredictionResponse | null,
});

const history = reactive({
  date: '',
  intervalSeconds: 10,
  autoIntervalMs: 400,
  autoDirection: 0,
  autoTimer: null as ReturnType<typeof window.setInterval> | null,
  selectedLocalTime: '',
  loadingOverview: false,
  loadingPrediction: false,
  error: false,
  message: '等待加载单日历史快照',
  overview: null as HistoryOverview | null,
  response: null as PredictionResponse | null,
});

const runningFaults = reactive({
  month: formatChinaMonth(new Date()),
  months: [formatChinaMonth(new Date())],
  metricType: 'all',
  metricTypes: [] as string[],
  page: 1,
  pageSize: 5,
  total: 0,
  items: [] as any[],
  loading: false,
  error: false,
  message: '',
});

const overviewChartDom = ref<HTMLElement | null>(null);
const realtimeInputChartDom = ref<HTMLElement | null>(null);
const realtimeTargetChartDom = ref<HTMLElement | null>(null);
const historyInputChartDom = ref<HTMLElement | null>(null);
const historyTargetChartDom = ref<HTMLElement | null>(null);

const chartInstances: Record<ChartKey, echarts.ECharts | null> = {
  overview: null,
  realtimeInput: null,
  realtimeTarget: null,
  historyInput: null,
  historyTarget: null,
};

const overviewPoints = computed(() => {
  return metadata.value.points.slice().sort((a, b) => a.displayOrder - b.displayOrder);
});

const inputPoints = computed(() => {
  return metadata.value.points
    .filter((item) => item.isModelInput)
    .sort((a, b) => a.displayOrder - b.displayOrder);
});

const targetPoints = computed(() => {
  return metadata.value.points
    .filter((item) => item.isModelTarget)
    .sort((a, b) => a.displayOrder - b.displayOrder);
});

const dashboardPoints = computed(() => {
  const merged = inputPoints.value.concat(targetPoints.value);
  return merged.length ? merged.slice(0, 4) : [];
});

const realtimeMetricCards = computed(() => buildMetricCards(realtime.response));
const historyMetricCards = computed(() => buildMetricCards(history.response));
const runningFaultTotalPages = computed(() =>
  Math.max(1, Math.ceil(runningFaults.total / runningFaults.pageSize)),
);

const ChartCard = defineComponent({
  props: {
    title: { type: String, required: true },
    tag: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () =>
      h('section', { class: 'chart-card' }, [
        h('div', { class: 'chart-header' }, [
          h('h3', { class: 'chart-title' }, props.title),
          props.tag ? h('span', { class: 'chart-tag' }, props.tag) : null,
        ]),
        slots.default?.(),
      ]);
  },
});

const FgrCard = defineComponent({
  props: {
    recommendation: {
      type: Object as () => FgrRecommendation | undefined,
      default: undefined,
    },
    title: { type: String, required: true },
    emptyText: { type: String, required: true },
  },
  setup(props) {
    const VanIcon = resolveComponent('van-icon');
    const VanTag = resolveComponent('van-tag');

    return () => {
      const rec = props.recommendation;
      const levelClass = fgrLevelClass(rec);

      return h('section', { class: ['ai-suggestions-card', 'fgr-card', levelClass] }, [
        h('div', { class: 'card-header' }, [
          h('h3', { class: 'card-title' }, [h(VanIcon, { name: 'bulb-o' }), props.title]),
          h(VanTag, { type: fgrTagType(rec), size: 'medium' }, () => levelClass.toUpperCase()),
        ]),
        h('div', { class: 'fgr-main' }, [
          h('p', { class: 'suggestion-title' }, rec?.title || '等待预测结果'),
          h('p', { class: 'suggestion-desc' }, rec?.detail || props.emptyText),
        ]),
        h('div', { class: 'metric-list' }, [
          renderFgrMetric('当前阀位', formatFgrValue(rec?.currentValvePct, '%')),
          renderFgrMetric('建议阀位', formatFgrValue(rec?.suggestedValvePct, '%'), true),
          renderFgrMetric('当前频率', formatFgrValue(rec?.currentFanHz, 'Hz')),
          renderFgrMetric('建议频率', formatFgrValue(rec?.suggestedFanHz, 'Hz'), true),
        ]),
      ]);
    };
  },
});

function renderFgrMetric(label: string, value: string, suggested = false) {
  return h('div', { class: ['fgr-metric-item', { suggested }] }, [
    h('span', label),
    h('strong', value),
  ]);
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';

  const number = Number(value);
  if (Math.abs(number) >= 100) return number.toFixed(1);
  if (Math.abs(number) >= 10) return number.toFixed(2);
  return number.toFixed(3);
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').split('+')[0] : '';
}

function formatTimeRange(start?: string, end?: string) {
  const startText = start ? start.slice(11, 19) : '--';
  const endText = end ? end.slice(11, 19) : '--';
  return `${startText} - ${endText}`;
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toLocalInputValue(isoText?: string) {
  return isoText ? isoText.slice(0, 19) : '';
}

function toChinaApiTime(localValue: string) {
  return localValue ? `${localValue}+08:00` : '';
}

function getDatePart(localValue: string) {
  return localValue ? localValue.slice(0, 10) : '';
}

function formatChinaLocalInput(date: Date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function shiftLocalSeconds(localValue: string, seconds: number) {
  if (!localValue) return '';

  const date = new Date(`${localValue}+08:00`);
  return formatChinaLocalInput(new Date(date.getTime() + seconds * 1000));
}

async function apiGet<T = any>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json();

  if (String(payload.code) !== '200') {
    const error = new Error(payload.message || `接口返回业务码 ${payload.code}`) as Error & {
      code?: string | number;
    };
    error.code = payload.code;
    throw error;
  }

  return payload.data;
}

function valueFromSnapshot(snapshot: SnapshotRecord | undefined, point: PointMeta) {
  if (!snapshot) return null;

  const value = Number(snapshot[point.snapshotPropertyName]);
  return Number.isFinite(value) ? value : null;
}

function buildSnapshotSeries(
  snapshots: SnapshotRecord[] = [],
  points: PointMeta[],
  suffix = '',
): ChartSeriesItem[] {
  return points.map((point, index) => {
    const rawPoints = snapshots
      .map((snapshot) => ({
        timestamp: snapshot.recordedAt,
        value: valueFromSnapshot(snapshot, point),
      }))
      .filter((item): item is { timestamp: string; value: number } => item.value !== null);

    return {
      key: `${point.pointName}${suffix}`,
      point,
      label: suffix ? `${point.label}${suffix}` : point.label,
      color: chartColors[index % chartColors.length],
      points: rawPoints,
      dashed: false,
    };
  });
}

function buildForecastSeries(
  forecast: PredictionResponse['forecast'],
  points: PointMeta[],
  colorOffset = 0,
) {
  if (!forecast?.series?.length) return [];

  return points
    .map((point, index) => {
      const series = forecast.series?.find(
        (item) => item.pointName.toLowerCase() === point.pointName.toLowerCase(),
      );

      if (!series) return null;

      return {
        key: `${point.pointName}:forecast`,
        point,
        label: `${point.label}预测`,
        color: chartColors[(index + colorOffset) % chartColors.length],
        points: series.points.map((item) => ({
          timestamp: item.timestamp,
          value: Number(item.value),
        })),
        dashed: true,
      };
    })
    .filter(Boolean) as ChartSeriesItem[];
}

function getFixedRange(point: PointMeta) {
  const min = Number(point.lowScale);
  const max = Number(point.highScale);

  return Number.isFinite(min) && Number.isFinite(max) && max > min ? { min, max } : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getLatestPointValue(response: PredictionResponse | null, point: PointMeta) {
  const snapshotGroups = [response?.inputData ?? [], response?.actualFutureData ?? []];

  for (const snapshots of snapshotGroups) {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      const value = valueFromSnapshot(snapshots[index], point);
      if (value !== null) return value;
    }
  }

  return null;
}

function buildMetricCards(response: PredictionResponse | null) {
  const cards = dashboardPoints.value.map((point, index) => {
    const value = getLatestPointValue(response, point);
    const range = getFixedRange(point);
    const percentage =
      range && value !== null ? clamp(((value - range.min) / (range.max - range.min)) * 100) : 0;
    const warning = range && value !== null ? value < range.min || value > range.max : false;
    const colorItem = metricColorList[index % metricColorList.length];

    return {
      key: point.pointName,
      label: point.label,
      value: formatNumber(value),
      unit: point.unit || '',
      percentage: Math.round(percentage),
      status: warning ? '预警' : value === null ? '待更新' : '正常',
      tagType: (warning ? 'warning' : value === null ? 'primary' : 'success') as TagType,
      color: colorItem.color,
      trackColor: colorItem.trackColor,
    };
  });

  if (cards.length) return cards;

  return [0, 1, 2, 3].map((index) => {
    const colorItem = metricColorList[index];

    return {
      key: `empty-${index}`,
      label: '等待测点数据',
      value: '--',
      unit: '',
      percentage: 0,
      status: '待更新',
      tagType: 'primary' as TagType,
      color: colorItem.color,
      trackColor: colorItem.trackColor,
    };
  });
}

function fgrLevelClass(rec?: FgrRecommendation) {
  const level = rec?.level ?? 'unavailable';
  const names = ['unavailable', 'normal', 'watch', 'warning', 'danger'];
  const numericLevel = Number(level);

  if (Number.isInteger(numericLevel) && names[numericLevel]) return names[numericLevel];

  return String(level).toLowerCase();
}

function fgrTagType(rec?: FgrRecommendation): TagType {
  const level = fgrLevelClass(rec);

  if (level === 'normal') return 'success';
  if (level === 'warning') return 'warning';
  if (level === 'danger') return 'danger';
  return 'primary';
}

function formatFgrValue(value: unknown, unit: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '--';

  return `${formatNumber(number)} ${unit}`;
}

function createEChartsLine(
  domElement: HTMLElement | null,
  seriesList: ChartSeriesItem[],
  clickCallback?: any,
) {
  if (!domElement) return null;

  const allTimestamps = Array.from(
    new Set(seriesList.flatMap((series) => series.points.map((point) => point.timestamp))),
  ).sort();

  const rangeByPoint = new Map<string, { min: number; max: number }>();

  for (const series of seriesList) {
    const key = series.point.pointName;
    const fixedRange = getFixedRange(series.point);

    if (fixedRange) {
      rangeByPoint.set(key, fixedRange);
      continue;
    }

    const values = series.points
      .map((point) => point.value)
      .filter((value) => Number.isFinite(value));

    if (!values.length) continue;

    const existing = rangeByPoint.get(key);
    const min = Math.min(...values, existing?.min ?? Number.POSITIVE_INFINITY);
    const max = Math.max(...values, existing?.max ?? Number.NEGATIVE_INFINITY);

    rangeByPoint.set(key, { min, max });
  }

  const echartsSeries = seriesList.map((series) => {
    const range = rangeByPoint.get(series.point.pointName) ?? { min: 0, max: 1 };
    const isConstant = Math.abs(range.max - range.min) < 1e-9;
    const valuesMap = new Map(series.points.map((point) => [point.timestamp, point.value]));

    return {
      name: series.label,
      type: 'line',
      data: allTimestamps.map((time) => {
        const actual = valuesMap.get(time);

        if (actual === undefined || actual === null || !Number.isFinite(actual)) {
          return [time, null, null, series.point.unit];
        }

        const normalized = isConstant ? 50 : ((actual - range.min) / (range.max - range.min)) * 100;
        return [time, normalized, actual, series.point.unit];
      }),
      showSymbol: allTimestamps.length <= 80,
      symbolSize: 5,
      smooth: 0.22,
      connectNulls: false,
      emphasis: {
        focus: 'series',
      },
      lineStyle: {
        width: series.dashed ? 2 : 2.4,
        type: series.dashed ? 'dashed' : 'solid',
        color: series.color,
      },
      itemStyle: {
        color: series.color,
        borderWidth: 1,
        borderColor: '#ffffff',
      },
      areaStyle: series.dashed ? undefined : { opacity: 0.06 },
    };
  });

  const instance = echarts.getInstanceByDom(domElement) || echarts.init(domElement);
  const oldOption: any = instance.getOption?.();
  const oldSelected = oldOption?.legend?.[0]?.selected;

  instance.setOption(
    {
      backgroundColor: 'transparent',
      color: chartColors,
      animationDuration: 260,
      grid: {
        left: 8,
        right: 14,
        top: 24,
        bottom: 52,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        borderColor: 'transparent',
        padding: [8, 10],
        textStyle: {
          color: '#fff',
          fontSize: 12,
        },
        formatter: (params: any[]) => {
          if (!params.length) return '';

          let html = `<div style="font-weight:700;margin-bottom:6px;">${formatTime(
            params[0].value[0],
          )}</div>`;

          params.forEach((item) => {
            const actualVal = item.value[2];
            const unitStr = item.value[3] ? ` ${item.value[3]}` : '';

            if (actualVal !== null) {
              html += `
                <div style="display:flex;align-items:center;justify-content:space-between;min-width:180px;margin:4px 0;gap:12px;">
                  <span>${item.marker}${item.seriesName}</span>
                  <strong>${formatNumber(actualVal)}${unitStr}</strong>
                </div>
              `;
            }
          });

          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        itemWidth: 12,
        itemHeight: 8,
        icon: 'roundRect',
        selected: oldSelected || undefined,
        textStyle: {
          color: '#666',
          fontSize: 11,
        },
        pageIconColor: '#4A90E2',
        pageIconInactiveColor: '#d9d9d9',
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#e8e8e8',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#999',
          fontSize: 10,
          formatter: (value: string) => (value ? value.slice(11, 19) : ''),
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: '归一化',
        nameTextStyle: {
          color: '#999',
          fontSize: 10,
        },
        axisLabel: {
          color: '#999',
          fontSize: 10,
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed',
          },
        },
      },
      graphic:
        allTimestamps.length === 0
          ? {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: '暂无图表数据',
                fill: '#999',
                fontSize: 13,
              },
            }
          : undefined,
      series: echartsSeries,
    },
    {
      notMerge: true,
      lazyUpdate: true,
    },
  );

  instance.off('click');

  if (clickCallback) {
    instance.on('click', (params: any) => {
      if (params.value?.[0]) clickCallback(params.value[0]);
    });
  }

  return instance;
}

function handleResize() {
  Object.values(chartInstances).forEach((instance) => instance?.resize());
}

function resizeChartsLater() {
  window.setTimeout(handleResize, 120);
}

async function handleModeChange(name: string | number) {
  await switchTab(name as ModeTab);
}

async function switchTab(tabName: ModeTab) {
  if (tabName !== 'history') stopHistoryAuto();

  activeTab.value = tabName;

  await nextTick();
  window.setTimeout(() => {
    rerenderCharts();
    handleResize();
  }, 180);
}

async function handleTopRefresh() {
  if (activeTab.value === 'realtime') {
    await refreshRealtime(false);
    return;
  }

  await loadHistoryPrediction();
}

async function refreshRealtime(silent = false) {
  if (realtime.fetching) return;

  realtime.fetching = true;

  if (!silent) {
    realtime.loading = true;
    realtime.error = false;
    realtime.message = '正在刷新实时数据...';
  }

  try {
    const data = await apiGet<PredictionResponse>('/network/api/predictions/latest');

    realtime.response = data;
    realtime.error = false;
    realtime.message = `同步成功：${formatTime(data.inputEnd) || '--'}`;
    updateTime.value = formatDateTime(new Date());

    await nextTick();
    renderRealtimeCharts();
    resizeChartsLater();

    if (!silent) showToast('实时数据已更新');
  } catch (error: any) {
    if (!silent) {
      realtime.error = true;
      realtime.message = error.message;
      showToast(error.message || '实时数据刷新失败');
    } else {
      console.warn('实时数据静默刷新失败：', error);
    }
  } finally {
    realtime.fetching = false;
    realtime.loading = false;
  }
}

function syncRealtimeTimer() {
  stopRealtimeTimer();

  if (realtime.autoRefresh) {
    refreshRealtime(true);

    realtime.timer = window.setInterval(() => {
      refreshRealtime(true);
    }, realtime.intervalSeconds * 1000);
  }
}

function stopRealtimeTimer() {
  if (realtime.timer) {
    window.clearInterval(realtime.timer);
    realtime.timer = null;
  }
}

async function loadHistoryOverview() {
  if (!history.date) {
    history.error = true;
    history.message = '请确定具体回溯日期';
    showToast(history.message);
    return;
  }

  history.loadingOverview = true;
  history.error = false;

  try {
    const query = new URLSearchParams({
      date: history.date,
      intervalSeconds: String(history.intervalSeconds),
    });

    history.overview = await apiGet<HistoryOverview>(`/network/api/history/day/overview?${query}`);
    history.message = `全景总览载入完毕，共 ${history.overview.sampleCount} 帧`;
    updateTime.value = formatDateTime(new Date());

    await nextTick();
    renderOverviewChart();
    resizeChartsLater();
  } catch (error: any) {
    history.error = true;
    history.message = error.message;
    showToast(error.message || '历史概览加载失败');
  } finally {
    history.loadingOverview = false;
  }
}

async function loadHistoryPrediction() {
  if (!history.selectedLocalTime) {
    history.error = true;
    history.message = '请指定具体历史切片时间';
    showToast(history.message);
    return false;
  }

  history.loadingPrediction = true;
  history.error = false;

  try {
    const time = encodeURIComponent(toChinaApiTime(history.selectedLocalTime));

    history.response = await apiGet<PredictionResponse>(
      `/network/api/predictions/history?time=${time}`,
    );
    history.message = `断点预测成功：${formatTimeRange(
      history.response.inputStart,
      history.response.forecastEnd,
    )}`;
    updateTime.value = formatDateTime(new Date());

    await nextTick();
    renderHistoryCharts();
    resizeChartsLater();

    return true;
  } catch (error: any) {
    history.error = true;
    history.message = error.message;
    showToast(error.message || '历史预测失败');

    return false;
  } finally {
    history.loadingPrediction = false;
  }
}

function moveHistory(seconds: number) {
  stepHistory(seconds);
}

async function stepHistory(seconds: number) {
  if (history.loadingPrediction) return;

  if (!history.selectedLocalTime) {
    history.error = true;
    history.message = '时间戳异常';
    stopHistoryAuto();
    return;
  }

  history.selectedLocalTime = shiftLocalSeconds(history.selectedLocalTime, seconds);

  const success = await loadHistoryPrediction();

  if (!success && history.autoDirection !== 0) {
    stopHistoryAuto('因请求失败，自动步进终止');
  }
}

function startHistoryAuto(direction: -1 | 1) {
  if (!history.selectedLocalTime) {
    history.error = true;
    history.message = '请选择时序起点';
    showToast(history.message);
    return;
  }

  stopHistoryAuto();

  history.autoDirection = direction;
  history.message = direction > 0 ? '时序正向自增中...' : '时序逆向自减中...';

  stepHistory(direction);
  syncHistoryAutoTimer();
}

function syncHistoryAutoTimer() {
  if (history.autoTimer) {
    window.clearInterval(history.autoTimer);
    history.autoTimer = null;
  }

  if (history.autoDirection !== 0) {
    const direction = history.autoDirection;

    history.autoTimer = window.setInterval(() => {
      stepHistory(direction);
    }, history.autoIntervalMs);
  }
}

function stopHistoryAuto(msg = '') {
  if (history.autoTimer) {
    window.clearInterval(history.autoTimer);
    history.autoTimer = null;
  }

  history.autoDirection = 0;

  if (msg) history.message = msg;
}

function rerenderCharts() {
  renderOverviewChart();
  renderRealtimeCharts();
  renderHistoryCharts();
}

function renderOverviewChart() {
  if (!overviewChartDom.value || !history.overview) return;

  const series = buildSnapshotSeries(history.overview.samples, overviewPoints.value);

  chartInstances.overview = createEChartsLine(
    overviewChartDom.value,
    series,
    (clickedTime: string | undefined) => {
      history.selectedLocalTime = toLocalInputValue(clickedTime);
      loadHistoryPrediction();
    },
  );
}

function renderRealtimeCharts() {
  if (!realtime.response) return;

  renderPredictionCharts(
    'realtime',
    realtime.response,
    realtimeInputChartDom.value,
    realtimeTargetChartDom.value,
  );
}

function renderHistoryCharts() {
  if (!history.response) return;

  renderPredictionCharts(
    'history',
    history.response,
    historyInputChartDom.value,
    historyTargetChartDom.value,
  );
}

function renderPredictionCharts(
  prefix: 'realtime' | 'history',
  response: PredictionResponse,
  inputDom: HTMLElement | null,
  targetDom: HTMLElement | null,
) {
  const inputKey = `${prefix}Input` as ChartKey;
  const targetKey = `${prefix}Target` as ChartKey;

  if (inputDom) {
    const inputSeries = buildSnapshotSeries(response.inputData ?? [], inputPoints.value);
    chartInstances[inputKey] = createEChartsLine(inputDom, inputSeries);
  }

  if (targetDom) {
    const actualSeries = buildSnapshotSeries(
      response.actualFutureData ?? [],
      targetPoints.value,
      '实际',
    );
    const forecastSeries = buildForecastSeries(response.forecast, targetPoints.value);
    chartInstances[targetKey] = createEChartsLine(targetDom, actualSeries.concat(forecastSeries));
  }
}

function formatChinaMonth(date: Date) {
  return formatChinaLocalInput(date).slice(0, 7).replace('-', '');
}

function formatMonthLabel(month: string) {
  return month && month.length === 6 ? `${month.slice(0, 4)}-${month.slice(4, 6)}` : '--';
}

function formatFaultTime(value: string) {
  return value ? value.replace('T', ' ').replace('+08:00', '') : '--';
}

function faultLevelText(level: string) {
  return level === 'fault' ? '故障' : '预警';
}

function faultLevelClass(level: string) {
  return level === 'fault' ? 'level-fault' : 'level-warning';
}

async function onFaultMonthChange() {
  await loadFaultOptions();
  await loadRealtimeFaults({ resetPage: true });
}

async function onFaultFilterChange() {
  await loadRealtimeFaults({ resetPage: true });
}

async function changeFaultPage(page: number) {
  const targetPage = Math.min(Math.max(1, page), runningFaultTotalPages.value);
  if (targetPage === runningFaults.page) return;

  runningFaults.page = targetPage;
  await loadRealtimeFaults();
}

async function loadFaultOptions() {
  try {
    const query = new URLSearchParams({ month: runningFaults.month });
    const options = await apiGet<{
      months?: string[];
      currentMonth?: string;
      metricTypes?: string[];
    }>('/network/api/running-faults/options?' + query.toString());
    const months = options.months?.length
      ? options.months
      : [options.currentMonth || runningFaults.month];

    runningFaults.months = months.includes(runningFaults.month)
      ? months
      : [runningFaults.month, ...months];
    runningFaults.metricTypes = options.metricTypes ?? [];

    if (!runningFaults.month && options.currentMonth) {
      runningFaults.month = options.currentMonth;
    }

    if (
      runningFaults.metricType !== 'all' &&
      !runningFaults.metricTypes.includes(runningFaults.metricType)
    ) {
      runningFaults.metricType = 'all';
    }
  } catch (error) {
    console.warn('Failed to load fault options:', error);
  }
}

async function loadRealtimeFaults(options: { resetPage?: boolean; silent?: boolean } = {}) {
  const { resetPage = false, silent = false } = options;

  if (resetPage) {
    runningFaults.page = 1;
  }

  if (!silent) {
    runningFaults.loading = true;
  }

  runningFaults.error = false;

  try {
    const query = new URLSearchParams({
      month: runningFaults.month,
      metricType: runningFaults.metricType,
      page: String(runningFaults.page),
      pageSize: String(runningFaults.pageSize),
    });
    const result = await apiGet<any>('/network/api/running-faults?' + query.toString());
    runningFaults.month = result.month;
    runningFaults.metricType = result.metricType;
    runningFaults.page = result.page;
    runningFaults.pageSize = result.pageSize;
    runningFaults.total = result.total;
    runningFaults.items = result.items ?? [];
    runningFaults.message = `共 ${result.total} 条记录`;
  } catch (error: any) {
    runningFaults.error = true;
    runningFaults.message = error.message;
  } finally {
    runningFaults.loading = false;
  }
}

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  updateTime.value = formatDateTime(new Date());
  syncRealtimeTimer();
  try {
    metadata.value = await apiGet<{ modelStatus: string; points: PointMeta[] }>(
      '/network/api/metadata/points',
    );

    await refreshRealtime(true);

    await loadFaultOptions();
    await loadRealtimeFaults({ resetPage: true, silent: true });

    const latest = await apiGet<SnapshotRecord[]>('/network/api/history/latest?count=1');

    if (latest.length > 0) {
      const selected = shiftLocalSeconds(toLocalInputValue(latest[0].recordedAt), -60);

      history.selectedLocalTime = selected;
      history.date = getDatePart(selected);

      await loadHistoryOverview();
      await loadHistoryPrediction();
    } else {
      history.date = formatChinaLocalInput(new Date()).slice(0, 10);
    }

    await nextTick();
    rerenderCharts();
    resizeChartsLater();
  } catch (error: any) {
    realtime.error = true;
    realtime.message = error.message;
    history.error = true;
    history.message = error.message;
    showToast(error.message || '页面初始化失败');
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);

  stopRealtimeTimer();
  stopHistoryAuto();

  (Object.keys(chartInstances) as ChartKey[]).forEach((key) => {
    chartInstances[key]?.dispose();
    chartInstances[key] = null;
  });
});
</script>

<style scoped>
.mobile-prediction-page {
  --primary: #4f65db;
  --primary-light: #eef2ff;
  --primary-soft: #f4f6ff;
  --success: #22c55e;
  --warning: #ff9500;
  --danger: #ff4d4f;
  --text: #1f2937;
  --text-strong: #111827;
  --muted: #8a94a6;
  --border: #eef1f6;
  --card: #fff;
  --bg: #f5f7fb;
  --shadow: 0 8px 24px rgb(36 49 91 / 8%);

  box-sizing: border-box;
  min-height: 100dvh;
  padding: 14px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  overflow-x: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at 0 0, rgb(79 101 219 / 14%) 0, transparent 280px),
    linear-gradient(180deg, #f8faff 0%, #f5f7fb 42%, #f7f8fa 100%);
}

.mobile-prediction-page * {
  box-sizing: border-box;
}

/* 顶部标题 */
.dashboard-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 6px 0 12px;
  margin-bottom: 8px;
}

.title-block {
  min-width: 0;
}

.dashboard-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--text-strong);
  letter-spacing: -0.2px;
}

.subtitle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.subtitle-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}

.dashboard-header :deep(.van-button) {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 12px;
  font-weight: 600;
  border: 0;
  border-radius: 999px;
  box-shadow: 0 8px 16px rgb(79 101 219 / 22%);
}

/* Tabs */
.mode-tabs {
  background: transparent;
}

:deep(.van-tabs__wrap) {
  height: auto;
  padding: 0;
  margin-bottom: 14px;
}

:deep(.van-tabs__nav) {
  padding: 5px;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 14px;
  box-shadow: var(--shadow);
}

:deep(.van-tab) {
  height: 36px;
  font-size: 15px;
  font-weight: 700;
  color: #7b8497;
  border-radius: 11px;
}

:deep(.van-tab--active) {
  color: #fff;
  background: linear-gradient(135deg, #6277f0 0%, #4f65db 100%);
  box-shadow: 0 8px 16px rgb(79 101 219 / 22%);
}

:deep(.van-tabs__line) {
  display: none;
}

:deep(.van-tabs__content) {
  overflow: visible;
}

/* 通用卡片 */
.control-card,
.summary-card,
.metric-card,
.chart-card,
.ai-suggestions-card {
  background: rgb(255 255 255 / 94%);
  border: 1px solid rgb(255 255 255 / 80%);
  border-radius: 18px;
  box-shadow: var(--shadow);
}

/* 控制区 */
.control-card {
  padding: 16px;
  margin-bottom: 14px;
}

.control-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.control-row + .control-row,
.control-row + .status-line {
  margin-top: 12px;
}

.control-row.compact {
  min-height: 34px;
  padding: 10px 12px;
  background: #f7f8fc;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.control-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-strong);
}

.control-desc,
.control-label,
.unit-text {
  font-size: 12px;
  color: var(--muted);
}

.interval-actions {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

:deep(.van-switch--on) {
  background: linear-gradient(135deg, #6277f0 0%, #4f65db 100%);
}

:deep(.van-stepper__minus),
:deep(.van-stepper__plus) {
  color: var(--primary);
  background: var(--primary-light);
  border-radius: 8px;
}

:deep(.van-stepper__input) {
  color: var(--text-strong);
  background: #fff;
  border-radius: 8px;
}

/* 状态提示 */
.status-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 11px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #64748b;
  background: linear-gradient(135deg, #f8faff 0%, #f7f8fc 100%);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.status-line.error {
  color: var(--danger);
  background: #fff5f5;
  border-color: #ffe0e0;
}

.status-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(79 101 219 / 12%);
}

.status-line.error .status-dot {
  background: var(--danger);
  box-shadow: 0 0 0 4px rgb(255 77 79 / 12%);
}

/* 概览卡片 */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-card {
  position: relative;
  min-width: 0;
  padding: 14px 12px;
  overflow: hidden;
}

.summary-card::after {
  position: absolute;
  right: -18px;
  bottom: -18px;
  width: 52px;
  height: 52px;
  content: '';
  background: rgb(79 101 219 / 7%);
  border-radius: 50%;
}

.summary-label {
  position: relative;
  z-index: 1;
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--muted);
}

.summary-card strong {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-strong);
  white-space: nowrap;
}

.summary-card.primary {
  background: linear-gradient(135deg, #6277f0 0%, #4f65db 100%);
}

.summary-card.primary .summary-label,
.summary-card.primary strong {
  color: #fff;
}

.summary-card.primary::after {
  background: rgb(255 255 255 / 16%);
}

.summary-card.primary strong {
  font-size: 22px;
}

/* 指标卡片 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.metric-card {
  position: relative;
  min-width: 0;
  padding: 15px;
  overflow: hidden;
}

.metric-card::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  content: '';
  background: linear-gradient(90deg, #6277f0, #8ea0ff);
}

.metric-header {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 13px;
}

.metric-label {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.45;
  color: #697386;
  -webkit-box-orient: vertical;
}

.metric-value-group {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  min-width: 0;
  margin-bottom: 13px;
}

.metric-value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 27px;
  font-weight: 850;
  line-height: 1;
  color: var(--text-strong);
  letter-spacing: -0.4px;
  white-space: nowrap;
}

.metric-unit {
  flex: 0 0 auto;
  margin-left: 5px;
  font-size: 12px;
  color: var(--muted);
}

:deep(.van-tag) {
  border-radius: 999px;
}

:deep(.van-progress) {
  overflow: hidden;
  border-radius: 999px;
}

/* FGR 建议 */
.ai-suggestions-card {
  padding: 15px;
  margin-bottom: 14px;
}

.card-header,
.chart-header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title,
.chart-title {
  display: flex;
  gap: 7px;
  align-items: center;
  min-width: 0;
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-strong);
}

.fgr-card {
  position: relative;
  overflow: hidden;
  border-left: 0;
}

.fgr-card::before {
  position: absolute;
  top: 16px;
  left: 0;
  width: 4px;
  height: 44px;
  content: '';
  background: #cbd5e1;
  border-radius: 0 999px 999px 0;
}

.fgr-card.normal::before {
  background: var(--success);
}

.fgr-card.watch::before {
  background: var(--primary);
}

.fgr-card.warning::before {
  background: var(--warning);
}

.fgr-card.danger::before {
  background: var(--danger);
}

.fgr-main {
  padding: 13px;
  background: linear-gradient(135deg, rgb(79 101 219 / 7%) 0%, rgb(79 101 219 / 3%) 100%), #f8faff;
  border: 1px solid #eef2ff;
  border-radius: 14px;
}

.suggestion-title {
  margin: 0 0 7px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--text-strong);
}

.suggestion-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.75;
  color: #697386;
}

.metric-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.fgr-metric-item {
  min-width: 0;
  padding: 11px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 13px;
}

.fgr-metric-item span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--muted);
}

.fgr-metric-item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Consolas, Monaco, monospace;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-strong);
  white-space: nowrap;
}

.fgr-metric-item.suggested {
  background: var(--primary-soft);
  border-color: #dde4ff;
}

.fgr-metric-item.suggested strong {
  color: var(--primary);
}

/* 图表卡片 */
.chart-card {
  padding: 15px;
  margin-bottom: 14px;
}

.chart-header {
  margin-bottom: 12px;
}

.chart-tag {
  flex: 0 0 auto;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  border-radius: 999px;
}

.chart-container {
  width: 100%;
  height: 270px;
  padding: 4px 0;
  background: linear-gradient(180deg, #fff 0%, #fbfcff 100%);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.chart-container.overview {
  height: 238px;
}

/* 设备故障预警 */
.fault-panel-card {
  padding: 15px;
  margin-bottom: 14px;
}

.fault-header-text {
  min-width: 0;
}

.fault-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}

.fault-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.fault-filters .mobile-field {
  min-width: 0;
}

.fault-filters :deep(.van-button) {
  grid-column: 1 / -1;
  height: 36px;
  font-weight: 700;
  border-radius: 999px;
}

.fault-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fault-empty {
  padding: 28px 12px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 13px;
}

.fault-card {
  position: relative;
  padding: 13px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
}

.fault-card.level-warning {
  background: #fffdf5;
  border-color: #ffe7b3;
}

.fault-card.level-fault {
  background: #fff7f7;
  border-color: #ffd6d6;
}

.fault-card-top {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.fault-level-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
}

.fault-level-tag.level-warning {
  color: #b96b00;
  background: #fff3d6;
}

.fault-level-tag.level-fault {
  color: #dc2626;
  background: #ffe1e1;
}

.fault-time {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: var(--muted);
}

.fault-name {
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-strong);
}

.fault-detail {
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #697386;
}

.fault-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}

.fault-metric {
  min-width: 0;
}

.fault-metric span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--muted);
}

.fault-metric strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-strong);
  white-space: nowrap;
}

.fault-footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.fault-message {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.fault-message.error {
  color: var(--danger);
}

.fault-pagination {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.fault-pagination :deep(.van-button) {
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.page-info {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  user-select: none;
}

/* 历史预测表单 */
.history-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.mobile-field.full {
  width: 100%;
}

.mobile-field span {
  font-size: 12px;
  color: var(--muted);
}

.mobile-field input,
.mobile-field select,
.mini-select {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  font-size: 13px;
  color: var(--text-strong);
  outline: none;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 12px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.mobile-field input:focus,
.mobile-field select:focus,
.mini-select:focus {
  background: #fff;
  border-color: #b7c4ff;
  box-shadow: 0 0 0 3px rgb(79 101 219 / 10%);
}

.history-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.history-actions :deep(.van-button) {
  height: 34px;
  font-weight: 600;
  border-radius: 999px;
}

.auto-actions {
  margin-top: -2px;
}

.control-card > :deep(.van-button--block) {
  height: 36px;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  box-shadow: 0 8px 16px rgb(79 101 219 / 18%);
}

/* 更新时间 */
.update-time {
  padding: 6px 0 2px;
  font-size: 12px;
  color: #a0a8b8;
  text-align: center;
}

/* 小屏优化 */
@media (width <=390px) {
  .mobile-prediction-page {
    padding: 12px;
  }

  .dashboard-title {
    font-size: 18px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-card strong {
    font-size: 15px;
  }

  .metrics-grid,
  .field-grid,
  .metric-list {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 25px;
  }

  .chart-container {
    height: 240px;
  }

  .chart-container.overview {
    height: 220px;
  }
}

@media (width >=600px) {
  .mobile-prediction-page {
    max-width: 560px;
    margin: 0 auto;
  }
}
</style>
