<template>
  <main class="prediction-page">
    <header class="page-header">
      <div class="page-title-area">
        <div class="title-row">
          <span class="title-marker" />
          <h1>{{ t('predictionPage.pageTitle') }}</h1>
        </div>
        <p class="page-desc">{{ t('predictionPage.pageDesc') }}</p>
      </div>

      <div class="header-actions">
        <div class="model-status">
          <span class="status-dot" />
          <span>{{ metadata.modelStatus || t('predictionPage.modelStatusLoading') }}</span>
        </div>

        <nav class="tab-bar" :aria-label="t('predictionPage.predictionMode')">
          <button :class="{ active: activeTab === 'realtime' }" @click="switchTab('realtime')">
            {{ t('predictionPage.tab.realtime') }}
          </button>
          <button :class="{ active: activeTab === 'history' }" @click="switchTab('history')">
            {{ t('predictionPage.tab.history') }}
          </button>
        </nav>
      </div>
    </header>

    <section v-if="activeTab === 'realtime'" class="workspace">
      <div class="control-card">
        <div class="toolbar">
          <div class="toolbar-group">
            <label class="switch-row">
              <input v-model="realtime.autoRefresh" type="checkbox" @change="syncRealtimeTimer" />
              <span class="custom-checkbox" />
              <span>{{ t('predictionPage.control.autoRefresh') }}</span>
            </label>

            <label class="field-label">
              <span>{{ t('predictionPage.control.refreshInterval') }}</span>
              <select
                v-model.number="realtime.intervalSeconds"
                class="custom-select"
                @change="syncRealtimeTimer"
              >
                <option :value="1">{{ t('predictionPage.unit.second', { count: 1 }) }}</option>
                <option :value="2">{{ t('predictionPage.unit.second', { count: 2 }) }}</option>
              </select>
            </label>

            <button
              :disabled="realtime.fetching"
              class="btn btn-primary"
              @click="refreshRealtime(false)"
            >
              <span v-if="realtime.loading" class="loading-dot" />
              {{ t('predictionPage.control.manualRefresh') }}
            </button>
          </div>

          <span class="status-text" :class="{ error: realtime.error, loading: realtime.loading }">
            {{ realtimeMessage }}
          </span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">{{ t('predictionPage.summary.inputWindow') }}</span>
          <strong class="summary-value">
            {{ realtime.response?.inputStart?.slice(11, 19) || '--' }}
            <em>-</em>
            {{ realtime.response?.inputEnd?.slice(11, 19) || '--' }}
          </strong>
        </div>

        <div class="summary-card">
          <span class="summary-label">{{ t('predictionPage.summary.forecastWindow') }}</span>
          <strong class="summary-value">
            {{ realtime.response?.forecastStart?.slice(11, 19) || '--' }}
            <em>-</em>
            {{ realtime.response?.forecastEnd?.slice(11, 19) || '--' }}
          </strong>
        </div>

        <div class="summary-card summary-card-primary">
          <span class="summary-label">{{ t('predictionPage.summary.inputCount') }}</span>
          <strong class="summary-value count">
            {{ realtime.response?.dataQuality?.inputCount ?? '--' }}
          </strong>
        </div>
      </div>

      <div class="main-grid">
        <section class="chart-column">
          <section class="panel-card chart-card">
            <div class="panel-header">
              <div>
                <h2>{{ t('predictionPage.chart.inputTitle') }}</h2>
                <p>{{ t('predictionPage.chart.inputDesc') }}</p>
              </div>

              <div class="chart-actions">
                <button class="text-btn" @click="setChartVisibility('realtimeInput', true)">
                  {{ t('predictionPage.chart.showAll') }}
                </button>
                <button class="text-btn" @click="setChartVisibility('realtimeInput', false)">
                  {{ t('predictionPage.chart.hideAll') }}
                </button>
              </div>
            </div>

            <div class="chart-frame">
              <div ref="realtimeInputChartDom" class="echarts-container" />
            </div>
          </section>

          <section class="panel-card chart-card">
            <div class="panel-header">
              <div>
                <h2>{{ t('predictionPage.chart.targetTitle') }}</h2>
                <p>{{ t('predictionPage.chart.targetDesc') }}</p>
              </div>

              <div class="chart-actions">
                <button class="text-btn" @click="setChartVisibility('realtimeTarget', true)">
                  {{ t('predictionPage.chart.showAll') }}
                </button>
                <button class="text-btn" @click="setChartVisibility('realtimeTarget', false)">
                  {{ t('predictionPage.chart.hideAll') }}
                </button>
              </div>
            </div>

            <div class="chart-frame">
              <div ref="realtimeTargetChartDom" class="echarts-container" />
            </div>
          </section>
        </section>

        <aside class="side-column">
          <section class="fgr-card" :class="fgrLevelClass(realtime.response?.fgrRecommendation)">
            <div class="fgr-header">
              <div>
                <span class="fgr-label">{{ t('predictionPage.fgr.label') }}</span>
                <h3>{{ t('predictionPage.fgr.realtimeTitle') }}</h3>
              </div>

              <span class="level-badge">
                {{ fgrLevelText(realtime.response?.fgrRecommendation) }}
              </span>
            </div>

            <strong class="fgr-title">
              {{
                realtime.response?.fgrRecommendation?.title || t('predictionPage.fgr.waitingResult')
              }}
            </strong>

            <p class="fgr-detail">
              {{
                realtime.response?.fgrRecommendation?.detail ||
                  t('predictionPage.fgr.realtimeEmpty')
              }}
            </p>

            <div class="metric-list">
              <div class="metric-item">
                <span>{{ t('predictionPage.fgr.currentValve') }}</span>
                <strong>
                  {{ formatFgrValue(realtime.response?.fgrRecommendation?.currentValvePct, '%') }}
                </strong>
              </div>

              <div class="metric-item suggested">
                <span>{{ t('predictionPage.fgr.suggestedValve') }}</span>
                <strong>
                  {{ formatFgrValue(realtime.response?.fgrRecommendation?.suggestedValvePct, '%') }}
                </strong>
              </div>

              <div class="metric-item">
                <span>{{ t('predictionPage.fgr.currentFan') }}</span>
                <strong>
                  {{ formatFgrValue(realtime.response?.fgrRecommendation?.currentFanHz, 'Hz') }}
                </strong>
              </div>

              <div class="metric-item suggested">
                <span>{{ t('predictionPage.fgr.suggestedFan') }}</span>
                <strong>
                  {{ formatFgrValue(realtime.response?.fgrRecommendation?.suggestedFanHz, 'Hz') }}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>

    <section v-if="activeTab === 'history'" class="workspace">
      <div class="control-card">
        <div class="history-toolbar">
          <div class="toolbar-row">
            <label class="field-label">
              <span>{{ t('predictionPage.control.date') }}</span>
              <input v-model="history.date" type="date" class="custom-input" />
            </label>

            <label class="field-label">
              <span>{{ t('predictionPage.control.overviewSample') }}</span>
              <select v-model.number="history.intervalSeconds" class="custom-select">
                <option :value="5">{{ t('predictionPage.unit.second', { count: 5 }) }}</option>
                <option :value="10">{{ t('predictionPage.unit.second', { count: 10 }) }}</option>
                <option :value="30">{{ t('predictionPage.unit.second', { count: 30 }) }}</option>
                <option :value="60">{{ t('predictionPage.unit.second', { count: 60 }) }}</option>
              </select>
            </label>

            <button
              :disabled="history.loadingOverview"
              class="btn btn-secondary"
              @click="loadHistoryOverview"
            >
              <span v-if="history.loadingOverview" class="loading-dot blue" />
              {{ t('predictionPage.control.loadOverview') }}
            </button>

            <span class="split-line" />

            <label class="field-label datetime-field">
              <span>{{ t('predictionPage.control.predictionTime') }}</span>
              <input
                v-model="history.selectedLocalTime"
                type="datetime-local"
                step="1"
                class="custom-input datetime"
              />
            </label>

            <button class="btn btn-light" @click="moveHistory(-1)">
              {{ t('predictionPage.control.prevSecond') }}
            </button>
            <button class="btn btn-light" @click="moveHistory(1)">
              {{ t('predictionPage.control.nextSecond') }}
            </button>

            <button
              :disabled="history.loadingPrediction"
              class="btn btn-primary"
              @click="loadHistoryPrediction"
            >
              <span v-if="history.loadingPrediction" class="loading-dot" />
              {{ t('predictionPage.control.executePrediction') }}
            </button>
          </div>

          <div class="toolbar-row second-row">
            <label class="field-label">
              <span>{{ t('predictionPage.control.stepSpeed') }}</span>
              <select
                v-model.number="history.autoIntervalMs"
                class="custom-select"
                @change="syncHistoryAutoTimer"
              >
                <option :value="200">{{ t('predictionPage.unit.ms', { count: 200 }) }}</option>
                <option :value="400">{{ t('predictionPage.unit.ms', { count: 400 }) }}</option>
                <option :value="600">{{ t('predictionPage.unit.ms', { count: 600 }) }}</option>
                <option :value="800">{{ t('predictionPage.unit.ms', { count: 800 }) }}</option>
                <option :value="1000">{{ t('predictionPage.unit.ms', { count: 1000 }) }}</option>
              </select>
            </label>

            <button
              :class="{ active: history.autoDirection === -1 }"
              class="btn btn-outline"
              @click="startHistoryAuto(-1)"
            >
              {{ t('predictionPage.control.autoUp') }}
            </button>

            <button
              :class="{ active: history.autoDirection === 1 }"
              class="btn btn-outline"
              @click="startHistoryAuto(1)"
            >
              {{ t('predictionPage.control.autoDown') }}
            </button>

            <button
              :disabled="history.autoDirection === 0"
              class="btn btn-danger"
              @click="stopHistoryAuto('predictionPage.message.autoStopped')"
            >
              {{ t('predictionPage.control.stopAuto') }}
            </button>

            <span
              class="status-text"
              :class="{
                error: history.error,
                loading: history.loadingOverview || history.loadingPrediction,
              }"
            >
              {{ historyMessage }}
            </span>
          </div>
        </div>
      </div>

      <section class="panel-card overview-card">
        <div class="panel-header">
          <div>
            <h2>{{ t('predictionPage.chart.overviewTitle') }}</h2>
            <p>{{ t('predictionPage.chart.overviewDesc') }}</p>
          </div>

          <div class="chart-actions">
            <span class="info-tag">
              {{
                history.overview
                  ? t('predictionPage.chart.sampleCount', {
                    count: history.overview.sampleCount,
                  })
                  : t('predictionPage.chart.waitingDatasource')
              }}
            </span>
            <button class="text-btn" @click="setChartVisibility('overview', true)">
              {{ t('predictionPage.chart.showAll') }}
            </button>
            <button class="text-btn" @click="setChartVisibility('overview', false)">
              {{ t('predictionPage.chart.hideAll') }}
            </button>
          </div>
        </div>

        <div class="chart-frame compact">
          <div ref="overviewChartDom" class="echarts-container" />
        </div>
      </section>

      <div class="main-grid">
        <section class="chart-column">
          <section class="panel-card chart-card">
            <div class="panel-header">
              <div>
                <h2>{{ t('predictionPage.chart.inputTitle') }}</h2>
                <p>{{ t('predictionPage.chart.inputDesc') }}</p>
              </div>

              <div class="chart-actions">
                <button class="text-btn" @click="setChartVisibility('historyInput', true)">
                  {{ t('predictionPage.chart.showAll') }}
                </button>
                <button class="text-btn" @click="setChartVisibility('historyInput', false)">
                  {{ t('predictionPage.chart.hideAll') }}
                </button>
              </div>
            </div>

            <div class="chart-frame">
              <div ref="historyInputChartDom" class="echarts-container" />
            </div>
          </section>

          <section class="panel-card chart-card">
            <div class="panel-header">
              <div>
                <h2>{{ t('predictionPage.chart.targetTitle') }}</h2>
                <p>{{ t('predictionPage.chart.targetDesc') }}</p>
              </div>

              <div class="chart-actions">
                <button class="text-btn" @click="setChartVisibility('historyTarget', true)">
                  {{ t('predictionPage.chart.showAll') }}
                </button>
                <button class="text-btn" @click="setChartVisibility('historyTarget', false)">
                  {{ t('predictionPage.chart.hideAll') }}
                </button>
              </div>
            </div>

            <div class="chart-frame">
              <div ref="historyTargetChartDom" class="echarts-container" />
            </div>
          </section>
        </section>

        <aside class="side-column">
          <section class="fgr-card" :class="fgrLevelClass(history.response?.fgrRecommendation)">
            <div class="fgr-header">
              <div>
                <span class="fgr-label">{{ t('predictionPage.fgr.label') }}</span>
                <h3>{{ t('predictionPage.fgr.historyTitle') }}</h3>
              </div>

              <span class="level-badge">
                {{ fgrLevelText(history.response?.fgrRecommendation) }}
              </span>
            </div>

            <strong class="fgr-title">
              {{
                history.response?.fgrRecommendation?.title ||
                  t('predictionPage.fgr.waitingSnapshot')
              }}
            </strong>

            <p class="fgr-detail">
              {{
                history.response?.fgrRecommendation?.detail || t('predictionPage.fgr.historyEmpty')
              }}
            </p>

            <div class="metric-list">
              <div class="metric-item">
                <span>{{ t('predictionPage.fgr.snapshotValve') }}</span>
                <strong>
                  {{ formatFgrValue(history.response?.fgrRecommendation?.currentValvePct, '%') }}
                </strong>
              </div>

              <div class="metric-item suggested">
                <span>{{ t('predictionPage.fgr.suggestedValve') }}</span>
                <strong>
                  {{ formatFgrValue(history.response?.fgrRecommendation?.suggestedValvePct, '%') }}
                </strong>
              </div>

              <div class="metric-item">
                <span>{{ t('predictionPage.fgr.snapshotFan') }}</span>
                <strong>
                  {{ formatFgrValue(history.response?.fgrRecommendation?.currentFanHz, 'Hz') }}
                </strong>
              </div>

              <div class="metric-item suggested">
                <span>{{ t('predictionPage.fgr.suggestedFan') }}</span>
                <strong>
                  {{ formatFgrValue(history.response?.fgrRecommendation?.suggestedFanHz, 'Hz') }}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import * as echarts from 'echarts';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const chartColors = [
  '#2F80ED',
  '#27AE60',
  '#F2994A',
  '#EB5757',
  '#9B51E0',
  '#00A3FF',
  '#13C2C2',
  '#FAAD14',
  '#52C41A',
  '#722ED1',
];

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';

  const number = Number(value);
  if (Math.abs(number) >= 100) return number.toFixed(1);
  if (Math.abs(number) >= 10) return number.toFixed(2);
  return number.toFixed(3);
}

function toLocalInputValue(isoText) {
  return isoText ? isoText.slice(0, 19) : '';
}

function toChinaApiTime(localValue) {
  return localValue ? `${localValue}+08:00` : '';
}

function getDatePart(localValue) {
  return localValue ? localValue.slice(0, 10) : '';
}

function formatChinaLocalInput(date) {
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
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function shiftLocalSeconds(localValue, seconds) {
  if (!localValue) return '';

  const date = new Date(`${localValue}+08:00`);
  return formatChinaLocalInput(new Date(date.getTime() + seconds * 1000));
}

async function apiGet(path) {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json();

  if (String(payload.code) !== '200') {
    const error = new Error(
      payload.message || t('predictionPage.message.apiBusinessCode', { code: payload.code }),
    );
    error.code = payload.code;
    throw error;
  }

  return payload.data;
}

function valueFromSnapshot(snapshot, point) {
  if (!snapshot || !point) return null;

  const value = Number(snapshot[point.snapshotPropertyName]);
  return Number.isFinite(value) ? value : null;
}

function buildSnapshotSeries(snapshots, points, suffix = '') {
  return points.map((point, index) => {
    const rawPoints = snapshots
      .map((snapshot) => ({
        timestamp: snapshot.recordedAt,
        value: valueFromSnapshot(snapshot, point),
      }))
      .filter((item) => item.value !== null);

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

function buildForecastSeries(forecast, points, colorOffset = 0) {
  if (!forecast?.series?.length) return [];

  return points
    .map((point, index) => {
      const series = forecast.series.find(
        (item) => item.pointName.toLowerCase() === point.pointName.toLowerCase(),
      );

      if (!series) return null;

      return {
        key: `${point.pointName}:forecast`,
        point,
        label: `${point.label}${t('predictionPage.chart.forecastSuffix')}`,
        color: chartColors[(index + colorOffset) % chartColors.length],
        points: series.points.map((item) => ({
          timestamp: item.timestamp,
          value: Number(item.value),
        })),
        dashed: true,
      };
    })
    .filter(Boolean);
}

function getFixedRange(point) {
  const min = Number(point.lowScale);
  const max = Number(point.highScale);

  return Number.isFinite(min) && Number.isFinite(max) && max > min ? { min, max } : null;
}

const activeTab = ref('realtime');
const metadata = ref({ modelStatus: '', points: [] });

const realtime = reactive({
  autoRefresh: true,
  intervalSeconds: 2,
  timer: null,
  loading: false,
  fetching: false,
  error: false,
  messageKey: 'predictionPage.message.waitingData',
  messageParams: {},
  rawMessage: '',
  response: null,
});

const history = reactive({
  date: '',
  intervalSeconds: 10,
  autoIntervalMs: 400,
  autoDirection: 0,
  autoTimer: null,
  selectedLocalTime: '',
  loadingOverview: false,
  loadingPrediction: false,
  error: false,
  messageKey: 'predictionPage.message.waitingHistory',
  messageParams: {},
  rawMessage: '',
  overview: null,
  response: null,
});

const realtimeMessage = computed(() => {
  return realtime.rawMessage || t(realtime.messageKey, realtime.messageParams);
});

const historyMessage = computed(() => {
  return history.rawMessage || t(history.messageKey, history.messageParams);
});

function setRealtimeMessage(messageKey, messageParams = {}) {
  realtime.messageKey = messageKey;
  realtime.messageParams = messageParams;
  realtime.rawMessage = '';
}

function setRealtimeRawMessage(message) {
  realtime.rawMessage = message || '';
}

function setHistoryMessage(messageKey, messageParams = {}) {
  history.messageKey = messageKey;
  history.messageParams = messageParams;
  history.rawMessage = '';
}

function setHistoryRawMessage(message) {
  history.rawMessage = message || '';
}

const overviewChartDom = ref(null);
const realtimeInputChartDom = ref(null);
const realtimeTargetChartDom = ref(null);
const historyInputChartDom = ref(null);
const historyTargetChartDom = ref(null);

const chartInstances = {
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
    .filter((p) => p.isModelInput)
    .sort((a, b) => a.displayOrder - b.displayOrder);
});

const targetPoints = computed(() => {
  return metadata.value.points
    .filter((p) => p.isModelTarget)
    .sort((a, b) => a.displayOrder - b.displayOrder);
});

function fgrLevelClass(rec) {
  const level = rec?.level ?? 'unavailable';
  const names = ['unavailable', 'normal', 'watch', 'warning', 'danger'];

  if (Number.isInteger(level) && names[level]) return names[level];

  return String(level).toLowerCase();
}

function fgrLevelText(rec) {
  return t(`predictionPage.fgr.level.${fgrLevelClass(rec)}`);
}

function formatFgrValue(value, unit) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '--';

  return `${formatNumber(number)}${unit ? ` ${unit}` : ''}`;
}

function createEChartsLine(domElement, seriesList, clickCallback = null) {
  if (!domElement) return null;

  const allTimestamps = Array.from(
    new Set(seriesList.flatMap((s) => s.points.map((p) => p.timestamp))),
  ).sort();

  const rangeByPoint = new Map();

  for (const s of seriesList) {
    const key = s.point.pointName;
    const fixedRange = getFixedRange(s.point);

    if (fixedRange) {
      rangeByPoint.set(key, fixedRange);
      continue;
    }

    const values = s.points.map((p) => p.value).filter((v) => Number.isFinite(v));

    if (values.length === 0) continue;

    const existing = rangeByPoint.get(key);
    const min = Math.min(...values, existing?.min ?? Number.POSITIVE_INFINITY);
    const max = Math.max(...values, existing?.max ?? Number.NEGATIVE_INFINITY);

    rangeByPoint.set(key, { min, max });
  }

  const echartsSeries = seriesList.map((s) => {
    const range = rangeByPoint.get(s.point.pointName) ?? { min: 0, max: 1 };
    const isConstant = Math.abs(range.max - range.min) < 1e-9;
    const valuesMap = new Map(s.points.map((p) => [p.timestamp, p.value]));

    const dataPayload = allTimestamps.map((time) => {
      const actual = valuesMap.get(time);

      if (actual === undefined || actual === null || !Number.isFinite(actual)) {
        return [time, null, null, s.point.unit];
      }

      const normalized = isConstant ? 50 : ((actual - range.min) / (range.max - range.min)) * 100;

      return [time, normalized, actual, s.point.unit];
    });

    return {
      name: s.label,
      type: 'line',
      data: dataPayload,
      showSymbol: allTimestamps.length <= 160,
      symbolSize: 5,
      smooth: 0.22,
      connectNulls: false,
      emphasis: {
        focus: 'series',
      },
      lineStyle: {
        width: s.dashed ? 2 : 2.4,
        type: s.dashed ? 'dashed' : 'solid',
        color: s.color,
      },
      itemStyle: {
        color: s.color,
        borderWidth: 1,
        borderColor: '#ffffff',
      },
      areaStyle: s.dashed ? undefined : { opacity: 0.06 },
    };
  });

  const instance = echarts.getInstanceByDom(domElement) || echarts.init(domElement);
  const oldOption = instance.getOption?.();
  const oldSelected = oldOption?.legend?.[0]?.selected;

  const option = {
    backgroundColor: 'transparent',
    color: chartColors,
    animationDuration: 280,
    grid: {
      left: 18,
      right: 20,
      top: 34,
      bottom: 44,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#ffffff',
      borderColor: '#dbe7ff',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: '#1f2937',
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 10px 28px rgba(24, 72, 132, 0.16); border-radius: 10px;',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(47, 128, 237, 0.45)',
          width: 1,
          type: 'dashed',
        },
      },
      formatter: (params) => {
        if (!params.length) return '';

        let html = `<div style="font-weight:700;margin-bottom:8px;color:#1f2937">${params[0].value[0].replace('T', ' ').split('+')[0]}</div>`;

        params.forEach((item) => {
          const actualVal = item.value[2];
          const unitStr = item.value[3] ? ` ${item.value[3]}` : '';

          if (actualVal !== null) {
            html += `
              <div style="display:flex;align-items:center;justify-content:space-between;min-width:210px;margin:5px 0;gap:16px;">
                <span style="display:flex;align-items:center;color:#4b5563;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:8px;"></span>
                  ${item.seriesName}
                </span>
                <span style="font-weight:700;color:#111827">${formatNumber(actualVal)}${unitStr}</span>
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
      itemHeight: 7,
      icon: 'roundRect',
      selected: oldSelected || undefined,
      textStyle: {
        color: '#667085',
        fontSize: 11,
      },
      pageTextStyle: {
        color: '#667085',
      },
      pageIconColor: '#2F80ED',
      pageIconInactiveColor: '#cbd5e1',
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#d6e1f2',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#667085',
        fontSize: 11,
        formatter: (value) => (value ? value.slice(11, 19) : ''),
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        color: '#667085',
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: {
        lineStyle: {
          color: '#eef2f8',
          type: 'dashed',
        },
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      name: t('predictionPage.chart.normalizedView'),
      nameTextStyle: {
        color: '#98a2b3',
        fontSize: 11,
        padding: [0, 0, 0, 40],
      },
    },
    graphic:
      allTimestamps.length === 0
        ? {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: t('predictionPage.chart.noData'),
              fill: '#98a2b3',
              fontSize: 14,
              fontWeight: 500,
            },
          }
        : undefined,
    series: echartsSeries,
  };

  instance.setOption(option, {
    notMerge: true,
    lazyUpdate: true,
  });

  instance.off('click');

  if (clickCallback) {
    instance.on('click', (params) => {
      if (params.value && params.value[0]) {
        clickCallback(params.value[0]);
      }
    });
  }

  return instance;
}

function setChartVisibility(chartKey, visible) {
  const chart = chartInstances[chartKey];

  if (!chart) return;

  const option = chart.getOption();
  const legendUpdate = {};

  (option.series || []).forEach((s) => {
    legendUpdate[s.name] = visible;
  });

  chart.setOption({
    legend: {
      selected: legendUpdate,
    },
  });
}

async function switchTab(tabName) {
  if (tabName !== 'history') stopHistoryAuto();

  activeTab.value = tabName;

  await nextTick();
  rerenderCharts();
}

function handleResize() {
  Object.values(chartInstances).forEach((instance) => instance?.resize());
}

async function refreshRealtime(silent = false) {
  if (realtime.fetching) return;

  realtime.fetching = true;

  if (!silent) {
    realtime.loading = true;
    realtime.error = false;
    setRealtimeMessage('predictionPage.message.refreshingRealtime');
  }

  try {
    const data = await apiGet('/network/api/predictions/latest');

    realtime.response = data;
    realtime.error = false;

    if (!silent) {
      setRealtimeMessage('predictionPage.message.syncSuccess', {
        time: data.inputEnd.replace('T', ' ').split('+')[0],
      });
    }

    await nextTick();
    renderRealtimeCharts();
  } catch (error) {
    if (!silent) {
      realtime.error = true;
      setRealtimeRawMessage(error.message);
    } else {
      console.warn('Realtime silent refresh failed:', error);
    }
  } finally {
    realtime.fetching = false;

    if (!silent) {
      realtime.loading = false;
    }
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
    setHistoryMessage('predictionPage.message.selectDate');
    return;
  }

  history.loadingOverview = true;
  history.error = false;

  try {
    const query = new URLSearchParams({
      date: history.date,
      intervalSeconds: String(history.intervalSeconds),
    });

    history.overview = await apiGet(`/network/api/history/day/overview?${query}`);
    setHistoryMessage('predictionPage.message.overviewLoaded', {
      count: history.overview.sampleCount,
    });

    await nextTick();
    renderOverviewChart();
  } catch (error) {
    history.error = true;
    setHistoryRawMessage(error.message);
  } finally {
    history.loadingOverview = false;
  }
}

async function loadHistoryPrediction() {
  if (!history.selectedLocalTime) {
    history.error = true;
    setHistoryMessage('predictionPage.message.selectHistoryTime');
    return false;
  }

  history.loadingPrediction = true;
  history.error = false;

  try {
    const time = encodeURIComponent(toChinaApiTime(history.selectedLocalTime));

    history.response = await apiGet(`/network/api/predictions/history?time=${time}`);
    setHistoryMessage('predictionPage.message.predictionSuccess', {
      start: history.response.inputStart.slice(11, 19),
      end: history.response.forecastEnd.slice(11, 19),
    });

    await nextTick();
    renderHistoryCharts();

    return true;
  } catch (error) {
    history.error = true;
    setHistoryRawMessage(error.message);

    return false;
  } finally {
    history.loadingPrediction = false;
  }
}

function moveHistory(seconds) {
  stepHistory(seconds);
}

async function stepHistory(seconds) {
  if (history.loadingPrediction) return;

  if (!history.selectedLocalTime) {
    history.error = true;
    setHistoryMessage('predictionPage.message.timestampError');
    stopHistoryAuto();
    return;
  }

  history.selectedLocalTime = shiftLocalSeconds(history.selectedLocalTime, seconds);

  const success = await loadHistoryPrediction();

  if (!success && history.autoDirection !== 0) {
    stopHistoryAuto('predictionPage.message.autoStoppedByError');
  }
}

function startHistoryAuto(direction) {
  if (!history.selectedLocalTime) {
    history.error = true;
    setHistoryMessage('predictionPage.message.selectStartTime');
    return;
  }

  stopHistoryAuto();

  history.autoDirection = direction;
  setHistoryMessage(
    direction > 0 ? 'predictionPage.message.autoForward' : 'predictionPage.message.autoBackward',
  );

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

function stopHistoryAuto(messageKey = '') {
  if (history.autoTimer) {
    window.clearInterval(history.autoTimer);
    history.autoTimer = null;
  }

  history.autoDirection = 0;

  if (messageKey) setHistoryMessage(messageKey);
}

function rerenderCharts() {
  renderOverviewChart();
  renderRealtimeCharts();
  renderHistoryCharts();
}

function renderOverviewChart() {
  if (!overviewChartDom.value || !history.overview) return;

  const series = buildSnapshotSeries(history.overview.samples, overviewPoints.value);

  chartInstances.overview = createEChartsLine(overviewChartDom.value, series, (clickedTime) => {
    history.selectedLocalTime = toLocalInputValue(clickedTime);
    loadHistoryPrediction();
  });
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

function renderPredictionCharts(prefix, response, inputDom, targetDom) {
  if (!inputDom || !targetDom) return;

  const inputKey = `${prefix}Input`;
  const targetKey = `${prefix}Target`;

  const inputSeries = buildSnapshotSeries(response.inputData ?? [], inputPoints.value);
  const actualSeries = buildSnapshotSeries(
    response.actualFutureData ?? [],
    targetPoints.value,
    t('predictionPage.chart.actualSuffix'),
  );
  const forecastSeries = buildForecastSeries(response.forecast, targetPoints.value);

  chartInstances[inputKey] = createEChartsLine(inputDom, inputSeries);
  chartInstances[targetKey] = createEChartsLine(targetDom, actualSeries.concat(forecastSeries));
}

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  syncRealtimeTimer();
  try {
    const resMetadata = await apiGet('/network/api/metadata/points');
    metadata.value = resMetadata;

    const latest = await apiGet('/network/api/history/latest?count=1');

    if (latest.length > 0) {
      const selected = shiftLocalSeconds(toLocalInputValue(latest[0].recordedAt), -60);

      history.selectedLocalTime = selected;
      history.date = getDatePart(selected);

      await loadHistoryOverview();
      await loadHistoryPrediction();
    } else {
      history.date = formatChinaLocalInput(new Date()).slice(0, 10);
    }
  } catch (error) {
    history.error = true;
    setHistoryRawMessage(error.message);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);

  stopRealtimeTimer();
  stopHistoryAuto();

  Object.keys(chartInstances).forEach((k) => {
    chartInstances[k]?.dispose();
    chartInstances[k] = null;
  });
});
</script>

<style scoped>
.prediction-page {
  --primary: #2f80ed;
  --success: #27ae60;
  --warning: #f2994a;
  --danger: #eb5757;
  --bg: #f5f7fb;
  --card: #fff;
  --border: #e5e7eb;
  --text: #101828;
  --muted: #667085;

  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 12px;
  overflow: auto;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text);
  background: var(--bg);
}

.prediction-page * {
  box-sizing: border-box;
}

button,
input,
select {
  font: inherit;
}

.page-header,
.control-card,
.panel-card,
.summary-card,
.fgr-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.page-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.title-marker {
  width: 4px;
  height: 20px;
  background: var(--primary);
  border-radius: 10px;
}

.page-title-area h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
}

.page-desc {
  margin: 4px 0 0 12px;
  font-size: 13px;
  color: var(--muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.model-status {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--primary);
  white-space: nowrap;
  background: #eef6ff;
  border-radius: 16px;
}

.status-dot {
  width: 7px;
  height: 7px;
  background: var(--success);
  border-radius: 50%;
}

.tab-bar {
  display: inline-flex;
  padding: 3px;
  background: #eef2f7;
  border-radius: 8px;
}

.tab-bar button {
  min-width: 88px;
  height: 30px;
  padding: 0 14px;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.tab-bar button.active {
  color: #fff;
  background: var(--primary);
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.control-card {
  padding: 12px;
}

.toolbar,
.history-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toolbar-group,
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.toolbar-row.second-row {
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.switch-row,
.field-label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: #344054;
}

.switch-row {
  cursor: pointer;
  user-select: none;
}

.switch-row input {
  position: absolute;
  pointer-events: none;
  opacity: 0;
}

.custom-checkbox {
  position: relative;
  width: 16px;
  height: 16px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

.switch-row input:checked + .custom-checkbox {
  background: var(--primary);
  border-color: var(--primary);
}

.switch-row input:checked + .custom-checkbox::after {
  position: absolute;
  top: 1px;
  left: 4px;
  width: 5px;
  height: 9px;
  content: '';
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-select,
.custom-input {
  min-width: 96px;
  height: 34px;
  padding: 0 10px;
  font-size: 13px;
  color: #344054;
  outline: none;
  background: #fff;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
}

.custom-select:focus,
.custom-input:focus {
  border-color: var(--primary);
}

.custom-input.datetime {
  width: 210px;
  font-family: Consolas, Monaco, monospace;
}

.datetime-field {
  min-width: 280px;
}

.btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-primary {
  color: #fff;
  background: var(--primary);
}

.btn-secondary {
  color: var(--primary);
  background: #eff6ff;
  border-color: #bfdbfe;
}

.btn-light,
.btn-outline {
  color: #344054;
  background: #fff;
  border-color: #d0d5dd;
}

.btn-outline.active {
  color: var(--primary);
  background: #eff6ff;
  border-color: var(--primary);
}

.btn-danger {
  color: var(--danger);
  background: #fff5f5;
  border-color: #fecaca;
}

.loading-dot {
  width: 12px;
  height: 12px;
  border: 2px solid rgb(255 255 255 / 45%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-dot.blue {
  border-color: rgb(47 128 237 / 25%);
  border-top-color: var(--primary);
}

.status-text {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}

.status-text::before {
  width: 7px;
  height: 7px;
  content: '';
  background: var(--primary);
  border-radius: 50%;
}

.status-text.error {
  color: var(--danger);
}

.status-text.error::before {
  background: var(--danger);
}

.split-line {
  width: 1px;
  height: 28px;
  background: var(--border);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 180px;
  gap: 12px;
}

.summary-card {
  min-height: 76px;
  padding: 14px 16px;
}

.summary-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--muted);
}

.summary-value {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-family: Consolas, Monaco, monospace;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.summary-value em {
  font-style: normal;
  color: #98a2b3;
}

.summary-value.count {
  font-size: 26px;
  color: var(--primary);
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 12px;
  align-items: stretch;
  min-height: 0;
}

.chart-column {
  display: grid;
  grid-template-rows: repeat(2, minmax(320px, 1fr));
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.side-column {
  min-width: 0;
}

.panel-card {
  min-width: 0;
  padding: 14px;
}

.chart-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-header h2 {
  margin: 0;
  font-size: 15px;
}

.panel-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.chart-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.text-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 5px;
}

.text-btn:hover {
  background: #eff6ff;
}

.info-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--primary);
  background: #eff6ff;
  border-radius: 5px;
}

.chart-frame {
  flex: 1;
  width: 100%;
  min-height: 320px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.chart-frame.compact {
  height: 260px;
  min-height: 260px;
}

.echarts-container {
  width: 100%;
  height: 100%;
}

.fgr-card {
  height: 100%;
  padding: 16px;
  border-left: 4px solid #98a2b3;
}

.fgr-header {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 14px;
}

.fgr-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}

.fgr-header h3 {
  margin: 0;
  font-size: 16px;
}

.level-badge {
  height: 22px;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 700;
  line-height: 22px;
  color: var(--muted);
  background: #f2f4f7;
  border-radius: 5px;
}

.fgr-title {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
  line-height: 1.4;
}

.fgr-detail {
  min-height: 56px;
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted);
}

.metric-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.metric-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
}

.metric-item span {
  font-size: 13px;
  color: var(--muted);
}

.metric-item strong {
  font-family: Consolas, Monaco, monospace;
  font-size: 15px;
  text-align: right;
}

.metric-item.suggested strong {
  color: var(--primary);
}

.fgr-card.normal {
  border-left-color: var(--success);
}

.fgr-card.watch {
  border-left-color: var(--primary);
}

.fgr-card.warning {
  border-left-color: var(--warning);
}

.fgr-card.danger {
  border-left-color: var(--danger);
}

.fgr-card.normal .level-badge {
  color: var(--success);
  background: #ecfdf3;
}

.fgr-card.watch .level-badge {
  color: var(--primary);
  background: #eff6ff;
}

.fgr-card.warning .level-badge {
  color: #b96b00;
  background: #fff7e6;
}

.fgr-card.danger .level-badge {
  color: var(--danger);
  background: #fff1f0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (width <= 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .fgr-card {
    height: auto;
  }
}

@media (width <= 900px) {
  .prediction-page {
    padding: 10px;
  }

  .page-header,
  .header-actions,
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tab-bar,
  .toolbar-group,
  .toolbar-row {
    width: 100%;
  }

  .tab-bar button {
    flex: 1;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .chart-column {
    grid-template-rows: none;
  }

  .chart-frame {
    height: 300px;
    min-height: 300px;
  }

  .split-line {
    display: none;
  }

  .datetime-field,
  .custom-input.datetime {
    width: 100%;
  }
}
</style>
