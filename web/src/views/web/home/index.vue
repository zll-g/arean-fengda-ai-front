<template>
  <div class="dashboard-root">
    <header class="header-section">
      <div>
        <h1 class="welcome-text">{{ greeting }}，{{ getUserInfo()?.nickname }}</h1>
        <div class="status-bar">
          <i class="icon-placeholder" />
          <span>当前有待办事项 8 项</span>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <section class="side-col">
        <el-card class="panel todo-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="section-title">
                <div class="icon-box bg-orange">待办</div>
                <div class="text-group">
                  <span class="m-title">待办事项</span>
                  <span class="s-title">共 8 项待处理</span>
                </div>
              </div>

              <div class="header-actions">
                <el-button type="success" size="small" class="round-btn">批量同意</el-button>
                <el-button type="danger" size="small" class="round-btn">批量拒绝</el-button>
              </div>
            </div>
          </template>

          <div class="todo-list">
            <div v-for="(item, index) in todoList" :key="index" class="todo-item">
              <el-checkbox v-model="item.checked" />

              <div class="todo-content">
                <div class="todo-title-row">
                  <el-tag :type="item.tagType" size="small" effect="light" class="type-tag">
                    {{ item.tag }}
                  </el-tag>
                  <span class="todo-title">{{ item.title }}</span>
                </div>

                <div class="todo-meta">
                  <span><i class="icon-placeholder" /> 发起人：{{ item.user }}</span>
                  <span><i class="icon-placeholder" /> {{ item.time }}</span>
                  <span :class="item.urgencyClass">
                    <i class="icon-placeholder" /> 紧急：{{ item.urgency }}
                  </span>
                </div>
              </div>

              <el-button type="primary" plain size="small" class="go-btn">去处理 ></el-button>
            </div>
          </div>

          <div class="view-more-footer">
            <span class="more-trigger">查看更多待办</span>
          </div>
        </el-card>

        <el-card class="panel rec-card" shadow="never">
          <div class="rec-header">
            <span class="m-title">知识库个性化推荐</span>
            <span class="s-title">基于您的浏览历史推荐</span>
          </div>

          <div class="rec-list">
            <div v-for="(item, index) in recList" :key="index" class="rec-item">
              <div class="rec-main">
                <div class="rec-title-row">
                  <el-tag :type="item.tagType" size="small" effect="plain">
                    {{ item.tag }}
                  </el-tag>
                  <span class="rec-name">{{ item.title }}</span>
                </div>

                <div class="rec-meta">
                  更新时间：{{ item.time }}
                  <span class="divider">·</span>
                  阅读量：{{ item.views }}
                </div>
              </div>

              <div class="rec-score">{{ item.score }}%</div>
            </div>
          </div>
        </el-card>
      </section>

      <section class="content-col">
        <el-card class="panel tool-card" shadow="never">
          <div class="tool-header">
            <div class="section-title">
              <div class="icon-box bg-blue">语音</div>
              <div class="text-group">
                <span class="m-title">语音填单</span>
                <span class="s-title">快速语音录入，智能生成表单</span>
              </div>
            </div>
          </div>

          <div class="preview-list">
            <div
              v-for="item in templates"
              :key="item.id || item.templateId || item.templateName"
              class="preview-item"
              @click="handleStartForm(item)"
            >
              <div class="preview-main">
                <div class="preview-title-row">
                  <h3 class="preview-title">{{ item.templateName }}</h3>
                  <div class="preview-tags">
                    <el-tag size="small" effect="light">
                      {{ handleName(item.category) }}
                    </el-tag>
                    <el-tag size="small" type="info" effect="plain">
                      v{{ item.currentVersion }}
                    </el-tag>
                  </div>
                </div>

                <p class="preview-desc">
                  {{ item.description || t('templateList.noDescription') }}
                </p>
              </div>

              <div class="preview-extra">
                <span>
                  <el-icon><Edit /></el-icon>
                  {{ t('templateList.fieldCount', { count: item.fieldCount || 0 }) }}
                </span>
                <span>
                  <el-icon><Clock /></el-icon>
                  {{ formatDate(item.createdAt) }}
                </span>
              </div>
            </div>

            <el-empty
              v-if="!templates.length"
              description="暂无可用模板"
              :image-size="72"
              class="empty-box"
            />
          </div>
        </el-card>

        <el-card class="panel tool-card" shadow="never">
          <div class="tool-header">
            <div class="section-title">
              <div class="icon-box bg-purple">问答</div>
              <div class="text-group">
                <span class="m-title">知识库问答</span>
                <span class="s-title">智能检索，快速获取专业知识</span>
              </div>
            </div>
          </div>

          <div class="preview-list compact-list">
            <div
              v-for="item in menuData"
              :key="item.id"
              class="preview-item"
              @click="handleViewDetail(item.id)"
            >
              <div class="preview-main">
                <div class="preview-title-row">
                  <h3 class="preview-title">{{ item.name }}</h3>
                  <el-tag size="small" type="info" effect="plain">
                    {{ item.documentCount || 0 }} {{ t('knowledgeBase.documentUnit') }}
                  </el-tag>
                </div>
              </div>
            </div>

            <el-empty
              v-if="!menuData.length"
              description="暂无知识库"
              :image-size="72"
              class="empty-box"
            />
          </div>
        </el-card>

        <el-card class="panel tool-card" shadow="never">
          <div class="tool-header">
            <div class="section-title">
              <div class="icon-box bg-teal">问数</div>
              <div class="text-group">
                <span class="m-title">智能问数</span>
                <span class="s-title">自然语言查询，自动生成报表</span>
              </div>
            </div>
          </div>

          <div class="preview-list datasource-list">
            <div
              v-for="ds in dataSourceList"
              :key="ds.id"
              class="preview-item datasource-item"
              @click="handlePushDataQuery(ds.id)"
            >
              <div class="ds-icon" :class="ds.status === 1 ? 'active' : 'inactive'">
                <el-icon :size="22"><Coin /></el-icon>
              </div>

              <div class="preview-main">
                <div class="preview-title-row">
                  <h3 class="preview-title">{{ ds.name }}</h3>
                  <el-tag :type="ds.status === 1 ? 'success' : 'danger'" size="small">
                    {{
                      ds.status === 1
                        ? t('datasourceManage.enabled')
                        : t('datasourceManage.disabled')
                    }}
                  </el-tag>
                </div>

                <p class="preview-desc">{{ ds.dbType }} · {{ ds.host }}:{{ ds.port }}</p>

                <div class="ds-meta">
                  <span>{{ t('datasourceManage.database') }}：{{ ds.dbName || '-' }}</span>
                  <span>
                    {{ t('datasourceManage.lastTest') }}：
                    <template v-if="ds.lastTestResult === 1">
                      {{ t('datasourceManage.success') }}
                    </template>
                    <template v-else-if="ds.lastTestResult === 0">
                      {{ t('datasourceManage.failed') }}
                    </template>
                    <template v-else>
                      {{ t('datasourceManage.untested') }}
                    </template>
                  </span>
                </div>
              </div>
            </div>

            <el-empty
              v-if="!dataSourceList.length"
              description="暂无数据源"
              :image-size="72"
              class="empty-box"
            />
          </div>
        </el-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Clock, Coin, Edit } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { useI18n } from 'vue-i18n';
import { useDatasourceStore } from '@/store/datasource';
import { useChatStore } from '@/store/modules/knowledge-chat';
import api from '@/api';
import { router } from '@/router';
import { getUserInfo } from '@/utils/device';

const { t } = useI18n();
const dsStore = useDatasourceStore();
const chatStore = useChatStore();
const greeting = ref<string>('您好');
const templates = ref<any[]>([]);
const categories = ref<any[]>([]);
const menuData = ref<any[]>([]);
const dataSourceList = ref<any[]>([]);

const todoList = ref([
  {
    checked: false,
    tag: '缺陷单',
    tagType: 'danger',
    title: '#2锅炉引风机轴承温度异常升高缺陷处理',
    user: '张运维',
    time: '2026-03-20 08:15',
    urgency: '高',
    urgencyClass: 'c-red',
  },
  {
    checked: false,
    tag: '工单',
    tagType: 'primary',
    title: '#1机组C级检修工作票审批',
    user: '王检修',
    time: '2026-03-20 07:42',
    urgency: '中',
    urgencyClass: 'c-blue',
  },
  {
    checked: false,
    tag: '采购',
    tagType: 'success',
    title: '2026年第二季度备品备件采购申请审批',
    user: '刘采购',
    time: '2026-03-19 16:30',
    urgency: '低',
    urgencyClass: 'c-gray',
  },
  {
    checked: false,
    tag: '审批',
    tagType: 'info',
    title: '环保设施运行参数调整申请审批',
    user: '陈环保',
    time: '2026-03-19 15:18',
    urgency: '中',
    urgencyClass: 'c-blue',
  },
  {
    checked: false,
    tag: '工作票',
    tagType: 'warning',
    title: '电气配电室设备预防性试验工作票审批',
    user: '赵电气',
    time: '2026-03-19 14:05',
    urgency: '高',
    urgencyClass: 'c-red',
  },
]);

const recList = ref([
  {
    tag: '热门',
    tagType: 'primary',
    title: '锅炉运行维护规程2026版',
    time: '2026-01-15',
    views: '1248',
    score: 98,
  },
  {
    tag: '新发布',
    tagType: 'success',
    title: '电气设备安全操作指南',
    time: '2026-03-10',
    views: '568',
    score: 92,
  },
  {
    tag: '必备',
    tagType: 'warning',
    title: '应急预案处理流程大全',
    time: '2026-02-20',
    views: '2156',
    score: 99,
  },
]);

const handleViewDetail = (id: string) => {
  chatStore.updateKnowledgeBaseId(id);
  chatStore.createConversation();
  router.push(`/web/knowledge-management/knowledge-qa`);
};

const handlePushDataQuery = (id: string) => {
  dsStore.setCurrent(id);
  router.push(`/web/dataQuery-management/data-query`);
};

function handleStartForm(item: any) {
  router.push(`/web/form/${item.id}`);
}

const updateGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    greeting.value = '早上好';
  } else if (hour >= 12 && hour < 14) {
    greeting.value = '中午好';
  } else if (hour >= 14 && hour < 18) {
    greeting.value = '下午好';
  } else if (hour >= 18 && hour < 22) {
    greeting.value = '晚上好';
  } else {
    greeting.value = '夜深了';
  }
};

const handleName = (code: string) => {
  return categories.value.find((item: any) => item.code === code)?.name || code;
};

const formatDate = (date: string) => {
  return date ? dayjs(date).format('MM-DD HH:mm') : '-';
};

const loadDashboardData = async () => {
  api.voiceForm.getFormType().then((categoryRes) => {
    categories.value = categoryRes.data || [];
  });
  api.voiceForm.getTemplateList().then((templateRes) => {
    templates.value = templateRes.data || [];
  });
  api.base.getKnowledgeList().then((knowledgeRes) => {
    menuData.value = knowledgeRes.data || [];
  });
  api.datasource.getDatasourceList({ keyword: '' }).then((datasourceRes) => {
    dataSourceList.value = datasourceRes.data || [];
  });
};

onMounted(() => {
  updateGreeting();
  loadDashboardData();
});
</script>

<style lang="scss" scoped>
.dashboard-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 24px 32px;
  overflow: hidden;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: radial-gradient(circle at top left, rgb(64 158 255 / 8%), transparent 320px), #f6f8fb;
}

.header-section {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .welcome-text {
    margin: 0 0 8px;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.25;
    color: #303133;
  }

  .status-bar {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    color: #606266;
  }
}

.dashboard-main {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(560px, 700px) minmax(460px, 1fr);
  gap: 24px;
  min-height: 0;
}

.side-col,
.content-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  min-height: 0;
}

.panel {
  overflow: hidden;
  background: rgb(255 255 255 / 96%);
  border: 1px solid rgb(235 238 245 / 90%);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgb(31 45 61 / 8%);

  :deep(.el-card__header) {
    padding: 20px 24px;
    border-bottom: 1px solid #edf0f5;
  }

  :deep(.el-card__body) {
    box-sizing: border-box;
    height: 100%;
    padding: 0;
  }
}

.card-header,
.section-title,
.tool-header,
.header-actions {
  display: flex;
  align-items: center;
}

.card-header {
  gap: 16px;
  justify-content: space-between;
}

.section-title,
.tool-header {
  gap: 12px;
}

.header-actions {
  gap: 10px;
}

.round-btn {
  border-radius: 10px;
}

.icon-box {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  border-radius: 13px;
  box-shadow: 0 8px 18px rgb(31 45 61 / 12%);

  &.bg-orange {
    background: linear-gradient(135deg, #ffb020, #ff8a00);
  }

  &.bg-blue {
    background: linear-gradient(135deg, #4facfe, #409eff);
  }

  &.bg-purple {
    background: linear-gradient(135deg, #b65cff, #8e24aa);
  }

  &.bg-teal {
    background: linear-gradient(135deg, #20c997, #009688);
  }
}

.text-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.m-title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  color: #303133;
}

.s-title {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.35;
  color: #909399;
}

.todo-card {
  display: flex;
  flex-direction: column;
  height: 620px;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
}

.todo-list,
.rec-list,
.preview-list {
  min-height: 0;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dfe3ea;
    border-radius: 999px;
  }
}

.todo-list {
  flex: 1;
  padding: 0 24px;
}

.todo-item {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px dashed #edf0f5;

  &:last-child {
    border-bottom: none;
  }
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title-row,
.rec-title-row,
.preview-title-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.todo-title-row {
  margin-bottom: 8px;
}

.type-tag {
  flex-shrink: 0;
}

.todo-title,
.rec-name,
.preview-title {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #303133;
  white-space: nowrap;
}

.todo-title {
  font-size: 14px;
  font-weight: 600;
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: #909399;
}

.go-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 999px;
}

.view-more-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  height: 54px;
  background: #fbfcfe;
  border-top: 1px solid #edf0f5;
}

.more-trigger {
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--el-color-primary);
  }
}

.rec-card {
  height: 295px;
  padding: 20px 24px;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
  }
}

.rec-header {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 14px;
}

.rec-item {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px dashed #edf0f5;

  &:last-child {
    border-bottom: none;
  }
}

.rec-main {
  min-width: 0;
}

.rec-name {
  font-size: 14px;
  font-weight: 600;
}

.rec-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.divider {
  margin: 0 6px;
}

.rec-score {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 800;
  color: #f39c12;
}

.tool-card {
  flex: 1;
  min-height: 0;
  padding: 24px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &:hover {
    box-shadow: 0 16px 42px rgb(31 45 61 / 12%);
  }
}

.tool-header {
  flex-shrink: 0;
  margin-bottom: 18px;
}

.preview-list {
  display: grid;
  flex: 1;
  gap: 12px;
}

.compact-list {
  max-height: 180px;
}

.datasource-list {
  max-height: 245px;
}

.preview-item {
  display: flex;
  gap: 16px;
  align-items: center;
  min-width: 0;
  padding: 14px 16px;
  background: linear-gradient(180deg, #fff, #fbfcff);
  border: 1px solid #edf0f5;
  border-radius: 14px;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #f8fbff;
    border-color: rgb(64 158 255 / 28%);
  }
}

.preview-main {
  flex: 1;
  min-width: 0;
}

.preview-title-row {
  justify-content: space-between;
}

.preview-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.preview-tags,
.preview-extra {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.preview-tags {
  gap: 6px;
}

.preview-desc {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
  -webkit-box-orient: vertical;
}

.preview-extra {
  gap: 14px;
  color: #909399;

  span {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    font-size: 12px;
    white-space: nowrap;
  }
}

.datasource-item {
  align-items: flex-start;
}

.ds-icon {
  display: inline-flex;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;

  &.active {
    color: #0f9f6e;
    background: #e8fff6;
  }

  &.inactive {
    color: #f56c6c;
    background: #fff1f0;
  }
}

.ds-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.custom-search-input {
  flex-shrink: 0;
  margin-top: 16px;

  :deep(.el-input__wrapper) {
    height: 40px;
    background: #f6f8fb;
    border: 1px solid #edf0f5;
    border-radius: 999px;
    box-shadow: none !important;
  }
}

.tool-tip {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  background: #f8fafc;
  border-radius: 12px;
}

.empty-box {
  padding: 8px 0;
}

.icon-placeholder {
  display: inline-block;
  width: 14px;
  height: 14px;
  vertical-align: middle;
  background: rgb(31 45 61 / 7%);
  border-radius: 4px;
}

.c-red {
  color: #f56c6c;
}

.c-blue {
  color: #409eff;
}

.c-gray {
  color: #909399;
}

@media (width <= 1200px) {
  .dashboard-root {
    overflow-y: auto;
  }

  .dashboard-main {
    grid-template-columns: 1fr;
    overflow-y: visible;
  }

  .todo-card {
    height: auto;
    min-height: 520px;
  }

  .compact-list,
  .datasource-list {
    max-height: none;
  }
}

@media (width <= 768px) {
  .dashboard-root {
    padding: 16px;
  }

  .card-header,
  .preview-item,
  .preview-title-row {
    align-items: flex-start;
  }

  .card-header,
  .preview-item {
    flex-direction: column;
  }

  .header-actions,
  .preview-extra {
    justify-content: space-between;
    width: 100%;
  }

  .go-btn {
    display: none;
  }
}
</style>
