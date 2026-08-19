<template>
  <div class="chart-metrics">
    <!-- 机组负荷 -->
    <div class="chart-card">
      <div class="card-header">
        <span class="card-icon">⚡</span>
        <span class="card-title">机组负荷</span>
        <span class="card-extra">{{ dailyGenerationText }}</span>
      </div>
      <div class="card-body">
        <div ref="unitChartRef" class="chart-box" />
        <div class="unit-grid">
          <div v-for="item in unitLoadList" :key="item.key" class="unit-item">
            <span class="unit-name">{{ item.name }}</span>
            <strong class="unit-value">{{ item.displayValue }}</strong>
            <span class="unit-unit">{{ item.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 知识库问答趋势 -->
    <div class="chart-card">
      <div class="card-header">
        <span class="card-icon">↗</span>
        <span class="card-title">知识库问答趋势</span>
        <span class="card-extra">近30天</span>
      </div>
      <div class="card-body">
        <div ref="knowledgeChartRef" class="chart-box" />
      </div>
    </div>

    <!-- 智能问数趋势 -->
    <div class="chart-card">
      <div class="card-header">
        <span class="card-icon">⇧</span>
        <span class="card-title">智能问数趋势</span>
        <span class="card-extra">近30天</span>
      </div>
      <div class="card-body">
        <div ref="databaseChartRef" class="chart-box" />
      </div>
    </div>

    <!-- 智能推荐统计 -->
    <div class="chart-card">
      <div class="card-header">
        <span class="card-icon">◉</span>
        <span class="card-title">智能推荐统计</span>
      </div>
      <div class="card-body">
        <div v-if="gmsList.length" class="gms-list">
          <div v-for="item in gmsList" :key="item.key" class="gms-item">
            <span class="gms-name" :title="item.name">{{ item.name }}</span>
            <div class="gms-progress">
              <div class="gms-progress-bar" :style="{ width: `${item.percent}%` }" />
            </div>
            <strong class="gms-value">{{ item.displayValue }}</strong>
          </div>
        </div>
        <div v-else class="gms-empty">暂无推荐统计数据</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import * as echarts from 'echarts';
import api from '@/api';

// ==================== types ====================

interface HistoryItem {
  day: string;
  totalCount: number;
}

interface UnitLoadItem {
  key: string;
  name: string;
  value: number;
  unit: string;
  displayValue: string;
}

interface GmsItem {
  key: string;
  name: string;
  value: number;
  percent: number;
  order: number;
  displayValue: string;
}

// ==================== state ====================

const unitChartRef = ref<HTMLDivElement>();
const knowledgeChartRef = ref<HTMLDivElement>();
const databaseChartRef = ref<HTMLDivElement>();

const unitLoadList = ref<UnitLoadItem[]>([
  { key: '1号机组负荷', name: '1号机组', value: 0, unit: 'MW', displayValue: '0.0' },
  { key: '2号机组负荷', name: '2号机组', value: 0, unit: 'MW', displayValue: '0.0' },
  { key: '5号机组负荷', name: '5号机组', value: 0, unit: 'MW', displayValue: '0.0' },
  { key: '6号机组负荷', name: '6号机组', value: 0, unit: 'MW', displayValue: '0.0' },
]);

const knowledgeHistory = ref<HistoryItem[]>([]);
const databaseHistory = ref<HistoryItem[]>([]);

const dailyGenerationSource = ref<unknown>(null);
const dailyGenerationText = computed(() => {
  const metric = normalizeMetric(dailyGenerationSource.value, '万KWH');
  if (metric.value === 0 && !dailyGenerationSource.value) return '';
  return `日发电量 ${formatTruncatedDecimal(metric.value, 2)} ${metric.unit}`;
});

const recommendTypeMap = ref<Record<string, string>>({});
const recommendDataMap = ref<Record<string, number>>({});

const gmsList = computed<GmsItem[]>(() => {
  const typeKeys = Object.keys(recommendTypeMap.value);
  const extraKeys = Object.keys(recommendDataMap.value).filter((k) => !typeKeys.includes(k));
  const keys = [...typeKeys, ...extraKeys];
  const maxVal = Math.max(...keys.map((k) => Number(recommendDataMap.value[k]) || 0), 1);

  return keys
    .map((key, order) => {
      const value = Number(recommendDataMap.value[key]) || 0;
      return {
        key,
        order,
        name: recommendTypeMap.value[key] || key,
        value,
        percent: value > 0 ? Math.max((value / maxVal) * 100, 4) : 0,
        displayValue: formatNumber(value),
      };
    })
    .sort((a, b) => (b.value !== a.value ? b.value - a.value : a.order - b.order));
});

// ==================== echarts instances ====================

let unitChart: echarts.ECharts | null = null;
let knowledgeChart: echarts.ECharts | null = null;
let databaseChart: echarts.ECharts | null = null;

// ==================== helpers ====================

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString();
}

function formatLoadValue(value: number): string {
  return Number(value || 0).toFixed(1);
}

function formatTruncatedDecimal(value: unknown, digits = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(digits);
  const factor = 10 ** digits;
  const truncated =
    n >= 0
      ? Math.floor((n + Number.EPSILON) * factor) / factor
      : Math.ceil((n - Number.EPSILON) * factor) / factor;
  return truncated.toFixed(digits);
}

function parseNumber(value: unknown): number {
  const matched = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

function normalizeMetric(value: unknown, defaultUnit = ''): { value: number; unit: string } {
  if (value && typeof value === 'object') {
    const m = value as { dataValue?: unknown; unit?: string };
    return { value: Number(m.dataValue) || 0, unit: String(m.unit || defaultUnit) };
  }
  return { value: parseNumber(value), unit: defaultUnit };
}

function formatChartDate(day: string): string {
  if (!day) return '';
  const parts = day.split('-');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : day;
}

// ==================== response helpers ====================

function normalizeHistoryList(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item: any) => ({
    day: String(item?.day || ''),
    totalCount: Number(item?.totalCount) || 0,
  }));
}

// ==================== chart options（与 PC 端完全一致） ====================

function createLineOption(list: HistoryItem[]): echarts.EChartsOption {
  const dates = list.map((item) => formatChartDate(item.day));
  const values = list.map((item) => Number(item.totalCount) || 0);

  return {
    animationDuration: 400,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ffd4ab',
      textStyle: { color: '#303849' },
      formatter(params: any) {
        const cur = Array.isArray(params) ? params[0] : params;
        const src = list[cur?.dataIndex];
        return `<div style="font-size:12px;color:#8b95a7">${src?.day || ''}</div>
          <div style="margin-top:5px;font-weight:600">${formatNumber(Number(cur?.value) || 0)} 次数</div>`;
      },
    },
    grid: { top: 42, right: 18, bottom: 30, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#e7eaf0' } },
      axisTick: { show: false },
      axisLabel: { color: '#8c97aa', fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '次数',
      nameLocation: 'end',
      nameGap: 10,
      nameRotate: 0,
      nameTextStyle: { align: 'right', color: '#8c97aa', fontSize: 10, padding: [0, 2, 0, 0] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8c97aa', fontSize: 10 },
      splitLine: { lineStyle: { color: '#edf0f5' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: '#ff771b' },
        itemStyle: { color: '#ff771b', borderColor: '#ffffff', borderWidth: 2 },
        emphasis: { scale: true },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,119,27,0.18)' },
            { offset: 1, color: 'rgba(255,119,27,0.01)' },
          ]),
        },
      },
    ],
  };
}

function createUnitLoadOption(): echarts.EChartsOption {
  const names = unitLoadList.value.map((item) => item.name);
  const values = unitLoadList.value.map((item) => item.value);
  const barColors = ['#ff8738', '#f36f29', '#ff8738', '#f36f29'];

  return {
    animationDuration: 500,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,119,27,0.05)' } },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#ffd4ab',
      textStyle: { color: '#303849' },
      formatter(params: any) {
        const cur = Array.isArray(params) ? params[0] : params;
        const item = unitLoadList.value[cur?.dataIndex];
        return `${cur?.name || ''}<br/>机组负荷 <b>${formatLoadValue(Number(cur?.value) || 0)} ${item?.unit || 'MW'}</b>`;
      },
    },
    grid: { top: 42, right: 12, bottom: 26, left: 38 },
    xAxis: {
      type: 'category',
      data: names,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e9ef' } },
      axisLabel: { interval: 0, color: '#71809a', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      minInterval: 1,
      name: 'MW',
      nameLocation: 'end',
      nameGap: 10,
      nameRotate: 0,
      nameTextStyle: { align: 'right', color: '#9aa8bd', fontSize: 10, padding: [0, 2, 0, 0] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#9aa8bd', fontSize: 9 },
      splitLine: { lineStyle: { color: '#edf0f5' } },
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

// ==================== chart lifecycle（与 PC 端完全一致） ====================

function initializeCharts() {
  if (unitChartRef.value && !unitChart) unitChart = echarts.init(unitChartRef.value);
  if (knowledgeChartRef.value && !knowledgeChart)
    knowledgeChart = echarts.init(knowledgeChartRef.value);
  if (databaseChartRef.value && !databaseChart)
    databaseChart = echarts.init(databaseChartRef.value);
  updateCharts();
}

function updateCharts() {
  unitChart?.setOption(createUnitLoadOption(), true);
  knowledgeChart?.setOption(createLineOption(knowledgeHistory.value), true);
  databaseChart?.setOption(createLineOption(databaseHistory.value), true);
}

function resizeCharts() {
  unitChart?.resize();
  knowledgeChart?.resize();
  databaseChart?.resize();
}

// ==================== data fetching（与 PC 端完全一致：各自独立 try-catch） ====================

async function getHomeInfo() {
  try {
    const res: any = await api.home.getHomeInfo();
    const data = res?.data;
    if (!data) return;

    const historyVisuMap = data.historyVisuMap || {};
    const realTimeRecommendVisuMap = data.realTimeRecommendVisuMap || {};

    knowledgeHistory.value = normalizeHistoryList(historyVisuMap.history_kb_chat);
    databaseHistory.value = normalizeHistoryList(historyVisuMap.history_db_chat);

    recommendDataMap.value = Object.fromEntries(
      Object.entries(realTimeRecommendVisuMap).map(([key, value]) => [key, Number(value) || 0]),
    );

    await nextTick();
    initializeCharts();
  } catch (error) {
    console.error('获取首页数据失败：', error);
  }
}

async function getCrewWorkload() {
  try {
    const res: any = await api.home.getCrewWorkload();
    const data = res?.data || {};

    dailyGenerationSource.value = data['全厂日发电量'];

    unitLoadList.value = unitLoadList.value.map((item) => {
      const metric = normalizeMetric(data[item.key], item.unit || 'MW');
      return {
        ...item,
        value: metric.value,
        unit: metric.unit || 'MW',
        displayValue: formatLoadValue(metric.value),
      };
    });

    await nextTick();
    initializeCharts();
  } catch (error) {
    console.error('获取机组负荷失败：', error);
  }
}

async function getRecommendTypes() {
  try {
    const res: any = await api.suggest.getRecommendType();
    const data = res?.data;

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

// ==================== lifecycle ====================

onMounted(async () => {
  await nextTick();
  initializeCharts();
  window.addEventListener('resize', resizeCharts);

  void getRecommendTypes();
  void getHomeInfo();
  void getCrewWorkload();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  unitChart?.dispose();
  knowledgeChart?.dispose();
  databaseChart?.dispose();
  unitChart = null;
  knowledgeChart = null;
  databaseChart = null;
});
</script>

<style scoped>
.chart-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(238 225 210 / 55%);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgb(74 55 35 / 6%);
}

.card-header {
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #d96216;
  background: linear-gradient(90deg, #fff3df, #ffedd1);
}

.card-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  font-size: 10px;
  line-height: 1;
  color: #fff;
  background: #ff7618;
  border-radius: 50%;
}

.card-title {
  flex: 1;
}

.card-extra {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 400;
  color: #d45f16;
  opacity: 0.7;
}

.card-body {
  padding: 8px 10px 10px;
}

.chart-box {
  width: 100%;
  height: 200px;
  min-height: 200px;
}

/* 机组负荷 */
.unit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 6px;
}

.unit-item {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background: #f5f6f8;
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
  margin-top: 2px;
  font-size: 18px;
  line-height: 1;
  color: #ff7116;
}

.unit-unit {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: #aab4c3;
}

/* GMS */
.gms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gms-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 40px;
  gap: 8px;
  align-items: center;
}

.gms-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 500;
  color: #596579;
  white-space: nowrap;
}

.gms-progress {
  height: 8px;
  overflow: hidden;
  background: #f0f1f4;
  border-radius: 999px;
}

.gms-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff9b50, #ff7116);
  border-radius: inherit;
  transition: width 0.4s ease;
}

.gms-value {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: #ff7116;
  text-align: right;
}

.gms-empty {
  padding: 20px 0;
  font-size: 12px;
  color: #a2aab7;
  text-align: center;
}
</style>
