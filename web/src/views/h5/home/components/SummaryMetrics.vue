<template>
  <div class="summary-metrics">
    <div v-for="item in metrics" :key="item.key" class="metric-card">
      <div class="metric-header">
        <span class="metric-icon">{{ item.icon }}</span>
        <span class="metric-title">{{ item.title }}</span>
      </div>
      <div class="metric-body">
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-desc">{{ item.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '@/api';

interface MetricItem {
  key: string;
  title: string;
  icon: string;
  value: string;
  description: string;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString();
}

const metrics = ref<MetricItem[]>([
  {
    key: 'defectticket_submit',
    title: '缺陷单填报质量',
    icon: '◎',
    value: '0',
    description: '缺陷单填报总数',
  },
  {
    key: 'today_kb_chat',
    title: '知识问答次数',
    icon: '▣',
    value: '0',
    description: '今日问答次数',
  },
  {
    key: 'today_db_chat',
    title: '智能问数次数',
    icon: '▥',
    value: '0',
    description: '今日问数次数',
  },
  {
    key: 'quote_kb_chat',
    title: '文档引用次数',
    icon: '▤',
    value: '0',
    description: '文档引用总次数',
  },
]);

function updateMetricValue(key: string, value: number) {
  const index = metrics.value.findIndex((item) => item.key === key);
  if (index !== -1) {
    metrics.value[index] = { ...metrics.value[index], value: formatNumber(value) };
  }
}

async function fetchData() {
  try {
    const [homeRes, fileRes] = await Promise.all([
      api.home.getHomeInfo(),
      api.file.getCountByBucket({ bucketName: 'fengda-file' }),
    ]);

    const data = homeRes?.data;
    if (data) {
      const map = data.realTimeVisuMap || {};
      updateMetricValue('defectticket_submit', Number(map.defectticket_submit) || 0);
      updateMetricValue('today_kb_chat', Number(map.today_kb_chat) || 0);
      updateMetricValue('today_db_chat', Number(map.today_db_chat) || 0);
      updateMetricValue('quote_kb_chat', Number(map.quote_kb_chat) || 0);
    }

    const count = fileRes?.data ?? fileRes;
    updateMetricValue('file_total', Number(count) || 0);
  } catch (error) {
    console.error('获取首页指标数据失败：', error);
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 1rem;
}

.metric-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(238 225 210 / 55%);
  border-radius: 13px;
  box-shadow: 0 4px 14px rgb(74 55 35 / 6%);
}

.metric-header {
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #d96216;
  background: linear-gradient(90deg, #fff3df, #ffedd1);
}

.metric-icon {
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

.metric-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-body {
  padding: 12px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  color: #263247;
  letter-spacing: 0.5px;
}

.metric-desc {
  margin-top: 6px;
  font-size: 11px;
  color: #99a3b4;
}
</style>
