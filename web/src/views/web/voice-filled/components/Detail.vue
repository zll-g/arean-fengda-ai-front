<template>
  <div class="form-detail-page">
    <!-- 顶部信息 -->
    <div class="detail-header">
      <div class="header-left">
        <el-button text @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </div>
      <div class="header-center">
        <h2 class="detail-title">{{ formData?.title || '表单详情' }}</h2>
        <div class="detail-meta">
          <el-tag :type="statusTagType" effect="dark" round>{{ formData?.statusLabel }}</el-tag>
          <span class="meta-no">{{ formData?.formNo }}</span>
          <span class="meta-time">{{ formatDate(formData?.createdAt) }}</span>
        </div>
      </div>
      <div class="header-right">
        <el-dropdown trigger="click">
          <el-button type="primary">
            操作 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                :disabled="formData?.status === 'submitted'"
                @click="handleContinueFill"
              >
                <el-icon><Microphone /></el-icon> 继续语音填单
              </el-dropdown-item>
              <el-dropdown-item @click="handleReadback">
                <el-icon><VideoPlay /></el-icon> 语音回读
              </el-dropdown-item>
              <el-dropdown-item @click="handleValidate">
                <el-icon><CircleCheck /></el-icon> 智能校验
              </el-dropdown-item>
              <el-dropdown-item
                divided
                :disabled="formData?.status !== 'draft'"
                @click="handleConfirm"
              >
                <el-icon><Select /></el-icon> 确认表单
              </el-dropdown-item>
              <el-dropdown-item :disabled="formData?.status !== 'confirmed'" @click="handleSubmit">
                <el-icon><Upload /></el-icon> 提交表单
              </el-dropdown-item>
              <el-dropdown-item divided @click="handleInherit">
                <el-icon><CopyDocument /></el-icon> 继承创建新表单
              </el-dropdown-item>
              <el-dropdown-item
                :disabled="formData?.status === 'submitted'"
                type="danger"
                @click="handleDelete"
              >
                <el-icon><Delete /></el-icon> 删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div v-loading="loading" class="detail-body">
      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 表单数据 -->
        <el-tab-pane label="表单内容" name="content">
          <div v-if="templateDetail && formData" class="form-data-grid">
            <div
              v-for="field in templateDetail.fields"
              :key="field.fieldCode"
              class="data-field"
              :class="{ 'field-empty': !formData.formValues[field.fieldCode] }"
            >
              <div class="field-label-row">
                <span class="field-label">{{ field.fieldName }}</span>
                <el-tag v-if="field.unit" size="small" type="info">{{ field.unit }}</el-tag>
                <el-tag v-if="field.required === 1" size="small" type="danger">必填</el-tag>
              </div>
              <div class="field-value">
                <!-- 敏感字段提示 -->
                <template v-if="field.sensitive === 1 && formData.formValues[field.fieldCode]">
                  <span class="sensitive-value">
                    {{
                      maskSensitiveValue(formData.formValues[field.fieldCode], field.sensitiveType)
                    }}
                  </span>
                  <el-tooltip content="敏感数据已脱敏">
                    <el-icon class="sensitive-icon"><Lock /></el-icon>
                  </el-tooltip>
                </template>
                <!-- 选择类型：显示label -->
                <template v-else-if="field.fieldType === 'select' && field.options">
                  {{ getOptionLabel(field.options, formData.formValues[field.fieldCode]) || '-' }}
                </template>
                <!-- 普通字段 -->
                <template v-else>
                  {{ formData.formValues[field.fieldCode] ?? '-' }}
                </template>
              </div>
            </div>
          </div>

          <!-- 校验警告 -->
          <div v-if="warnings.length > 0" class="validation-section">
            <h4 class="section-title">
              <el-icon color="#f59e0b"><WarningFilled /></el-icon> 智能校验提醒
            </h4>
            <div class="warning-list">
              <el-alert
                v-for="(w, i) in warnings"
                :key="i"
                :title="w.fieldName + ': ' + w.warningMessage"
                :type="w.severity === 'error' ? 'error' : 'warning'"
                :closable="false"
                show-icon
                class="warning-item"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- 操作记录 -->
        <el-tab-pane label="操作记录" name="records">
          <div class="records-section">
            <el-timeline v-if="fillRecords.length > 0">
              <el-timeline-item
                v-for="record in fillRecords"
                :key="record.id"
                :timestamp="formatDate(record.createdAt)"
                placement="top"
                :type="getRecordTimelineType(record.action)"
                :hollow="record.action === 'create'"
              >
                <div class="record-card">
                  <div class="record-header">
                    <el-tag :type="getRecordTagType(record.action)" size="small">
                      {{ record.actionLabel }}
                    </el-tag>
                    <span v-if="record.source" class="record-source">
                      <el-icon><component :is="record.source === 'voice' ? 'Microphone' : 'Edit'" /></el-icon>
                      {{ record.source === 'voice' ? '语音' : '手动' }}
                    </span>
                  </div>
                  <p v-if="record.remark" class="record-remark">
                    {{ record.remark }}
                  </p>
                  <!-- 变更字段 -->
                  <div v-if="record.changeFields?.length" class="record-changes">
                    <span class="changes-label">变更字段：</span>
                    <el-tag
                      v-for="fc in record.changeFields"
                      :key="fc"
                      size="small"
                      type="info"
                      class="change-tag"
                    >
                      {{ getFieldLabel(fc) }}
                    </el-tag>
                  </div>
                  <!-- 展开看前后值差异 -->
                  <el-collapse
                    v-if="record.beforeSnapshot || record.afterSnapshot"
                    class="record-diff"
                  >
                    <el-collapse-item title="查看详细变更">
                      <div class="diff-grid">
                        <div class="diff-col">
                          <h5>变更前</h5>
                          <pre class="diff-pre">{{ formatJson(record.beforeSnapshot) }}</pre>
                        </div>
                        <div class="diff-col">
                          <h5>变更后</h5>
                          <pre class="diff-pre">{{ formatJson(record.afterSnapshot) }}</pre>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无操作记录" />
          </div>
        </el-tab-pane>

        <!-- 语音会话 -->
        <el-tab-pane label="语音会话" name="sessions">
          <div class="session-section">
            <div v-if="sessionMessages.length > 0" class="session-chat">
              <div
                v-for="msg in sessionMessages"
                :key="msg.id"
                class="session-msg"
                :class="msg.role"
              >
                <div class="msg-avatar">
                  <el-icon v-if="msg.role === 'user'"><User /></el-icon>
                  <el-icon v-else><Cpu /></el-icon>
                </div>
                <div class="msg-body">
                  <div class="msg-content">{{ msg.content }}</div>
                  <div class="msg-meta">
                    <span>{{ formatDate(msg.createdAt) }}</span>
                    <span v-if="msg.duration">{{ (msg.duration / 1000).toFixed(1) }}s</span>
                  </div>
                  <!-- 本轮字段更新 -->
                  <div
                    v-if="msg.fieldUpdates && Object.keys(msg.fieldUpdates).length"
                    class="msg-updates"
                  >
                    <span>更新：</span>
                    <el-tag v-for="(v, k) in msg.fieldUpdates" :key="k" size="small" type="success">
                      {{ getFieldLabel(String(k)) }} = {{ v }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无语音会话记录" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 继承创建弹窗 -->
    <el-dialog v-model="showInheritDialog" title="继承创建新表单" width="500px">
      <el-form label-width="100px">
        <el-form-item label="目标模板">
          <el-select v-model="inheritTemplateId" placeholder="选择要创建的模板" class="w-full">
            <el-option
              v-for="t in allTemplates"
              :key="t.id"
              :label="t.templateName"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <p class="inherit-hint">将把当前表单中同名字段的值预填到新表单中</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInheritDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!inheritTemplateId" @click="doInherit">
          确定创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import type {
  FormData as FormDataType,
  FormFillRecord,
  SessionMessage,
  Template,
  TemplateDetail,
  ValidationWarning,
} from '@/types';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import { computed, onMounted, ref } from 'vue';
const router = useRouter();
const route = useRoute();
const audioPlayer = useAudioPlayer();

const formId = computed(() => Number(route.params.id));
const loading = ref(false);
const activeTab = ref('content');

const formData = ref<FormDataType | null>(null);
const templateDetail = ref<TemplateDetail | null>(null);
const fillRecords = ref<FormFillRecord[]>([]);
const warnings = ref<ValidationWarning[]>([]);
const sessionMessages = ref<SessionMessage[]>([]);

// 继承
const showInheritDialog = ref(false);
const inheritTemplateId = ref<number | null>(null);
const allTemplates = ref<Template[]>([]);

const statusTagType = computed(() => {
  switch (formData.value?.status) {
    case 'draft':
      return 'warning';
    case 'confirmed':
      return 'success';
    case 'submitted':
      return 'info';
    default:
      return 'info';
  }
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const formRes = await api.voiceForm.getFormDetail(formId.value);
    formData.value = formRes.data;

    if (formData.value?.templateId) {
      const tmplRes = await api.voiceForm.getTemplateDetail(formData.value.templateId);
      templateDetail.value = tmplRes.data;
    }

    const recRes = await api.records.getFormRecords(formId.value);
    fillRecords.value = recRes.data || [];

    // 加载语音会话消息 — 从操作记录中找到 sessionId
    const sessionIds = new Set<string>();
    fillRecords.value.forEach((r: any) => {
      if (r.sessionId) sessionIds.add(r.sessionId);
    });

    if (sessionIds.size > 0) {
      try {
        // 取第一个会话的详情
        const firstSessionId = [...sessionIds][0];
        const sessRes = await api.voiceSession.getSessionDetail(firstSessionId);
        sessionMessages.value = sessRes.data?.messages || [];
      } catch (e) {
        console.warn('加载语音会话失败', e);
      }
    }
  } finally {
    loading.value = false;
  }
}

function getFieldLabel(fieldCode: string): string {
  const field = templateDetail.value?.fields.find((f) => f.fieldCode === fieldCode);
  return field?.fieldName || fieldCode;
}

function getOptionLabel(options: Array<{ value: string; label: string }>, value: any): string {
  if (!value || !options) return '';
  const opt = options.find((o) => o.value === value);
  return opt?.label || String(value);
}

function maskSensitiveValue(value: any, type: string): string {
  const str = String(value);
  if (type === 'phone' && str.length >= 7) {
    return str.substring(0, 3) + '****' + str.substring(str.length - 4);
  }
  if (type === 'idcard' && str.length >= 8) {
    return str.substring(0, 4) + '**********' + str.substring(str.length - 4);
  }
  if (type === 'amount') return '***';
  return str.substring(0, 1) + '***';
}

function getRecordTimelineType(action: string) {
  switch (action) {
    case 'create':
      return 'primary';
    case 'voice_fill':
      return 'success';
    case 'voice_correct':
      return 'warning';
    case 'confirm':
      return 'success';
    case 'submit':
      return 'info';
    default:
      return '';
  }
}

function getRecordTagType(action: string) {
  switch (action) {
    case 'create':
      return '';
    case 'voice_fill':
      return 'success';
    case 'voice_correct':
      return 'warning';
    case 'confirm':
      return 'success';
    case 'submit':
      return 'info';
    default:
      return 'info';
  }
}

function formatDate(d: string | undefined) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatJson(obj: any) {
  if (!obj) return '-';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

async function handleContinueFill() {
  if (formData.value) {
    router.push(`/form/${formData.value.templateId}?formDataId=${formData.value.id}`);
  }
}

async function handleReadback() {
  if (!formData.value || !templateDetail.value) return;
  try {
    const res = await api.voiceForm.readbackForm(
      formData.value.templateId,
      formData.value.formValues,
    );
    if (res.data?.audioBase64) {
      audioPlayer.playBase64(res.data.audioBase64);
      ElMessage.success('正在朗读...');
    }
  } catch {
    console.log(111);
  }
}

async function handleValidate() {
  if (!formData.value) return;
  try {
    const res = await api.voiceForm.validateForm(
      formData.value.templateId,
      formData.value.formValues,
    );
    warnings.value = res.data || [];
    if (warnings.value.length === 0) {
      ElMessage.success('校验通过，未发现异常');
    } else {
      ElMessage.warning(`发现 ${warnings.value.length} 项需要注意`);
    }
  } catch {
    console.log(111);
  }
}

async function handleConfirm() {
  if (!formData.value) return;
  await ElMessageBox.confirm('确认表单内容无误？', '确认');
  const res = await api.voiceForm.confirmForm(formData.value.id);
  formData.value = res.data;
  ElMessage.success('表单已确认');
}

async function handleSubmit() {
  if (!formData.value) return;
  await ElMessageBox.confirm('提交后不可修改，确定提交？', '提交');
  const res = await api.voiceForm.submitForm(formData.value.id);
  formData.value = res.data;
  ElMessage.success('表单已提交');
}

async function handleInherit() {
  // 加载全部模板
  const res = await api.voiceForm.getTemplateList();
  allTemplates.value = (res.data || []).filter(
    (t: Template) => t.id !== formData.value?.templateId,
  );
  showInheritDialog.value = true;
}

async function doInherit() {
  if (!formData.value || !inheritTemplateId.value) return;
  try {
    const res = await api.records.inheritForm(formData.value.id, inheritTemplateId.value);
    showInheritDialog.value = false;
    ElMessage.success('新表单已创建');
    router.push(`/web/form-data/${res.data.id}`);
  } catch {
    console.log(111);
  }
}

async function handleDelete() {
  if (!formData.value) return;
  await ElMessageBox.confirm('确定要删除此表单？', '删除', { type: 'warning' });
  await api.records.deleteForm(formData.value.id);
  ElMessage.success('已删除');
  router.push('/web/records');
}
</script>
<style lang="scss" scoped>
.form-detail-page {
  width: 100%;
  min-height: 100%;
  padding: 4px;
  margin: 0 auto;
  color: #0f172a;
}

/* 顶部详情栏 */
.detail-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 22px;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 96%), rgb(248 250 252 / 94%)),
    radial-gradient(circle at top left, rgb(79 70 229 / 9%), transparent 34%),
    radial-gradient(circle at bottom right, rgb(16 185 129 / 8%), transparent 32%);
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 22px;
  box-shadow: 0 16px 40px rgb(15 23 42 / 7%);
  backdrop-filter: blur(10px);

  .header-left {
    :deep(.el-button) {
      width: 38px;
      height: 38px;
      color: #64748b;
      background: #fff;
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px #e5e7eb;
      transition: all 0.22s ease;
    }

    :deep(.el-button:hover) {
      color: #1677ff;
      background: #eef2ff;
      box-shadow: 0 10px 20px rgb(79 70 229 / 12%);
      transform: translateY(-1px);
    }
  }

  .header-center {
    min-width: 0;
  }

  .detail-title {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 22px;
    font-weight: 850;
    line-height: 1.35;
    color: #0f172a;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  .detail-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 8px;

    :deep(.el-tag) {
      font-weight: 800;
      border: none;
      box-shadow: 0 8px 16px rgb(15 23 42 / 8%);
    }

    .meta-no,
    .meta-time {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      background: rgb(255 255 255 / 75%);
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px #e5e7eb;
    }

    .meta-no {
      color: #1677ff;
      background: #eef2ff;
      box-shadow: none;
    }
  }

  .header-right {
    :deep(.el-button--primary) {
      height: 38px;
      padding: 0 16px;
      font-weight: 800;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
      border: none;
      border-radius: 12px;
      box-shadow: 0 12px 24px rgb(79 70 229 / 23%);
      transition: all 0.22s ease;
    }

    :deep(.el-button--primary:hover) {
      box-shadow: 0 16px 30px rgb(79 70 229 / 28%);
      transform: translateY(-1px);
    }
  }

  @media (width <= 768px) {
    position: static;
    grid-template-columns: 1fr;
    gap: 14px;
    align-items: stretch;
    padding: 16px;
    border-radius: 18px;

    .header-left {
      display: flex;
      justify-content: flex-start;
    }

    .detail-title {
      font-size: 19px;
      white-space: normal;
    }

    .header-right {
      display: flex;
      justify-content: flex-end;
    }
  }
}

/* 主体容器 */
.detail-body {
  padding: 4px 24px 26px;
  overflow: hidden;
  background:
    linear-gradient(180deg, #fff, #fcfdff),
    radial-gradient(circle at bottom left, rgb(79 70 229 / 4%), transparent 36%);
  border: 1px solid rgb(226 232 240 / 92%);
  border-radius: 22px;
  box-shadow: 0 16px 42px rgb(15 23 42 / 6%);

  @media (width <= 768px) {
    padding: 4px 16px 18px;
    border-radius: 18px;
  }
}

/* Tabs */
.detail-tabs {
  :deep(.el-tabs__header) {
    margin: 0 0 22px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: #eef2f7;
  }

  :deep(.el-tabs__item) {
    height: 54px;
    padding: 0 22px;
    font-size: 14px;
    font-weight: 850;
    color: #64748b;
    transition: all 0.22s ease;
  }

  :deep(.el-tabs__item:hover) {
    color: #1677ff;
  }

  :deep(.el-tabs__item.is-active) {
    color: #1677ff;
  }

  :deep(.el-tabs__active-bar) {
    height: 3px;
    background: linear-gradient(135deg, #1677ff, #69b1ff);
    border-radius: 999px 999px 0 0;
  }
}

/* 表单内容字段网格 */
.form-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;

  @media (width <= 768px) {
    grid-template-columns: 1fr;
  }
}

.data-field {
  position: relative;
  min-height: 106px;
  padding: 17px 18px;
  overflow: hidden;
  background:
    linear-gradient(135deg, #fff, #f8fafc),
    radial-gradient(circle at top right, rgb(79 70 229 / 5%), transparent 34%);
  border: 1px solid rgb(226 232 240 / 95%);
  border-radius: 18px;
  box-shadow: 0 10px 26px rgb(15 23 42 / 4%);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    background 0.24s ease;

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    content: '';
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    opacity: 0;
    transition: opacity 0.24s ease;
  }

  &:hover {
    border-color: rgb(129 140 248 / 65%);
    box-shadow: 0 18px 36px rgb(15 23 42 / 8%);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }

  &.field-empty {
    background:
      linear-gradient(135deg, #fff, #f9fafb),
      repeating-linear-gradient(
        45deg,
        rgb(148 163 184 / 4%),
        rgb(148 163 184 / 4%) 6px,
        transparent 6px,
        transparent 12px
      );

    .field-value {
      font-weight: 800;
      color: #cbd5e1;
    }
  }

  .field-label-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    align-items: center;
    margin-bottom: 12px;

    .field-label {
      font-size: 13px;
      font-weight: 800;
      color: #64748b;
    }

    :deep(.el-tag) {
      font-weight: 750;
      border: none;
      border-radius: 999px;
    }
  }

  .field-value {
    font-size: 18px;
    font-weight: 850;
    line-height: 1.5;
    color: #0f172a;
    word-break: break-all;

    .sensitive-value {
      padding: 3px 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      color: #b45309;
      background: #fff7ed;
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgb(245 158 11 / 20%);
    }

    .sensitive-icon {
      margin-left: 6px;
      font-size: 15px;
      vertical-align: -2px;
      color: #d97706;
    }
  }
}

/* 校验提醒 */
.validation-section {
  padding: 18px;
  margin-top: 26px;
  background:
    linear-gradient(135deg, #fffbeb, #fff),
    radial-gradient(circle at top right, rgb(245 158 11 / 12%), transparent 32%);
  border: 1px solid rgb(245 158 11 / 18%);
  border-radius: 20px;

  .section-title {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 0 0 14px;
    font-size: 15px;
    font-weight: 850;
    color: #92400e;
  }

  .warning-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .warning-item {
    margin-bottom: 0;
    border: none;
    border-radius: 14px;
    box-shadow: 0 8px 18px rgb(245 158 11 / 8%);
  }
}

/* 操作记录 */
.records-section {
  padding: 10px 0 4px;

  :deep(.el-timeline) {
    padding-left: 8px;
  }

  :deep(.el-timeline-item__timestamp) {
    font-size: 12px;
    font-weight: 700;
    color: #94a3b8;
  }

  :deep(.el-timeline-item__node) {
    box-shadow: 0 0 0 4px #eef2ff;
  }

  :deep(.el-timeline-item__tail) {
    border-left-color: #e5e7eb;
  }
}

.record-card {
  padding: 16px 18px;
  background:
    linear-gradient(135deg, #fff, #f8fafc),
    radial-gradient(circle at top right, rgb(99 102 241 / 5%), transparent 30%);
  border: 1px solid rgb(226 232 240 / 95%);
  border-radius: 18px;
  box-shadow: 0 10px 26px rgb(15 23 42 / 5%);
  transition: all 0.24s ease;

  &:hover {
    border-color: rgb(129 140 248 / 65%);
    box-shadow: 0 18px 36px rgb(15 23 42 / 8%);
    transform: translateY(-2px);
  }

  .record-header {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;

    :deep(.el-tag) {
      font-weight: 800;
      border: none;
      border-radius: 999px;
    }

    .record-source {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 750;
      color: #64748b;
      background: #f1f5f9;
      border-radius: 999px;
    }
  }

  .record-remark {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.65;
    color: #475569;
  }

  .record-changes {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    align-items: center;
    margin-top: 10px;

    .changes-label {
      font-size: 12px;
      font-weight: 750;
      color: #94a3b8;
    }

    .change-tag {
      margin-bottom: 0;
      font-weight: 700;
      border: none;
      border-radius: 999px;
    }
  }

  .record-diff {
    margin-top: 12px;
    border: none;

    :deep(.el-collapse-item__header) {
      height: 36px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 800;
      color: #64748b;
      background: #f8fafc;
      border: none;
      border-radius: 12px;
    }

    :deep(.el-collapse-item__wrap) {
      background: transparent;
      border: none;
    }

    :deep(.el-collapse-item__content) {
      padding: 12px 0 0;
    }
  }

  .diff-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (width <= 768px) {
      grid-template-columns: 1fr;
    }

    .diff-col {
      min-width: 0;
    }

    h5 {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 850;
      color: #64748b;
    }

    .diff-pre {
      max-height: 220px;
      padding: 12px;
      margin: 0;
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.6;
      color: #e5e7eb;
      background: #0f172a;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
    }
  }
}

/* 语音会话 */
.session-section {
  padding: 8px 0 4px;
}

.session-chat {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background:
    linear-gradient(180deg, #f8fafc, #fff),
    radial-gradient(circle at top left, rgb(79 70 229 / 6%), transparent 32%);
  border: 1px solid #e5e7eb;
  border-radius: 22px;
}

.session-msg {
  display: flex;
  gap: 10px;
  max-width: 82%;

  &.user {
    flex-direction: row-reverse;
    align-self: flex-end;

    .msg-avatar {
      color: #fff;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
      box-shadow: 0 10px 20px rgb(79 70 229 / 20%);
    }

    .msg-content {
      color: #fff;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
      border-radius: 16px 16px 4px;
      box-shadow: 0 12px 24px rgb(79 70 229 / 18%);
    }

    .msg-meta {
      justify-content: flex-end;
    }
  }

  &.assistant {
    align-self: flex-start;

    .msg-avatar {
      color: #1677ff;
      background: #eef2ff;
      box-shadow: inset 0 0 0 1px rgb(79 70 229 / 12%);
    }

    .msg-content {
      color: #334155;
      background: #fff;
      border-radius: 16px 16px 16px 4px;
      box-shadow:
        0 10px 22px rgb(15 23 42 / 6%),
        inset 0 0 0 1px #e5e7eb;
    }
  }

  .msg-avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 14px;
  }

  .msg-body {
    min-width: 0;
  }

  .msg-content {
    padding: 11px 15px;
    font-size: 14px;
    line-height: 1.65;
    word-break: break-word;
  }

  .msg-meta {
    display: flex;
    gap: 8px;
    margin-top: 5px;
    font-size: 11px;
    font-weight: 650;
    color: #94a3b8;
  }

  .msg-updates {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 750;
    color: #64748b;

    :deep(.el-tag) {
      font-weight: 750;
      border: none;
      border-radius: 999px;
    }
  }

  @media (width <= 768px) {
    max-width: 100%;
  }
}

/* 继承创建弹窗 */
:deep(.el-dialog) {
  overflow: hidden;
  border-radius: 22px;
  box-shadow: 0 24px 70px rgb(15 23 42 / 18%);
}

:deep(.el-dialog__header) {
  padding: 20px 24px 14px;
  margin-right: 0;
  background:
    linear-gradient(135deg, #fff, #f8fafc),
    radial-gradient(circle at top right, rgb(79 70 229 / 8%), transparent 32%);
  border-bottom: 1px solid #eef2f7;
}

:deep(.el-dialog__title) {
  font-weight: 850;
  color: #0f172a;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 14px 24px 22px;
  border-top: 1px solid #eef2f7;
}

:deep(.el-dialog__footer .el-button) {
  height: 36px;
  font-weight: 750;
  border-radius: 12px;
}

:deep(.el-dialog__footer .el-button--primary) {
  background: linear-gradient(135deg, #1677ff, #69b1ff);
  border: none;
  box-shadow: 0 10px 20px rgb(79 70 229 / 20%);
}

/* 下拉菜单 */
:deep(.el-dropdown-menu) {
  padding: 8px;
  border-radius: 14px;
}

:deep(.el-dropdown-menu__item) {
  font-weight: 650;
  border-radius: 10px;
}

/* 表单控件 */
:deep(.el-select__wrapper),
:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #e5e7eb;
  transition: all 0.22s ease;
}

:deep(.el-select__wrapper:hover),
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgb(99 102 241 / 35%);
}

:deep(.el-select__wrapper.is-focused),
:deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px rgb(79 70 229 / 72%),
    0 10px 22px rgb(79 70 229 / 10%);
}

/* 空状态 */
:deep(.el-empty) {
  padding: 42px 0;
  margin-top: 28px;
  background: rgb(248 250 252 / 74%);
  border: 1px dashed #dbe3ef;
  border-radius: 20px;
}

.w-full {
  width: 100%;
}

.inherit-hint {
  padding: 12px 14px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

/* 移动端细节 */
@media (width <= 768px) {
  .form-detail-page {
    padding: 0;
  }

  .detail-tabs {
    :deep(.el-tabs__item) {
      height: 48px;
      padding: 0 14px;
      font-size: 13px;
    }
  }

  .data-field {
    min-height: auto;
    padding: 15px;
  }

  .session-chat {
    padding: 12px;
    border-radius: 18px;
  }

  .record-card {
    padding: 14px;
    border-radius: 16px;
  }
}
</style>
