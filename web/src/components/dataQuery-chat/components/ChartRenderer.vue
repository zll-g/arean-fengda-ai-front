<template>
  <div class="chart-renderer">
    <!-- 图表类型切换栏 -->
    <div class="chart-toolbar">
      <span class="chart-label">
        <el-icon><PieChart /></el-icon>
        {{ chartTypeName }}
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

    <!-- ECharts 图表 -->
    <div v-else ref="chartRef" class="chart-container" />
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
// import { chartApi } from '@/api/chart';

const props = defineProps({
  chartConfig: { type: String, default: '{}' },
  columns: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
});

const chartRef = ref(null);
let chartInstance = null;

const activeChartType = ref('table');
const chartTypeName = ref('数据表格');
const metricData = ref([]);
const parsedConfig = ref({});

// 可切换的图表类型
const availableChartTypes = [
  { code: 'table', name: '表格' },
  { code: 'bar', name: '柱状图' },
  { code: 'line', name: '折线图' },
  { code: 'pie', name: '饼图' },
  { code: 'metric', name: '指标卡' },
];

// 解析配置
watch(
  () => props.chartConfig,
  (val) => {
    try {
      const config = JSON.parse(val || '{}');
      parsedConfig.value = config;
      activeChartType.value = config.chartType || 'table';
      chartTypeName.value = config.chartName || '数据表格';

      if (config.chartType === 'metric' && config.option?.metrics) {
        metricData.value = config.option.metrics;
      }

      if (config.option && config.chartType !== 'metric' && config.chartType !== 'table') {
        nextTick(() => renderChart(config.option));
      }
    } catch (e) {
      console.error('解析图表配置失败:', e);
    }
  },
  { immediate: true },
);

// 切换图表类型
async function handleSwitch(newType) {
  if (newType === 'table' || newType === 'metric') {
    // 表格和指标卡不需要 ECharts
    if (chartInstance) chartInstance.clear();
    if (newType === 'metric') {
      // 简单构造指标卡数据
      if (props.data.length > 0) {
        metricData.value = props.columns.map((col) => ({
          label: col,
          value: formatMetricValue(props.data[0][col]),
        }));
      }
    }
    return;
  }

  // 调用后端生成新图表配置
  //   try {
  //     const res = await chartApi.switchChart({
  //       chartType: newType,
  //       columns: props.columns,
  //       data: props.data,
  //     });
  //     const config = JSON.parse(res.data || '{}');
  //     if (config.option) {
  //       nextTick(() => renderChart(config.option));
  //     }
  //   } catch (e) {
  //     console.error('切换图表失败:', e);
  //   }
}

function renderChart(option) {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  // 添加通用配置
  const fullOption = {
    ...option,
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    animationDuration: 600,
  };
  chartInstance.setOption(fullOption, true);
}

function formatMetricValue(val) {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1e8) return (val / 1e8).toFixed(2) + ' 亿';
    if (Math.abs(val) >= 1e4) return (val / 1e4).toFixed(2) + ' 万';
    return val.toLocaleString();
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
  }

  .chart-container {
    width: 100%;
    height: 360px;
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
