<template>
  <div v-loading="loading" class="home-dashboard">
    <!-- 顶部实时指标 -->
    <section class="summary-grid">
      <article v-for="item in summaryCards" :key="item.key" class="summary-card">
        <div class="summary-title">
          <span class="summary-icon">{{ item.icon }}</span>
          <span>{{ item.title }}</span>
        </div>

        <div class="summary-content">
          <div class="summary-value">
            {{ item.value }}
          </div>

          <div class="summary-description">
            {{ item.description }}
          </div>
        </div>
      </article>
    </section>

    <!-- 下方内容区域 -->
    <section class="content-grid">
      <!-- 中间可视化区域：占据主要空间 -->
      <article ref="visualPanelRef" class="panel visual-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">▦</span>
            {{ t('homeDashboard.plantVisualization') }}
          </div>

          <div class="visual-header-actions">
            <span class="visual-current-name">
              {{ activeVisualTab.label }}
            </span>

            <button
              type="button"
              class="visual-action-button"
              :title="isVisualFullscreen ? '退出全屏' : '全屏展示'"
              :aria-label="isVisualFullscreen ? '退出全屏' : '全屏展示'"
              @click="toggleVisualizationFullscreen"
            >
              <el-icon>
                <component :is="isVisualFullscreen ? ScaleToOriginal : FullScreen" />
              </el-icon>
            </button>

            <button
              type="button"
              class="visual-action-button"
              :class="{ 'is-refreshing': visualRefreshing }"
              :disabled="visualRefreshing"
              title="刷新当前可视化页面"
              aria-label="刷新当前可视化页面"
              @click="refreshVisualization"
            >
              <el-icon>
                <Refresh />
              </el-icon>
            </button>
          </div>
        </div>

        <div class="visual-body">
          <div class="visual-tabs" role="tablist" aria-label="机组可视化页面切换">
            <button
              v-for="item in visualTabs"
              :key="item.key"
              type="button"
              role="tab"
              class="visual-tab"
              :class="{ active: activeVisualKey === item.key }"
              :aria-selected="activeVisualKey === item.key"
              :title="item.label"
              @click="handleVisualTabChange(item.key)"
            >
              <span class="visual-tab-dot" />
              <span class="visual-tab-label">{{ item.label }}</span>
            </button>
          </div>

          <div class="visual-content">
            <div v-if="visualRefreshing" class="visual-loading-mask">
              <el-icon class="visual-loading-icon">
                <Refresh />
              </el-icon>
              <span>页面加载中...</span>
            </div>

            <iframe
              :key="visualRefreshToken"
              :src="visualFrameUrl"
              class="visual-frame"
              :title="visualFrameTitle"
              allowfullscreen
              @load="handleVisualLoad"
            />
          </div>
        </div>
      </article>

      <!-- 右侧统计区：机组负荷、知识库、问数、推荐统一放在一边 -->
      <aside class="side-column">
        <!-- 机组负荷 -->
        <article class="panel unit-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="panel-icon">⚡</span>
              {{ t('homeDashboard.unitLoad') }}
            </div>

            <span class="panel-extra daily-generation">
              <span class="daily-generation-label">
                {{ t('homeDashboard.dailyGeneration') }}
              </span>

              <strong class="daily-generation-value">
                {{ dailyGeneration.value }}
              </strong>

              <span v-if="dailyGeneration.unit" class="daily-generation-unit">
                {{ dailyGeneration.unit }}
              </span>
            </span>
          </div>

          <div class="unit-body">
            <div ref="unitLoadChartRef" class="unit-load-chart" />

            <div class="unit-grid">
              <div v-for="item in unitLoadList" :key="item.key" class="unit-item">
                <span class="unit-name">{{ t(item.nameKey) }}</span>

                <strong class="unit-value">
                  {{ formatLoadValue(item.value) }}
                </strong>

                <span class="unit-unit">{{ item.unit }}</span>
              </div>
            </div>
          </div>
        </article>

        <!-- 知识库问答趋势 -->
        <article class="panel knowledge-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="panel-icon">↗</span>
              {{ t('homeDashboard.knowledgeTrend') }}
            </div>

            <span class="panel-extra">{{ t('homeDashboard.last30Days') }}</span>
          </div>

          <div class="panel-body trend-body">
            <div ref="knowledgeChartRef" class="trend-chart" />
          </div>
        </article>

        <!-- 智能问数趋势 -->
        <article class="panel db-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="panel-icon">⇧</span>
              {{ t('homeDashboard.dataQueryTrend') }}
            </div>

            <span class="panel-extra">{{ t('homeDashboard.last30Days') }}</span>
          </div>

          <div class="panel-body trend-body">
            <div ref="databaseChartRef" class="trend-chart" />
          </div>
        </article>

        <!-- GMS 推荐统计 -->
        <article class="panel gms-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="panel-icon">◉</span>
              {{ t('homeDashboard.recommendStatistics') }}
            </div>
            <div class="more-link" @click="handlePush">更多</div>
          </div>

          <div class="gms-body">
            <div v-if="gmsRecommendList.length" class="gms-list">
              <div v-for="item in gmsRecommendList" :key="item.key" class="gms-item">
                <span class="gms-name" :title="item.name">
                  {{ item.name }}
                </span>

                <div class="gms-progress">
                  <div class="gms-progress-bar" :style="{ width: `${item.percent}%` }" />
                </div>

                <strong class="gms-value">
                  {{ formatNumber(item.value) }}
                </strong>
              </div>
            </div>

            <div v-else class="gms-empty">
              {{ t('homeDashboard.noRecommendData') }}
            </div>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { FullScreen, Refresh, ScaleToOriginal } from '@element-plus/icons-vue';

import api from '@/api';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

interface HistoryItem {
  day: string;
  totalCount: number;
}

interface RealTimeVisuMap {
  quote_kb_chat: number;
  today_db_chat: number;
  today_kb_chat: number;
  defectticket_submit: number;
  file_total: number;
}

interface MetricValue {
  dataValue?: number | string;
  unit?: string;
}

interface NormalizedMetric {
  value: number;
  unit: string;
}

interface UnitLoadItem {
  key: string;
  nameKey: string;
  chartNameKey: string;
  value: number;
  unit: string;
}

interface RecommendItem {
  key: string;
  name: string;
  value: number;
  percent: number;
  order: number;
}

interface VisualTab {
  key: string;
  label: string;
  url: string;
}

const HOME_POLLING_INTERVAL = 2000;
const WORKLOAD_POLLING_INTERVAL = 2000;
const FILE_COUNT_POLLING_INTERVAL = 5000;

const visualTabs: VisualTab[] = [
  {
    key: 'unit5Dcs',
    label: '5号机组 DCS',
    url: 'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/N5DCS/1000.html',
  },
  {
    key: 'unit5Tcs',
    label: '5号机组 TCS',
    url: 'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/N5TCS/%E4%B8%B0%E8%BE%BE%E7%94%B5%E5%8E%82TCS%E7%B3%BB%E7%BB%9F%20-.html',
  },
  {
    key: 'unit6Dcs',
    label: '6号机组 DCS',
    url: 'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/N6DCS/1000.html',
  },
  {
    key: 'unit6Tcs',
    label: '6号机组 TCS',
    url: 'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/N6TCS/%E4%B8%B0%E8%BE%BE%E7%94%B5%E5%8E%82TCS%E7%B3%BB%E7%BB%9F%20-.html',
  },
  {
    key: 'publicSystem',
    label: '二期公用系统',
    url: 'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/GYDCS/1000.html',
  },
];

const { t, te, locale } = useI18n();
const router = useRouter();
const loading = ref(true);
const homeRequesting = ref(false);
const workloadRequesting = ref(false);
const fileCountRequesting = ref(false);
const visualPanelRef = ref<HTMLElement>();
const isVisualFullscreen = ref(false);

/** 默认保持原来的二期公用系统页面 */
const activeVisualKey = ref('publicSystem');
const activeVisualTab = computed(
  () => visualTabs.find((item) => item.key === activeVisualKey.value) || visualTabs[0],
);

/** 可视化 iframe 刷新状态，只影响可视化区域 */
const visualRefreshToken = ref(0);
const visualRefreshing = ref(false);

const visualFrameUrl = computed(() => {
  const url = activeVisualTab.value.url;
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}_refresh=${visualRefreshToken.value}`;
});

const visualFrameTitle = computed(
  () => `${activeVisualTab.value.label} - ${t('homeDashboard.plantVisualization')}`,
);

const knowledgeChartRef = ref<HTMLDivElement>();
const databaseChartRef = ref<HTMLDivElement>();
const unitLoadChartRef = ref<HTMLDivElement>();

const realTimeData = reactive<RealTimeVisuMap>({
  quote_kb_chat: 0,
  today_db_chat: 0,
  today_kb_chat: 0,
  defectticket_submit: 0,
  file_total: 0,
});

const knowledgeHistory = ref<HistoryItem[]>([]);
const databaseHistory = ref<HistoryItem[]>([]);

/** 首页接口返回的推荐统计数据 */
const realTimeRecommendMap = ref<Record<string, number>>({});

/** 推荐类型接口返回的“编码 -> 中文名称” */
const recommendTypeMap = ref<Record<string, string>>({});

/** 全厂日发电量原始数据 */
const dailyGenerationSource = ref<unknown>(null);

/** 全厂日发电量展示数据 */
const dailyGeneration = computed(() => {
  if (dailyGenerationSource.value == null) {
    return {
      value: '--',
      unit: '',
    };
  }

  const metric = normalizeMetric(dailyGenerationSource.value, '万KWH');

  return {
    // 保留两位小数，直接截断，不进行四舍五入
    value: formatTruncatedDecimal(metric.value, 2),
    unit: translateMetricUnit(metric.unit || '万KWH'),
  };
});

/** 趋势图纵轴单位 */
const countUnit = computed(() => {
  const localeKey = 'homeDashboard.measurementUnit.times';

  return te(localeKey) ? t(localeKey) : '次数';
});

const unitLoadList = ref<UnitLoadItem[]>([
  {
    key: '1号机组负荷',
    nameKey: 'homeDashboard.units.unit1Load',
    chartNameKey: 'homeDashboard.units.unit1Chart',
    value: 0,
    unit: 'MW',
  },
  {
    key: '2号机组负荷',
    nameKey: 'homeDashboard.units.unit2Load',
    chartNameKey: 'homeDashboard.units.unit2Chart',
    value: 0,
    unit: 'MW',
  },
  {
    key: '5号机组负荷',
    nameKey: 'homeDashboard.units.unit5Load',
    chartNameKey: 'homeDashboard.units.unit5Chart',
    value: 0,
    unit: 'MW',
  },
  {
    key: '6号机组负荷',
    nameKey: 'homeDashboard.units.unit6Load',
    chartNameKey: 'homeDashboard.units.unit6Chart',
    value: 0,
    unit: 'MW',
  },
]);

let knowledgeChart: echarts.ECharts | null = null;
let databaseChart: echarts.ECharts | null = null;
let unitLoadChart: echarts.ECharts | null = null;

let homePollingTimer: ReturnType<typeof setTimeout> | null = null;
let workloadPollingTimer: ReturnType<typeof setTimeout> | null = null;
let fileCountPollingTimer: ReturnType<typeof setTimeout> | null = null;
let visualRefreshTimer: ReturnType<typeof setTimeout> | null = null;

let destroyed = false;

const summaryCards = computed(() => [
  {
    key: 'defectticket_submit',
    title: t('homeDashboard.summary.defectTicketTitle'),
    icon: '◎',
    value: formatNumber(realTimeData.defectticket_submit),
    description: t('homeDashboard.summary.totalSubmitted'),
  },
  {
    key: 'today_kb_chat',
    title: t('homeDashboard.summary.knowledgeQaTitle'),
    icon: '▣',
    value: formatNumber(realTimeData.today_kb_chat),
    description: t('homeDashboard.summary.todayQa'),
  },
  {
    key: 'today_db_chat',
    title: t('homeDashboard.summary.dataQueryTitle'),
    icon: '▥',
    value: formatNumber(realTimeData.today_db_chat),
    description: t('homeDashboard.summary.todayQuery'),
  },
  {
    key: 'quote_kb_chat',
    title: t('homeDashboard.summary.documentReferenceTitle'),
    icon: '▤',
    value: formatNumber(realTimeData.quote_kb_chat),
    description: t('homeDashboard.summary.totalReferences'),
  },
  {
    key: 'file_total',
    title: t('homeDashboard.summary.fileTotalTitle'),
    icon: '▱',
    value: formatNumber(realTimeData.file_total),
    description: t('homeDashboard.summary.fileTotalDescription'),
  },
]);

/**
 * GMS 推荐统计列表。
 * 1. 类型名称匹配 getRecommendType 接口。
 * 2. 数量按照从大到小排序。
 * 3. 数量相同时按照类型接口返回顺序排列。
 */
const gmsRecommendList = computed<RecommendItem[]>(() => {
  const typeKeys = Object.keys(recommendTypeMap.value);

  const extraKeys = Object.keys(realTimeRecommendMap.value).filter(
    (key) => !typeKeys.includes(key),
  );

  const keys = [...typeKeys, ...extraKeys];

  const maxValue = Math.max(...keys.map((key) => Number(realTimeRecommendMap.value[key]) || 0), 1);

  return keys
    .map((key, order) => {
      const value = Number(realTimeRecommendMap.value[key]) || 0;

      return {
        key,
        order,
        name: resolveRecommendName(key),
        value,
        percent: value > 0 ? Math.max((value / maxValue) * 100, 4) : 0,
      };
    })
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value;
      }

      return a.order - b.order;
    });
});

function resolveRecommendName(key: string): string {
  const localeKey = `recommendPage.type.${key}`;

  return te(localeKey) ? t(localeKey) : recommendTypeMap.value[key] || key;
}

function translateMetricUnit(unit: string): string {
  if (unit === '万KWH') {
    const localeKey = 'homeDashboard.measurementUnit.tenThousandKwh';

    return te(localeKey) ? t(localeKey) : '万KWH';
  }

  return unit;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString(locale.value);
}

/** 机组负荷保留一位小数 */
function formatLoadValue(value: number): string {
  return Number(value || 0).toFixed(1);
}

/**
 * 保留指定小数位，直接截断，不进行四舍五入。
 *
 * 例如：
 * 0.239  -> 0.23
 * 1.999  -> 1.99
 * 224    -> 224.00
 */
function formatTruncatedDecimal(value: unknown, digits = 2): string {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return Number(0).toFixed(digits);
  }

  const factor = 10 ** digits;

  const truncatedValue =
    numberValue >= 0
      ? Math.floor((numberValue + Number.EPSILON) * factor) / factor
      : Math.ceil((numberValue - Number.EPSILON) * factor) / factor;

  return truncatedValue.toFixed(digits);
}

function parseNumber(value: unknown): number {
  const matched = String(value ?? '').match(/-?\d+(?:\.\d+)?/);

  return matched ? Number(matched[0]) : 0;
}

/** 兼容对象格式和旧字符串格式 */
function normalizeMetric(value: unknown, defaultUnit = ''): NormalizedMetric {
  if (value && typeof value === 'object') {
    const metric = value as MetricValue;

    return {
      value: Number(metric.dataValue) || 0,
      unit: String(metric.unit || defaultUnit),
    };
  }

  return {
    value: parseNumber(value),
    unit: defaultUnit,
  };
}

function handlePush() {
  router.push('/web/system-management/suggest');
}

/** 同步浏览器全屏状态 */
function handleFullscreenChange() {
  isVisualFullscreen.value = document.fullscreenElement === visualPanelRef.value;
}

/** 当前中间可视化区域进入或退出全屏 */
async function toggleVisualizationFullscreen() {
  const visualPanel = visualPanelRef.value;

  if (!visualPanel) {
    return;
  }

  try {
    if (document.fullscreenElement === visualPanel) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    await visualPanel.requestFullscreen();
  } catch (error) {
    console.error('切换可视化全屏失败：', error);
  }
}

function startVisualLoading() {
  visualRefreshing.value = true;

  if (visualRefreshTimer) {
    clearTimeout(visualRefreshTimer);
  }

  // iframe 加载异常时自动结束加载状态，避免图标一直旋转
  visualRefreshTimer = setTimeout(() => {
    visualRefreshing.value = false;
    visualRefreshTimer = null;
  }, 10000);
}

/** 切换中间可视化页面 */
function handleVisualTabChange(key: string) {
  if (activeVisualKey.value === key) {
    return;
  }

  activeVisualKey.value = key;
  visualRefreshToken.value += 1;
  startVisualLoading();
}

/** 只刷新当前 iframe，不刷新首页其他区域 */
function refreshVisualization() {
  if (visualRefreshing.value) {
    return;
  }

  visualRefreshToken.value += 1;
  startVisualLoading();
}

function handleVisualLoad() {
  visualRefreshing.value = false;

  if (visualRefreshTimer) {
    clearTimeout(visualRefreshTimer);
    visualRefreshTimer = null;
  }
}

/** 兼容 Axios 原始响应和已被响应拦截器处理的响应 */
function unwrapResponse(res: any): any {
  const axiosBody = res?.data;

  if (
    axiosBody &&
    typeof axiosBody === 'object' &&
    ('code' in axiosBody || 'success' in axiosBody || 'msg' in axiosBody)
  ) {
    return axiosBody;
  }

  return res;
}

function formatChartDate(day: string): string {
  if (!day) {
    return '';
  }

  const dateParts = day.split('-');

  return dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : day;
}

function normalizeHistoryList(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    day: String(item?.day || ''),
    totalCount: Number(item?.totalCount) || 0,
  }));
}

function createLineOption(list: HistoryItem[]): echarts.EChartsOption {
  const dates = list.map((item) => formatChartDate(item.day));
  const values = list.map((item) => Number(item.totalCount) || 0);

  return {
    animationDuration: 400,

    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ffd4ab',
      textStyle: {
        color: '#303849',
      },
      formatter(params: any) {
        const current = Array.isArray(params) ? params[0] : params;
        const sourceItem = list[current?.dataIndex];

        return `
          <div style="font-size:12px;color:#8b95a7">
            ${sourceItem?.day || ''}
          </div>
          <div style="margin-top:5px;font-weight:600">
            ${t('homeDashboard.tooltip.count', {
              count: formatNumber(Number(current?.value) || 0),
            })}
          </div>
        `;
      },
    },

    grid: {
      top: 42,
      right: 18,
      bottom: 30,
      left: 44,
      containLabel: false,
    },

    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e7eaf0',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#8c97aa',
        fontSize: 10,
        hideOverlap: true,
      },
    },

    yAxis: {
      type: 'value',
      minInterval: 1,
      name: countUnit.value,
      nameLocation: 'end',
      nameGap: 10,
      nameRotate: 0,
      nameTextStyle: {
        align: 'right',
        color: '#8c97aa',
        fontSize: 10,
        padding: [0, 2, 0, 0],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#8c97aa',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: '#edf0f5',
        },
      },
    },

    series: [
      {
        type: 'line',
        data: values,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: '#ff771b',
        },
        itemStyle: {
          color: '#ff771b',
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: true,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(255,119,27,0.18)',
            },
            {
              offset: 1,
              color: 'rgba(255,119,27,0.01)',
            },
          ]),
        },
      },
    ],
  };
}

function createUnitLoadOption(): echarts.EChartsOption {
  const names = unitLoadList.value.map((item) => t(item.chartNameKey));
  const values = unitLoadList.value.map((item) => item.value);
  const barColors = ['#ff8738', '#f36f29', '#ff8738', '#f36f29'];

  return {
    animationDuration: 500,

    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(255,119,27,0.05)',
        },
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ffd4ab',
      textStyle: {
        color: '#303849',
      },
      formatter(params: any) {
        const current = Array.isArray(params) ? params[0] : params;
        const item = unitLoadList.value[current?.dataIndex];

        return `
          ${current?.name || ''}
          <br/>
          ${t('homeDashboard.tooltip.unitLoad')}
          <b>
            ${formatLoadValue(Number(current?.value) || 0)}
            ${item?.unit || 'MW'}
          </b>
        `;
      },
    },

    grid: {
      top: 42,
      right: 12,
      bottom: 26,
      left: 38,
    },

    xAxis: {
      type: 'category',
      data: names,
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: '#e5e9ef',
        },
      },
      axisLabel: {
        interval: 0,
        color: '#71809a',
        fontSize: 10,
      },
    },

    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      name: 'MW',
      nameLocation: 'end',
      nameGap: 10,
      nameRotate: 0,
      nameTextStyle: {
        align: 'right',
        color: '#9aa8bd',
        fontSize: 10,
        padding: [0, 2, 0, 0],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#9aa8bd',
        fontSize: 9,
      },
      splitLine: {
        lineStyle: {
          color: '#edf0f5',
        },
      },
    },

    series: [
      {
        type: 'bar',
        data: values,
        barWidth: '52%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          color(params: any) {
            return barColors[params.dataIndex] || '#ff771b';
          },
        },
        label: {
          show: true,
          position: 'top',
          distance: 5,
          color: '#ff7116',
          fontSize: 10,
          fontWeight: 600,
          formatter(params: any) {
            return formatLoadValue(Number(params?.value) || 0);
          },
        },
      },
    ],
  };
}

function initializeCharts() {
  if (knowledgeChartRef.value && !knowledgeChart) {
    knowledgeChart = echarts.init(knowledgeChartRef.value);
  }

  if (databaseChartRef.value && !databaseChart) {
    databaseChart = echarts.init(databaseChartRef.value);
  }

  if (unitLoadChartRef.value && !unitLoadChart) {
    unitLoadChart = echarts.init(unitLoadChartRef.value);
  }

  updateCharts();
}

function updateCharts() {
  knowledgeChart?.setOption(createLineOption(knowledgeHistory.value), true);
  databaseChart?.setOption(createLineOption(databaseHistory.value), true);
  unitLoadChart?.setOption(createUnitLoadOption(), true);
}

function resizeCharts() {
  knowledgeChart?.resize();
  databaseChart?.resize();
  unitLoadChart?.resize();
}

/** 获取推荐类型 */
async function getRecommendTypes() {
  try {
    const res: any = await api.suggest.getRecommendType();
    const responseBody = unwrapResponse(res);
    const data = responseBody?.data;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      recommendTypeMap.value = {};
      return;
    }

    recommendTypeMap.value = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value || key)]),
    );
  } catch (error) {
    console.error('获取推荐类型失败：', error);
    recommendTypeMap.value = {};
  }
}

/** 获取首页统计数据 */
async function getHomeInfo() {
  if (homeRequesting.value || destroyed) {
    return;
  }

  homeRequesting.value = true;

  try {
    const res: any = await api.home.getHomeInfo();
    const responseBody = unwrapResponse(res);

    if (!responseBody || responseBody.success === false) {
      return;
    }

    const data = responseBody.data;

    if (!data) {
      return;
    }

    const realTimeVisuMap = data.realTimeVisuMap || {};
    const realTimeRecommendVisuMap = data.realTimeRecommendVisuMap || {};
    const historyVisuMap = data.historyVisuMap || {};

    Object.assign(realTimeData, {
      quote_kb_chat: Number(realTimeVisuMap.quote_kb_chat) || 0,
      today_db_chat: Number(realTimeVisuMap.today_db_chat) || 0,
      today_kb_chat: Number(realTimeVisuMap.today_kb_chat) || 0,
      defectticket_submit: Number(realTimeVisuMap.defectticket_submit) || 0,
    });

    realTimeRecommendMap.value = Object.fromEntries(
      Object.entries(realTimeRecommendVisuMap).map(([key, value]) => [key, Number(value) || 0]),
    );

    knowledgeHistory.value = normalizeHistoryList(historyVisuMap.history_kb_chat);
    databaseHistory.value = normalizeHistoryList(historyVisuMap.history_db_chat);

    await nextTick();
    initializeCharts();
  } catch (error) {
    console.error('获取首页数据失败：', error);
  } finally {
    loading.value = false;
    homeRequesting.value = false;
  }
}

/** 获取文件总数 */
async function getFileCount() {
  if (fileCountRequesting.value || destroyed) {
    return;
  }

  fileCountRequesting.value = true;

  try {
    const res: any = await api.file.getCountByBucket({
      bucketName: 'fengda-file',
    });

    const responseBody = unwrapResponse(res);
    const count = responseBody?.data ?? responseBody;

    realTimeData.file_total = Number(count) || 0;
  } catch (error) {
    console.error('获取文件总数失败：', error);
  } finally {
    fileCountRequesting.value = false;
  }
}

/** 获取机组负荷 */
async function getCrewWorkload() {
  if (workloadRequesting.value || destroyed) {
    return;
  }

  workloadRequesting.value = true;

  try {
    const res: any = await api.home.getCrewWorkload();
    const responseBody = unwrapResponse(res);

    if (!responseBody || responseBody.success === false) {
      return;
    }

    const data = responseBody.data || {};

    dailyGenerationSource.value = data['全厂日发电量'];

    unitLoadList.value = unitLoadList.value.map((item) => {
      const metric = normalizeMetric(data[item.key], item.unit || 'MW');

      return {
        ...item,
        value: metric.value,
        unit: metric.unit || 'MW',
      };
    });

    await nextTick();
    initializeCharts();
  } catch (error) {
    console.error('获取机组负荷失败：', error);
  } finally {
    workloadRequesting.value = false;
  }
}

/** 递归轮询，避免请求堆积 */
async function startHomePolling() {
  await getHomeInfo();

  if (!destroyed) {
    homePollingTimer = setTimeout(startHomePolling, HOME_POLLING_INTERVAL);
  }
}

async function startWorkloadPolling() {
  await getCrewWorkload();

  if (!destroyed) {
    workloadPollingTimer = setTimeout(startWorkloadPolling, WORKLOAD_POLLING_INTERVAL);
  }
}

async function startFileCountPolling() {
  await getFileCount();

  if (!destroyed) {
    fileCountPollingTimer = setTimeout(startFileCountPolling, FILE_COUNT_POLLING_INTERVAL);
  }
}

watch(locale, async () => {
  await nextTick();
  updateCharts();
});

onMounted(async () => {
  await nextTick();

  initializeCharts();

  window.addEventListener('resize', resizeCharts);
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  void getRecommendTypes();
  void startHomePolling();
  void startWorkloadPolling();
  void startFileCountPolling();
});

onBeforeUnmount(() => {
  destroyed = true;

  if (homePollingTimer) {
    clearTimeout(homePollingTimer);
  }

  if (workloadPollingTimer) {
    clearTimeout(workloadPollingTimer);
  }

  if (fileCountPollingTimer) {
    clearTimeout(fileCountPollingTimer);
  }

  if (visualRefreshTimer) {
    clearTimeout(visualRefreshTimer);
  }

  homePollingTimer = null;
  workloadPollingTimer = null;
  fileCountPollingTimer = null;
  visualRefreshTimer = null;

  window.removeEventListener('resize', resizeCharts);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);

  knowledgeChart?.dispose();
  databaseChart?.dispose();
  unitLoadChart?.dispose();

  knowledgeChart = null;
  databaseChart = null;
  unitLoadChart = null;
});
</script>

<style lang="scss" scoped>
.home-dashboard {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 20px;
  overflow: hidden;
  color: #273247;
  background: #f7f5f2;
}

.summary-grid {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.summary-card,
.panel {
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(238 225 210 / 55%);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgb(74 55 35 / 6%);
}

.summary-card {
  min-height: 118px;
}

.summary-title,
.panel-header {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  background: linear-gradient(90deg, #fff3df 0%, #ffedd1 100%);
}

.summary-title {
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #d96216;
}

.summary-icon,
.panel-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  font-size: 11px;
  line-height: 1;
  color: #fff;
  background: #ff7618;
  border-radius: 50%;
}

.summary-content {
  padding: 14px 17px 15px;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  color: #263247;
  letter-spacing: 0.5px;
}

.summary-description {
  margin-top: 7px;
  font-size: 11px;
  color: #99a3b4;
}

.content-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(640px, 2.45fr) minmax(440px, 1fr);
  gap: 16px;
  min-height: 0;
}

.panel {
  min-width: 0;
  min-height: 0;
}

.visual-panel {
  display: flex;
  flex-direction: column;
  grid-column: 1;
  min-height: 0;
}

.side-column {
  display: grid;
  grid-template-rows: minmax(270px, 1.5fr) minmax(150px, 0.8fr) minmax(130px, 0.72fr);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-width: 0;
  min-height: 0;
}

.unit-panel {
  grid-row: 1;
  grid-column: 1 / 3;
}

.knowledge-panel {
  grid-row: 2;
  grid-column: 1;
}

.db-panel {
  grid-row: 2;
  grid-column: 2;
}

.gms-panel {
  grid-row: 3;
  grid-column: 1 / 3;
}

.panel-header {
  justify-content: space-between;
  height: 38px;
}

.panel-title {
  display: flex;
  flex-shrink: 0;
  gap: 7px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #d45f16;
}

.panel-extra {
  max-width: 52%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
}

/* 全厂日发电量 */
.unit-panel .panel-header {
  gap: 8px;
}

.daily-generation {
  display: flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.daily-generation-label {
  flex-shrink: 0;
  color: #303849;
}

.daily-generation-value {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #303849;
}

.daily-generation-unit {
  flex-shrink: 0;
  color: #303849;
}

.panel-body {
  box-sizing: border-box;
}

.trend-body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 38px);
  padding: 4px 7px 8px;
}

.trend-chart {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.visual-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.visual-current-name {
  max-width: 150px;
  padding: 4px 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 500;
  color: #d45f16;
  white-space: nowrap;
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(255 118 24 / 16%);
  border-radius: 999px;
}

.visual-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.visual-tabs {
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  min-height: 52px;
  padding: 8px 10px;
  overflow: auto hidden;
  scrollbar-color: #e9b98d transparent;
  scrollbar-width: thin;
  background: linear-gradient(180deg, #fffdfa 0%, #fff8f0 100%);
  border-bottom: 1px solid #f3e4d5;
}

.visual-tab {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 7px;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  height: 34px;
  padding: 0 13px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  color: #687386;
  white-space: nowrap;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eadfd4;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgb(73 51 29 / 4%);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #e56518;
    border-color: #ffc18f;
    box-shadow: 0 4px 10px rgb(255 113 22 / 10%);
    transform: translateY(-1px);
  }

  &.active {
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #ff922f 0%, #ff7116 100%);
    border-color: transparent;
    box-shadow: 0 5px 12px rgb(255 113 22 / 24%);
  }
}

.visual-tab-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  background: #b6beca;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(182 190 202 / 14%);

  .visual-tab.active & {
    background: #fff;
    box-shadow: 0 0 0 3px rgb(255 255 255 / 20%);
  }
}

.visual-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.visual-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #f3f5f8;
}

.visual-loading-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 9px;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #d45f16;
  pointer-events: none;
  background: rgb(255 255 255 / 74%);
}

.visual-loading-icon {
  font-size: 25px;
  animation: visual-refresh-rotate 0.8s linear infinite;
}

.visual-frame {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 0;
}

.visual-action-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #d45f16;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  .el-icon {
    font-size: 17px;
  }

  &:hover:not(:disabled) {
    color: #ff7618;
    background: rgb(255 118 24 / 12%);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  &.is-refreshing .el-icon {
    animation: visual-refresh-rotate 0.8s linear infinite;
  }
}

.visual-tabs::-webkit-scrollbar {
  height: 4px;
}

.visual-tabs::-webkit-scrollbar-thumb {
  background: #e9b98d;
  border-radius: 999px;
}

@keyframes visual-refresh-rotate {
  to {
    transform: rotate(360deg);
  }
}

.visual-panel:fullscreen {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  background: #fff;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.visual-panel:fullscreen::backdrop {
  background: #fff;
}

.visual-panel:fullscreen .panel-header {
  flex-shrink: 0;
  height: 46px;
  min-height: 46px;
  padding: 0 18px;
}

.visual-panel:fullscreen .visual-tabs {
  min-height: 58px;
  padding: 10px 14px;
}

.visual-panel:fullscreen .visual-tab {
  min-width: 132px;
  height: 38px;
  font-size: 13px;
}

.unit-body {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: calc(100% - 38px);
  min-height: 0;
  padding: 8px 12px 10px;
}

.unit-load-chart {
  flex: 1;
  width: 100%;
  min-height: 96px;
}

.unit-grid {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 6px;
}

.unit-item {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 58px;
  padding: 8px 10px;
  background: #f2f2f2;
  border-radius: 10px;
}

.unit-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  color: #949ba7;
  white-space: nowrap;
}

.unit-value {
  margin-top: 3px;
  font-size: 20px;
  line-height: 1;
  color: #ff7116;
}

.unit-unit {
  margin-top: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #aab4c3;
}

.more-link {
  font-size: 12px;
  color: #6f7784;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #ff7116;
  }
}

/* GMS 内容从顶部开始排列 */
.gms-body {
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  height: calc(100% - 38px);
  min-height: 0;
  padding: 10px 12px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
}

.gms-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: 100%;
}

.gms-item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 42px;
  gap: 8px;
  align-items: center;
  min-height: 29px;
}

.gms-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
  color: #596579;
  white-space: nowrap;
}

.gms-progress {
  height: 9px;
  overflow: hidden;
  background: #f0f1f4;
  border-radius: 999px;
}

.gms-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff9b50 0%, #ff7116 100%);
  border-radius: inherit;
  transition: width 0.4s ease;
}

.gms-value {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #ff7116;
  text-align: right;
}

.gms-empty {
  width: 100%;
  padding-top: 20px;
  font-size: 13px;
  color: #a2aab7;
  text-align: center;
}

.gms-body::-webkit-scrollbar {
  width: 6px;
}

.gms-body::-webkit-scrollbar-thumb {
  background: #e7b889;
  border-radius: 999px;
}

.gms-body::-webkit-scrollbar-thumb:hover {
  background: #d99a5d;
}

@media screen and (width <=1360px) {
  .home-dashboard {
    padding: 14px;
  }

  .summary-grid {
    gap: 12px;
    margin-bottom: 14px;
  }

  .content-grid {
    grid-template-columns: minmax(560px, 2.15fr) minmax(410px, 1fr);
    gap: 12px;
  }

  .side-column {
    gap: 12px;
  }

  .visual-tab {
    min-width: 104px;
    padding: 0 10px;
    font-size: 11px;
  }
}

@media screen and (width <=1180px) {
  .home-dashboard {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .content-grid {
    display: flex;
    flex-direction: column;
  }

  .visual-panel {
    min-height: 650px;
  }

  .side-column {
    grid-template-rows: minmax(300px, auto) minmax(220px, auto) minmax(180px, auto);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .unit-panel {
    grid-row: 1;
    grid-column: 1 / 3;
  }

  .knowledge-panel {
    grid-row: 2;
    grid-column: 1;
  }

  .db-panel {
    grid-row: 2;
    grid-column: 2;
  }

  .gms-panel {
    grid-row: 3;
    grid-column: 1 / 3;
  }
}

@media screen and (width <=768px) {
  .home-dashboard {
    padding: 12px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .visual-panel {
    min-height: 500px;
  }

  .visual-current-name {
    display: none;
  }

  .visual-tabs {
    min-height: 48px;
    padding: 7px 8px;
  }

  .visual-tab {
    min-width: 106px;
    height: 32px;
    padding: 0 11px;
    font-size: 11px;
  }

  .side-column {
    display: flex;
    flex-direction: column;
  }

  .unit-panel {
    min-height: 340px;
  }

  .knowledge-panel,
  .db-panel {
    min-height: 260px;
  }

  .gms-panel {
    min-height: 220px;
  }

  .summary-value {
    font-size: 23px;
  }

  .daily-generation {
    font-size: 11px;
  }

  .daily-generation-value {
    font-size: 12px;
  }
}
</style>
