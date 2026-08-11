<script setup lang="ts">
import * as echarts from 'echarts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Loading from './Loading.vue';

interface Props {
  node: {
    type: 'vmr_container';
    name: string;
    children?: Array<{ type: string; raw: string }>;
  };
  isDark?: boolean;
}

const isLoading = ref(false);
const props = defineProps<Props>();

// 只处理 echarts 容器
const isEChartsContainer = computed(() => props.node.name === 'echarts');

const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;

// 从子节点提取 JSON
const chartOption = computed(() => {
  if (!props.node.children || props.node.children.length === 0) {
    return null;
  }
  const code = props.node.children[0].raw;
  console.log(code, 333);
  try {
    return JSON.parse(code);
  } catch {
    return null;
  }
});

function initChart() {
  isLoading.value = true;
  if (!isEChartsContainer.value || !chartRef.value || !chartOption.value) return;

  if (chartInstance) {
    chartInstance.dispose();
  }
  const theme = props.isDark ? 'dark' : undefined;
  isLoading.value = false;
  chartInstance = echarts.init(chartRef.value, theme);
  chartInstance.setOption(chartOption.value, true);
}

watch(() => props.isDark, initChart);
watch(chartOption, (option) => {
  if (chartInstance && option) {
    chartInstance.setOption(option, true);
  } else if (option) {
    initChart();
  }
});

onMounted(initChart);
onBeforeUnmount(() => {
  chartInstance?.dispose();
});
</script>

<template>
  <div v-if="isEChartsContainer" class="vmr-container vmr-container-echarts">
    <div ref="chartRef" style="width: 100%; height: 400px" />
    <Loading :loading="isLoading" text="正在渲染数据..." />
    <slot v-if="!chartOption" />
  </div>
  <div v-else class="vmr-container" :class="`vmr-container-${node.name}`">
    <slot />
  </div>
</template>

<style scoped>
.vmr-container-echarts {
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.dark .vmr-container-echarts {
  border-color: #374151;
}
</style>
