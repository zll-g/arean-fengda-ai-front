<template>
  <main class="monitor-page">
    <section class="monitor-panel">
      <header class="monitor-header">
        <div>
          <div class="page-tag">{{ t('opcuaMonitor.pageTag') }}</div>
          <h1>{{ t('opcuaMonitor.title') }}</h1>
          <p>{{ t('opcuaMonitor.description') }}</p>
        </div>

        <div class="global-status" :class="globalStatusInfo.type">
          <span class="dot" />
          {{ t('opcuaMonitor.globalStatus', { status: globalStatusInfo.text }) }}
        </div>
      </header>

      <section class="stat-grid">
        <article class="stat-card clickable" @click="openSessionModal">
          <div class="stat-head">
            <div>
              <h3>{{ t('opcuaMonitor.cards.server.title') }}</h3>
              <p>{{ t('opcuaMonitor.cards.server.desc') }}</p>
            </div>
            <div class="stat-icon">🔌</div>
          </div>

          <div class="stat-value">
            <strong>{{ details?.['opcua.servers.total'] }}</strong>
            <span>{{ t('opcuaMonitor.cards.server.unit') }}</span>
          </div>

          <div class="stat-desc success">
            {{
              t('opcuaMonitor.cards.server.connected', {
                count: details?.['opcua.servers.connected'] || 0,
              })
            }}
          </div>
        </article>

        <el-tooltip
          effect="light"
          placement="bottom"
          popper-class="callback-tooltip-popper"
          :show-after="120"
          :hide-after="0"
        >
          <template #content>
            <div class="callback-tooltip">
              <div class="callback-tooltip__title">
                <span class="callback-tooltip__dot" />
                <span>回调量统计</span>
              </div>

              <div class="callback-tooltip__row">
                <span>统计周期</span>
                <strong>
                  {{ formatTimestamp(details?.['subscription.stats']?.jvmStartTime || 0) || '-' }}
                  至今
                </strong>
              </div>
            </div>
          </template>
          <article class="stat-card">
            <div class="stat-head">
              <div>
                <h3>{{ t('opcuaMonitor.cards.subscription.title') }}</h3>
                <p>{{ t('opcuaMonitor.cards.subscription.desc') }}</p>
              </div>
              <div class="stat-icon">📡</div>
            </div>

            <div class="stat-value">
              <strong>{{ details?.['subscription.stats']?.totalSubscribed }}</strong>
              <span>{{ t('opcuaMonitor.cards.subscription.unit') }}</span>
            </div>

            <div class="stat-desc stat-row">
              <span>
                {{
                  t('opcuaMonitor.cards.subscription.callbacks', {
                    count: totalCallbacks,
                  })
                }}
              </span>
              <span class="success">
                {{
                  t('opcuaMonitor.cards.subscription.failed', {
                    count: details?.['subscription.stats']?.totalFailed || 0,
                  })
                }}
              </span>
            </div>
          </article>
        </el-tooltip>

        <article class="stat-card">
          <div class="stat-head">
            <div>
              <h3>{{ t('opcuaMonitor.cards.tdengine.title') }}</h3>
              <p>{{ t('opcuaMonitor.cards.tdengine.desc') }}</p>
            </div>
            <div class="stat-icon">🗄️</div>
          </div>

          <div class="td-status">
            <span class="dot" />
            {{ details?.['tdengine.status'] }}
          </div>

          <div class="td-url">{{ details?.['tdengine.url'] }}</div>
          <div class="stat-desc">
            {{
              t('opcuaMonitor.cards.tdengine.database', {
                name: details?.['tdengine.database'] || '-',
              })
            }}
          </div>
        </article>
      </section>

      <section class="table-card">
        <div class="table-header">
          <div>
            <h2>{{ t('opcuaMonitor.table.title') }}</h2>
            <p>{{ t('opcuaMonitor.table.total', { count: subNodeList.length }) }}</p>
          </div>
        </div>

        <div class="table-body">
          <table>
            <thead>
              <tr>
                <th>{{ t('opcuaMonitor.table.columns.nodeId') }}</th>

                <th>{{ t('opcuaMonitor.table.columns.dataType') }}</th>
                <th>{{ t('opcuaMonitor.table.columns.unit') }}</th>
                <th>{{ t('opcuaMonitor.table.columns.description') }}</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in pageData" :key="item.nodeId">
                <td class="mono break-text">{{ item.nodeId }}</td>

                <td>{{ item.dataType }}</td>
                <td>{{ item.unit }}</td>
                <td class="muted">{{ item.description }}</td>
              </tr>

              <tr v-if="!pageData.length">
                <td colspan="6" class="empty">{{ t('opcuaMonitor.table.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <div class="page-size">
            <span>{{ t('opcuaMonitor.pagination.pageSize') }}</span>
            <select v-model.number="pageSize" @change="currentPage = 1">
              <option :value="50">
                {{ t('opcuaMonitor.pagination.pageSizeOption', { size: 50 }) }}
              </option>
              <option :value="100">
                {{ t('opcuaMonitor.pagination.pageSizeOption', { size: 100 }) }}
              </option>
              <option :value="200">
                {{ t('opcuaMonitor.pagination.pageSizeOption', { size: 200 }) }}
              </option>
            </select>
          </div>

          <div class="page-actions">
            <button :disabled="currentPage <= 1" @click="currentPage--">
              {{ t('opcuaMonitor.pagination.prev') }}
            </button>
            <span>
              {{
                t('opcuaMonitor.pagination.pageInfo', { current: currentPage, total: totalPage })
              }}
            </span>
            <button :disabled="currentPage >= totalPage" @click="currentPage++">
              {{ t('opcuaMonitor.pagination.next') }}
            </button>
          </div>
        </div>
      </section>
    </section>

    <div v-if="sessionModalVisible" class="modal-mask" @click.self="closeSessionModal">
      <div class="modal-panel">
        <div class="modal-header">
          <h2>{{ t('opcuaMonitor.session.title') }}</h2>
          <button class="close-btn" @click="closeSessionModal">×</button>
        </div>

        <div class="modal-body">
          <table>
            <thead>
              <tr>
                <th>{{ t('opcuaMonitor.session.columns.sessionId') }}</th>
                <th>{{ t('opcuaMonitor.session.columns.address') }}</th>
                <th>{{ t('opcuaMonitor.session.columns.status') }}</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="item in sessionList" :key="item.sessionId">
                <td class="primary mono">{{ item.sessionId }}</td>
                <td class="mono">{{ item.address }}</td>
                <td>
                  <span class="status-tag" :class="item.online ? 'online' : 'offline'">
                    {{
                      item.online
                        ? t('opcuaMonitor.session.online')
                        : t('opcuaMonitor.session.offline')
                    }}
                  </span>
                </td>
              </tr>

              <tr v-if="!sessionList.length">
                <td colspan="3" class="empty">{{ t('opcuaMonitor.session.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { opcPrefix } from '@/api/http';

interface SubscriptionStats {
  totalFailed: number;
  jvmStartTime: number;
  totalCallbacks: number;
  totalSubscribed: number;
}

interface SubscriptionNode {
  namespaceIndex: number;
  nodeId: string;
  browseName: string;
  tagName: string;
  deviceId: string;
  unit: string;
  dataType: string;
  description: string;
}

interface MonitorDetails {
  'opcua.application': Record<string, string>;
  'opcua.servers.total': number;
  'opcua.servers.connected': number;
  'opcua.servers.status': Record<string, boolean>;
  'subscription.stats': SubscriptionStats;
  'subscription.nodes': SubscriptionNode[];
  'tdengine.url': string;
  'tdengine.database': string;
  'tdengine.status': string;
}

interface MonitorData {
  status: string;
  details: MonitorDetails;
}

interface SessionItem {
  sessionId: string;
  address: string;
  online: boolean;
}

const { t } = useI18n();

const monitorData = ref<MonitorData>({} as MonitorData);

const currentPage = ref(1);
const pageSize = ref(100);
const sessionModalVisible = ref(false);
const totalCallbacks = ref(0);

const details = computed(() => monitorData.value?.details);
const subNodeList = computed<SubscriptionNode[]>(() => details.value?.['subscription.nodes'] || []);

const totalPage = computed(() => Math.max(1, Math.ceil(subNodeList.value.length / pageSize.value)));

const pageData = computed<SubscriptionNode[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return subNodeList.value.slice(start, start + pageSize.value);
});

const sessionList = computed<SessionItem[]>(() => {
  const appMap = details.value?.['opcua.application'] || {};
  const statusMap = details.value?.['opcua.servers.status'] || {};

  return Object.entries(appMap).map(([sessionId, address]) => ({
    sessionId,
    address,
    online: Boolean(statusMap[sessionId]),
  }));
});

let opcuaSubscribedTimer: ReturnType<typeof window.setInterval> | null = null;
let opcuaSubscribedLoading = false;

function openSessionModal() {
  sessionModalVisible.value = true;
}

function closeSessionModal() {
  sessionModalVisible.value = false;
}

function formatTimestamp(timestamp: number | string) {
  if (!timestamp) return '';

  let time = Number(timestamp);

  // 兼容秒级时间戳
  if (time.toString().length === 10) {
    time *= 1000;
  }

  const date = new Date(time);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const hour = date.getHours();
  const minute = date.getMinutes();

  return `${year}-${month}-${day} ${hour}:${String(minute).padStart(2, '0')}`;
}

async function getHealthData() {
  try {
    const res: any = await fetch(`${opcPrefix}/actuator/health/opcuaHealth`, {
      method: 'GET',
    });
    const data = await res.json();

    monitorData.value = data;
    totalCallbacks.value = data?.details?.['subscription.stats']?.totalCallbacks || 0;
  } catch (error) {
    console.error('获取 opcuaHealth 失败：', error);
  }
}

async function getOpcuaSubscribed() {
  if (opcuaSubscribedLoading) return;

  try {
    opcuaSubscribedLoading = true;

    const res: any = await fetch(`${opcPrefix}/actuator/health/opcuaSubscribed`, {
      method: 'GET',
    });
    const data = await res.json();

    totalCallbacks.value = data?.details?.['subscription.stats']?.totalCallbacks || 0;
  } catch (error) {
    console.error('获取 opcuaSubscribed 失败：', error);
  } finally {
    opcuaSubscribedLoading = false;
  }
}

function startOpcuaSubscribedRefresh() {
  if (opcuaSubscribedTimer) return;

  getOpcuaSubscribed();

  opcuaSubscribedTimer = window.setInterval(() => {
    getOpcuaSubscribed();
  }, 1000);
}

function stopOpcuaSubscribedRefresh() {
  if (!opcuaSubscribedTimer) return;

  window.clearInterval(opcuaSubscribedTimer);
  opcuaSubscribedTimer = null;
}

const globalStatusInfo = computed(() => {
  const status = monitorData.value?.status?.toUpperCase();

  // 默认异常
  if (status !== 'UP') {
    return {
      type: 'error',
      text: '异常',
    };
  } else {
    return {
      type: 'success',
      text: status,
    };
  }
});

onMounted(() => {
  getHealthData();
  startOpcuaSubscribedRefresh();
});

// 如果页面被 keep-alive 缓存，重新进入时继续刷新
onActivated(() => {
  startOpcuaSubscribedRefresh();
});

// 如果页面被 keep-alive 缓存，切换离开时停止刷新
onDeactivated(() => {
  stopOpcuaSubscribedRefresh();
});

// 普通路由离开 / 组件销毁时停止刷新
onBeforeUnmount(() => {
  stopOpcuaSubscribedRefresh();
});
</script>

<style scoped lang="scss">
.monitor-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 20px;
  overflow: auto;
  color: #4a382c;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 10%) 0%, transparent 30%),
    linear-gradient(180deg, #fff9f3 0%, #fff4e9 100%);

  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* 主体面板 */
.monitor-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 24px;
  overflow: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, rgb(255 250 245 / 96%) 0%, #fff 280px);
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow:
    0 10px 30px rgb(126 72 24 / 8%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;

  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* 页面头部 */
.monitor-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;

  .page-tag {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #e86f0b;
    background: #fff0e2;
    border: 1px solid #ffd3aa;
    border-radius: 999px;
    box-shadow: 0 4px 10px rgb(249 115 22 / 8%);
  }

  h1 {
    position: relative;
    padding-left: 14px;
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    color: #4a382c;
    letter-spacing: 0.2px;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 24px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
      transform: translateY(-50%);
    }
  }

  p {
    margin: 8px 0 0 14px;
    font-size: 14px;
    color: #a18b7b;
  }
}

/* 全局状态 */
.global-status {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 999px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &.success {
    color: #15803d;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    box-shadow: 0 5px 14px rgb(34 197 94 / 8%);

    .dot {
      box-shadow: 0 0 0 4px rgb(34 197 94 / 14%);
    }
  }

  &.warning {
    color: #d97706;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    box-shadow: 0 5px 14px rgb(245 158 11 / 8%);

    .dot {
      box-shadow: 0 0 0 4px rgb(245 158 11 / 14%);
    }
  }

  &.error {
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
    box-shadow: 0 5px 14px rgb(239 68 68 / 8%);

    .dot {
      box-shadow: 0 0 0 4px rgb(239 68 68 / 14%);
    }
  }
}

.dot {
  width: 7px;
  height: 7px;
  background: currentcolor;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(255 138 38 / 14%);
}

/* 统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.stat-card,
.table-card,
.modal-panel {
  background: rgb(255 255 255 / 98%);
  border: 1px solid #f0dfcf;
  border-radius: 14px;
  box-shadow:
    0 8px 22px rgb(126 72 24 / 6%),
    0 0 0 1px rgb(255 255 255 / 68%) inset;
}

.stat-card {
  position: relative;
  box-sizing: border-box;
  min-height: 132px;
  padding: 18px;
  overflow: hidden;
  background: radial-gradient(circle at 100% 0%, rgb(255 138 38 / 5%) 0%, transparent 38%), #fff;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &::before {
    position: absolute;
    top: 0;
    right: 18px;
    left: 18px;
    height: 2px;
    content: '';
    background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
    opacity: 0;
    transition: opacity 0.22s ease;
  }

  &:hover {
    background:
      radial-gradient(circle at 100% 0%, rgb(255 138 38 / 8%) 0%, transparent 40%), #fffaf5;
    border-color: #ffc58f;
    box-shadow: 0 12px 28px rgb(249 115 22 / 11%);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }

    .stat-icon {
      box-shadow: 0 7px 16px rgb(249 115 22 / 14%);
      transform: scale(1.04);
    }
  }
}

.clickable {
  cursor: pointer;

  &:hover {
    border-color: #ffad61;
    box-shadow:
      0 14px 30px rgb(249 115 22 / 14%),
      0 0 0 4px rgb(255 138 38 / 4%);
    transform: translateY(-3px);
  }

  &:active {
    transform: translateY(-1px);
  }
}

.stat-head {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 18px;

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #4a382c;
  }

  p {
    margin: 6px 0 0;
    font-size: 12px;
    color: #a18b7b;
  }
}

.stat-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 19px;
  background: linear-gradient(135deg, #fff0e2 0%, #fff7ef 100%);
  border: 1px solid #ffd8b5;
  border-radius: 11px;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.stat-value {
  display: flex;
  gap: 8px;
  align-items: flex-end;

  strong {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
    color: #4a382c;
  }

  span {
    font-size: 13px;
    color: #a18b7b;
  }
}

.stat-desc {
  margin-top: 10px;
  font-size: 13px;
  color: #806b5b;
}

.stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* 语义状态色保留 */
.success {
  color: #15803d;
}

.primary {
  color: #f97316;
}

.muted {
  color: #8d7868;
}

.mono {
  font-family: Consolas, Monaco, monospace;
}

.break-text {
  word-break: break-all;
}

/* TDengine 状态 */
.td-status {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 20px;
  font-weight: 800;
  color: #15803d;

  .dot {
    box-shadow: 0 0 0 4px rgb(34 197 94 / 14%);
  }
}

.td-url {
  padding: 5px 8px;
  margin-top: 10px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  color: #6b5545;
  word-break: break-all;
  background: #fff7ef;
  border: 1px solid #f3e4d6;
  border-radius: 7px;
}

/* 表格卡片 */
.table-card {
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 5%), transparent 32%),
    linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-bottom: 1px solid #f3e4d6;

  h2 {
    position: relative;
    padding-left: 12px;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #4a382c;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 16px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }
  }

  p {
    margin: 6px 0 0 12px;
    font-size: 13px;
    color: #a18b7b;
  }
}

/* 表格滚动区域 */
.table-body {
  max-height: 400px;
  padding: 0 20px;
  overflow: auto;
  scrollbar-gutter: stable;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: #fffaf5;
    border-radius: 999px;
  }
}

/* 原生表格 */
table {
  width: 100%;
  font-size: 13px;
  border-collapse: collapse;

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #fffaf5;
  }

  th,
  td {
    padding: 14px 12px 14px 0;
    text-align: left;
    border-bottom: 1px solid #f3e4d6;
  }

  th {
    font-weight: 700;
    color: #806b5b;
    white-space: nowrap;
    background: #fffaf5;
  }

  td {
    color: #5b4738;
  }

  tbody tr {
    transition:
      background 0.18s ease,
      transform 0.18s ease;

    &:hover {
      background: #fff7ef;
    }
  }
}

.empty {
  padding: 36px 0;
  color: #b09b8c;
  text-align: center;
}

/* 分页 */
.pagination-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  font-size: 13px;
  color: #806b5b;
  background: linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  border-top: 1px solid #f3e4d6;
}

.page-size {
  display: flex;
  gap: 8px;
  align-items: center;

  select {
    height: 32px;
    padding: 0 30px 0 10px;
    color: #5b4738;
    cursor: pointer;
    outline: none;
    background: #fff;
    border: 1px solid #ead8c8;
    border-radius: 8px;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;

    &:hover {
      background: #fffaf5;
      border-color: #ffc58f;
    }

    &:focus {
      border-color: #ff8a26;
      box-shadow: 0 0 0 3px rgb(255 138 38 / 9%);
    }
  }
}

.page-actions {
  display: flex;
  gap: 10px;
  align-items: center;

  > span {
    font-weight: 600;
    color: #806b5b;
  }

  button {
    height: 32px;
    padding: 0 12px;
    font-weight: 600;
    color: #806b5b;
    cursor: pointer;
    background: #fff;
    border: 1px solid #ead8c8;
    border-radius: 8px;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      transform 0.18s ease;

    &:hover:not(:disabled) {
      color: #f97316;
      background: #fff0e2;
      border-color: #ffc58f;
      box-shadow: 0 5px 12px rgb(249 115 22 / 9%);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      color: #c8b5a6;
      cursor: not-allowed;
      background: #fffaf7;
      border-color: #f0dfcf;
    }
  }
}

/* 模态遮罩 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(65 40 25 / 42%);
}

.modal-panel {
  width: 100%;
  max-width: 760px;
  max-height: 80vh;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow:
    0 26px 70px rgb(70 40 20 / 24%),
    0 0 0 1px rgb(255 255 255 / 72%) inset;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
  border-bottom: 1px solid #f3e4d6;

  h2 {
    position: relative;
    padding-left: 12px;
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #4a382c;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 3px;
      height: 16px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }
  }
}

.modal-body {
  max-height: 60vh;
  padding: 0 20px 20px;
  overflow: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7b889;
    border-radius: 999px;

    &:hover {
      background: #d99a5d;
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  table {
    thead {
      background: #fffaf5;
    }

    th {
      background: #fffaf5;
    }

    tbody tr:hover {
      background: #fff7ef;
    }
  }
}

/* 关闭按钮 */
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  color: #a18b7b;
  cursor: pointer;
  background: #fff3e7;
  border: 1px solid #ffe0c2;
  border-radius: 9px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;

  &:hover {
    color: #f97316;
    background: #fff0e2;
    border-color: #ffc58f;
    transform: rotate(90deg);
  }
}

/* 在线状态 */
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;

  &.online {
    color: #15803d;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
  }

  &.offline {
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
  }
}

/* 响应式 */
@media (width <=1000px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}

@media (width <=768px) {
  .monitor-page {
    padding: 12px;
  }

  .monitor-panel {
    height: auto;
    min-height: 100%;
    padding: 16px;
  }

  .monitor-header {
    flex-direction: column;

    h1 {
      font-size: 22px;
    }
  }

  .global-status {
    align-self: flex-start;
  }

  .table-body {
    padding: 0 12px;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-actions {
    flex-wrap: wrap;
  }

  .modal-panel {
    max-height: 88vh;
    border-radius: 16px;
  }
}

@media (width <=480px) {
  .monitor-page {
    padding: 8px;
  }

  .monitor-panel {
    padding: 14px;
    border-radius: 14px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    strong {
      font-size: 28px;
    }
  }

  .table-header {
    padding: 16px;
  }

  .pagination-bar {
    padding: 12px 16px;
  }
}
</style>

<style lang="scss">
/* Tooltip 需要全局样式，保持橙色主题 */
.callback-tooltip-popper {
  padding: 0 !important;
  color: #5b4738 !important;
  background: #fff !important;
  border: 1px solid #f0d4bb !important;
  border-radius: 12px !important;
  box-shadow:
    0 14px 34px rgb(126 72 24 / 14%),
    0 0 0 1px rgb(255 255 255 / 72%) inset !important;
}

.callback-tooltip-popper .el-popper__arrow::before {
  background: #fff !important;
  border-color: #f0d4bb !important;
}

.callback-tooltip {
  min-width: 230px;
  padding: 12px 14px;
  background: radial-gradient(circle at 100% 0%, rgb(255 138 38 / 6%) 0%, transparent 35%), #fff;
  border-radius: 12px;
}

.callback-tooltip__title {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #4a382c;
  border-bottom: 1px solid #f3e4d6;
}

.callback-tooltip__dot {
  width: 8px;
  height: 8px;
  background: #ff8a26;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(255 138 38 / 12%);
}

.callback-tooltip__row {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  color: #a18b7b;
}

.callback-tooltip__row strong {
  font-size: 13px;
  font-weight: 700;
  color: #5b4738;
}
</style>
