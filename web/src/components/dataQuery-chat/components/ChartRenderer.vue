<template>
  <div class="chart-renderer">
    <!-- 图表类型切换栏 -->
    <div class="chart-toolbar">
      <span class="chart-label">
        <el-icon><PieChart /></el-icon>
        {{ currentTypeName }}
      </span>
      <div class="chart-switcher">
        <el-radio-group v-model="activeChartType" size="small" @change="handleSwitch">
          <el-radio-button v-for="ct in availableChartTypes" :key="ct.code" :value="ct.code">
            {{ ct.name }}
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 指标卡 -->
    <div v-if="activeChartType === 'metric'" class="metric-container">
      <div v-for="(metric, idx) in metricData" :key="idx" class="metric-card">
        <div class="metric-value">{{ metric.value }}</div>
        <div class="metric-label">{{ metric.label }}</div>
      </div>
    </div>

    <!-- 维度不足/散点数值列不足等无法成图时的友好提示 -->
    <div v-else-if="activeChartType !== 'table' && !hasRenderableData" class="chart-empty">
      当前数据结构不适合「{{ currentTypeName }}」展示，请切换其他图表类型
    </div>

    <!-- ECharts 图表（table 走上方数据表格组件，这里无需容器） -->
    <div
      v-show="activeChartType !== 'table' && activeChartType !== 'metric' && hasRenderableData"
      ref="chartRef"
      class="chart-container"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

/**
 * 图表展示治理（与后端 EChartsConfigBuilder 对齐）：
 * 所有面向用户的展示位（指标卡 label / legend / series name / 坐标轴 name / tooltip）
 * 统一使用与 columns 同序对齐的中文展示名 displayColumns，数据取值仍按原始列名；
 * displayColumns 缺省或长度不齐时回退原始列名，展示层永不缺标签。
 *
 * 图表类型切换为纯前端本地重建（bar/stacked_bar/line/area/pie/scatter/metric），
 * 不再依赖后端切换接口：维度列/数值列按数据画像自动推断，切换即得中文友好的成图。
 */
const props = defineProps({
  chartConfig: { type: String, default: '{}' },
  columns: { type: Array, default: () => [] },
  /** 与 columns 同序的中文展示名（与后端 data_ready.displayColumns / 历史 resultColumnLabels 对齐） */
  displayColumns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
});

const chartRef = ref(null);
let chartInstance = null;

const activeChartType = ref('table');
const metricData = ref([]);
const parsedConfig = ref({});

// 可切换的图表类型（与后端 ChartType 枚举码值一致，全量开放）
const availableChartTypes = [
  { code: 'table', name: '表格' },
  { code: 'bar', name: '柱状图' },
  { code: 'stacked_bar', name: '堆叠柱状' },
  { code: 'line', name: '折线图' },
  { code: 'area', name: '面积图' },
  { code: 'pie', name: '饼图' },
  { code: 'scatter', name: '散点图' },
  { code: 'metric', name: '指标卡' },
];

// ==================== 列名展示治理 ====================

/** 原始列名 → 中文展示名（同序对齐；任何缺口回退原始列名） */
function labelOf(col) {
  const idx = props.columns.indexOf(col);
  const aligned =
    Array.isArray(props.displayColumns) && props.displayColumns.length === props.columns.length;

  if (!aligned || idx < 0) return String(col ?? '');

  const label = props.displayColumns[idx];
  const text = label == null ? '' : String(label).trim();

  return text || String(col ?? '');
}

const currentTypeName = computed(() => {
  const hit = availableChartTypes.find((ct) => ct.code === activeChartType.value);
  if (hit) return hit.name;

  // 后端推荐了切换列表之外的类型时，用 chartConfig 自带名称兜底
  return parsedConfig.value?.chartName || '数据表格';
});

// ==================== 数据画像（本地建图依据） ====================

/** 是否为数值型取值（数字或数值字符串） */
function isNumericValue(val) {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return Number.isFinite(val);
  if (typeof val === 'string') return Number.isFinite(Number(val));
  return false;
}

/** 数值列：取样本（首行非空值优先）判定 */
const numericColumns = computed(() => {
  return props.columns.filter((col) => {
    for (const row of props.data.slice(0, 20)) {
      const val = row?.[col];
      if (val === null || val === undefined || val === '') continue;
      return isNumericValue(val);
    }
    return false;
  });
});

/** 维度列：首个非数值列；全数值时回退首列 */
const categoryColumn = computed(() => {
  const nonNumeric = props.columns.find((col) => !numericColumns.value.includes(col));
  return nonNumeric ?? props.columns[0] ?? null;
});

const hasRenderableData = computed(() => {
  if (!props.columns.length || !props.data.length) return false;

  if (activeChartType.value === 'scatter') return numericColumns.value.length >= 2;

  if (['bar', 'stacked_bar', 'line', 'area', 'pie'].includes(activeChartType.value)) {
    // 至少需要 1 个数值列（pie 另需维度列，categoryColumn 已保证非空）
    return numericColumns.value.length >= 1;
  }

  return true;
});

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// ==================== 本地图表构建（类型切换） ====================

/** 类目轴数据（维度列取值，原样保留展示） */
function categoryData() {
  const dim = categoryColumn.value;
  if (!dim) return [];
  return props.data.map((row) => {
    const val = row?.[dim];
    return val === null || val === undefined ? '' : String(val);
  });
}

/** 参与成图的数值系列列（排除维度列） */
function seriesColumns() {
  const dim = categoryColumn.value;
  const cols = numericColumns.value.filter((col) => col !== dim);
  // 极端情况：维度列本身是唯一数值列之外的唯一列（如两列全数值，首列作维度）
  return cols.length ? cols : numericColumns.value;
}

const AXIS_COMMON = {
  axisLine: { lineStyle: { color: '#cbd5e1' } },
  axisLabel: { color: '#64748b', fontSize: 11 },
  splitLine: { lineStyle: { color: '#eef2f7' } },
};

function buildCartesianOption(type) {
  const stacked = type === 'stacked_bar';
  const area = type === 'area';
  const isBar = type === 'bar' || stacked;
  const valueCols = seriesColumns();

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: isBar ? 'shadow' : 'line' },
      valueFormatter: (val) =>
        val === null || val === undefined ? '-' : Number(val).toLocaleString(),
    },
    legend: {
      data: valueCols.map((col) => labelOf(col)),
      bottom: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#475569', fontSize: 12 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: valueCols.length > 1 ? 46 : 30,
      top: 16,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      name: labelOf(categoryColumn.value),
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      data: categoryData(),
      ...AXIS_COMMON,
    },
    yAxis: { type: 'value', ...AXIS_COMMON },
    series: valueCols.map((col) => ({
      name: labelOf(col),
      type: isBar ? 'bar' : 'line',
      ...(stacked ? { stack: 'total', emphasis: { focus: 'series' } } : {}),
      ...(area ? { areaStyle: { opacity: 0.18 }, smooth: true } : {}),
      ...(type === 'line' ? { smooth: true } : {}),
      ...(isBar ? { barMaxWidth: 42, itemStyle: { borderRadius: [4, 4, 0, 0] } } : {}),
      data: props.data.map((row) => toNumber(row?.[col])),
    })),
    animationDuration: 600,
  };
}

function buildPieOption() {
  const dim = categoryColumn.value;
  const valueCol = seriesColumns()[0];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) =>
        `${p.name}<br/>${labelOf(valueCol)}: ${Number(p.value).toLocaleString()} (${p.percent}%)`,
    },
    legend: {
      bottom: 0,
      itemWidth: 14,
      itemHeight: 8,
      type: 'scroll',
      textStyle: { color: '#475569', fontSize: 12 },
    },
    series: [
      {
        name: labelOf(valueCol),
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { color: '#475569', fontSize: 12, formatter: '{b}\n{d}%' },
        data: props.data.map((row) => {
          const name = row?.[dim];
          return {
            name: name === null || name === undefined ? '' : String(name),
            value: toNumber(row?.[valueCol]) ?? 0,
          };
        }),
      },
    ],
    animationDuration: 600,
  };
}

function buildScatterOption() {
  const [xCol, yCol] = numericColumns.value;

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) =>
        `${labelOf(xCol)}: ${Number(p.value[0]).toLocaleString()}<br/>${labelOf(yCol)}: ${Number(p.value[1]).toLocaleString()}`,
    },
    grid: { left: '3%', right: '4%', bottom: 30, top: 16, containLabel: true },
    xAxis: {
      type: 'value',
      name: labelOf(xCol),
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      ...AXIS_COMMON,
    },
    yAxis: {
      type: 'value',
      name: labelOf(yCol),
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      ...AXIS_COMMON,
    },
    series: [
      {
        name: `${labelOf(xCol)} × ${labelOf(yCol)}`,
        type: 'scatter',
        symbolSize: 12,
        itemStyle: { opacity: 0.72 },
        data: props.data
          .map((row) => [toNumber(row?.[xCol]), toNumber(row?.[yCol])])
          .filter((pair) => pair[0] !== null && pair[1] !== null),
      },
    ],
    animationDuration: 600,
  };
}

/** 指标卡数据：label 用中文展示名（首行取值） */
function buildMetricData() {
  if (!props.data.length) return [];
  return props.columns.map((col) => ({
    label: labelOf(col),
    value: formatMetricValue(props.data[0][col]),
  }));
}

function buildLocalOption(type) {
  switch (type) {
    case 'bar':
    case 'stacked_bar':
    case 'line':
    case 'area':
      return buildCartesianOption(type);
    case 'pie':
      return buildPieOption();
    case 'scatter':
      return buildScatterOption();
    default:
      return null;
  }
}

// ==================== 渲染调度 ====================

function renderChart(option) {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  chartInstance.setOption(option, true);
}

function clearChart() {
  chartInstance?.clear();
}

/** 渲染初始推荐配置：优先后端 option（展示治理已在后端完成，legend/轴名等已是中文） */
function renderInitial() {
  const config = parsedConfig.value;

  if (activeChartType.value === 'metric') {
    metricData.value = config.option?.metrics?.length ? config.option.metrics : buildMetricData();
    return;
  }

  if (activeChartType.value === 'table') {
    return;
  }

  if (config.option) {
    nextTick(() => renderChart(config.option));
    return;
  }

  // 后端 option 缺失兜底：走本地建图
  renderLocal(activeChartType.value);
}

/** 本地建图渲染（类型切换路径统一入口） */
function renderLocal(type) {
  if (type === 'table') {
    clearChart();
    return;
  }

  if (type === 'metric') {
    clearChart();
    metricData.value = buildMetricData();
    return;
  }

  if (!hasRenderableData.value) {
    clearChart();
    return;
  }

  const option = buildLocalOption(type);
  if (!option) return;

  nextTick(() => renderChart(option));
}

// 解析配置（chartConfig 到达/变化时：恢复后端初始推荐视图）
watch(
  () => [props.chartConfig, props.data],
  () => {
    try {
      const config = JSON.parse(props.chartConfig || '{}');
      parsedConfig.value = config;
      activeChartType.value = config.chartType || 'table';
      renderInitial();
    } catch (e) {
      console.error('解析图表配置失败:', e);
    }
  },
  { immediate: true },
);

// displayColumns 迟达（极端时序）时刷新当前视图的标签
watch(
  () => props.displayColumns,
  () => {
    if (activeChartType.value === 'metric') {
      metricData.value =
        parsedConfig.value?.option?.metrics?.length && activeChartType.value === 'metric'
          ? parsedConfig.value.option.metrics
          : buildMetricData();
      return;
    }

    if (activeChartType.value !== 'table' && !parsedConfig.value?.option) {
      renderLocal(activeChartType.value);
    }
  },
);

// 切换图表类型：纯前端本地重建（中文展示名贯穿 legend/series/轴名/tooltip）
async function handleSwitch(newType) {
  await nextTick();
  renderLocal(newType);
}

function formatMetricValue(val) {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number' || isNumericValue(val)) {
    const num = Number(val);
    if (!Number.isFinite(num)) return String(val);
    if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿';
    if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万';
    return num.toLocaleString();
  }
  return String(val);
}

// 响应式调整
function handleResize() {
  chartInstance?.resize();
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped lang="scss">
.chart-renderer {
  margin: 8px 0;

  .chart-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .chart-label {
      display: flex;
      gap: 4px;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      color: #666;
    }

    .chart-switcher {
      :deep(.el-radio-button__inner) {
        padding: 5px 10px;
      }
    }
  }

  .chart-container {
    width: 100%;
    height: 360px;
  }

  .chart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    font-size: 13px;
    color: #94a3b8;
    background: #f8fafc;
    border: 1px dashed #e2e8f0;
    border-radius: 10px;
  }

  .metric-container {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: center;
    padding: 20px 0;

    .metric-card {
      min-width: 160px;
      padding: 24px 32px;
      text-align: center;
      background: linear-gradient(135deg, #f0f9ff, #e8f4fd);
      border-radius: 12px;

      .metric-value {
        font-size: 36px;
        font-weight: 700;
        line-height: 1.2;
        color: #409eff;
      }

      .metric-label {
        margin-top: 8px;
        font-size: 14px;
        color: #909399;
      }
    }
  }
}
</style>
