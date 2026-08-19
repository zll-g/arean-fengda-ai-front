<template>
  <div v-loading="formStore.isLoading" class="voice-form-page">
    <!-- 头部信息 -->
    <div class="form-header">
      <div class="header-info">
        <div>
          <h2 class="form-title">
            {{ formStore.template?.templateName || '请选择模板' }}
          </h2>
          <p class="form-subtitle">
            {{ formStore.formData?.formNo || '未创建' }}
            <el-tag v-if="formStore.formData" :type="statusType" size="small" class="ml-2">
              {{ formStore.formData.statusLabel }}
            </el-tag>
          </p>
        </div>
      </div>
      <div class="header-actions desktop-only">
        <el-tooltip content="撤销 (Ctrl+Z)">
          <el-button :disabled="!canUndo" circle @click="handleUndo">
            <el-icon>
              <RefreshLeft />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)">
          <el-button :disabled="!canRedo" circle @click="handleRedo">
            <el-icon>
              <RefreshRight />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="智能校验">
          <el-button circle @click="handleValidate">
            <el-icon>
              <CircleCheck />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="语音回读">
          <el-button circle @click="handleReadback">
            <el-icon>
              <VideoPlay />
            </el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="completion-bar">
      <div class="bar-info">
        <!-- <span>填写进度</span> -->
        <span class="bar-percent">{{ formStore.completionRate }}%</span>
      </div>
      <el-progress
        :percentage="formStore.completionRate"
        :stroke-width="8"
        :show-text="false"
        :color="formStore.completionRate === 100 ? '#10b981' : '#6366f1'"
      />
    </div>

    <div class="form-body">
      <!-- 左侧表单 -->
      <div class="form-panel">
        <div class="form-content">
          <template v-for="field in formStore.visibleFields" :key="field.fieldCode">
            <div
              class="form-field"
              :class="{
                'field-required': field.required === 1,
                'field-filled': isFilled(field.fieldCode),
                'field-warning': getFieldWarning(field.fieldCode),
              }"
            >
              <label class="field-label">
                <span class="field-name">{{ field.fieldName }}</span>
                <span v-if="field.required === 1" class="field-required-mark">*</span>
                <span v-if="field.unit" class="field-unit">（{{ field.unit }}）</span>
              </label>

              <!-- 文本 + 主数据搜索 -->
              <el-input
                v-if="field.fieldType === 'text'"
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                clearable
                @change="onFieldChange(field.fieldCode)"
              >
                <template v-if="field.masterDataCode" #append>
                  <el-button @click="openMasterDataPicker(field)">
                    <el-icon>
                      <Search />
                    </el-icon>
                  </el-button>
                </template>
              </el-input>

              <!-- 数字 -->
              <el-input-number
                v-else-if="field.fieldType === 'number'"
                v-model="formStore.formValues[field.fieldCode]"
                :min="field.minValue ?? undefined"
                :max="field.maxValue ?? undefined"
                :precision="isPriceField(field) ? 2 : 0"
                controls-position="right"
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 日期 -->
              <el-date-picker
                v-else-if="field.fieldType === 'date'"
                v-model="formStore.formValues[field.fieldCode]"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="field.placeholder || `请选择${field.fieldName}`"
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 下拉 -->
              <el-select
                v-else-if="field.fieldType === 'select'"
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请选择${field.fieldName}`"
                clearable
                class="w-full"
                @change="onFieldChange(field.fieldCode)"
              >
                <el-option
                  v-for="opt in field.options || []"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <!-- 多行文本 -->
              <el-input
                v-else-if="field.fieldType === 'textarea'"
                v-model="formStore.formValues[field.fieldCode]"
                type="textarea"
                :rows="3"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 其他 -->
              <el-input
                v-else
                v-model="formStore.formValues[field.fieldCode]"
                :placeholder="field.placeholder || `请输入${field.fieldName}`"
                @change="onFieldChange(field.fieldCode)"
              />

              <!-- 偏好推荐 -->
              <div v-if="fieldRecommends[field.fieldCode]?.length" class="field-recommend">
                <span class="recommend-label">常用：</span>
                <el-tag
                  v-for="val in fieldRecommends[field.fieldCode].slice(0, 3)"
                  :key="val"
                  size="small"
                  class="recommend-tag"
                  @click="setFieldFromRecommend(field.fieldCode, val)"
                >
                  {{ val }}
                </el-tag>
              </div>

              <!-- 校验警告 -->
              <div v-if="getFieldWarning(field.fieldCode)" class="field-warning-msg">
                <el-icon>
                  <WarningFilled />
                </el-icon>
                {{ getFieldWarning(field.fieldCode) }}
              </div>
            </div>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <div class="action-buttons">
            <el-button
              class="btn-outline"
              type="primary"
              plain
              :icon="Check"
              :disabled="formStore.completionRate < 100"
              @click="handleConfirm"
            >
              智能校验
            </el-button>

            <el-button
              class="btn-solid"
              type="primary"
              :icon="Promotion"
              :disabled="formStore.formData?.status !== 'confirmed'"
              @click="handleSubmit"
            >
              提交表单
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右侧对话面板 -->
      <div class="chat-panel" :class="{ 'panel-expanded': showChat }">
        <div class="chat-header">
          <h3>智能填报助手</h3>
          <el-button v-if="isMobile" text @click="showChat = !showChat">
            <el-icon>
              <component :is="showChat ? 'ArrowDown' : 'ArrowUp'" />
            </el-icon>
          </el-button>
        </div>

        <!-- 引导话术 -->
        <div
          v-if="voiceStore.conversationHistory.length === 0 && formStore.template?.sampleSpeech"
          class="guide-banner"
        >
          <el-icon :size="20">
            <InfoFilled />
          </el-icon>
          <div>
            <p class="guide-title">语音引导</p>
            <p class="guide-text">{{ formStore.template.sampleSpeech }}</p>
          </div>
        </div>

        <!-- 对话历史 -->
        <div ref="chatMessagesRef" class="chat-messages">
          <div
            v-for="(msg, idx) in voiceStore.conversationHistory"
            :key="idx"
            class="message-item"
            :class="msg.role"
          >
            <div class="message-avatar">
              <el-icon v-if="msg.role === 'user'">
                <User />
              </el-icon>
              <el-icon v-else>
                <Cpu />
              </el-icon>
            </div>
            <div class="message-body">
              <div class="message-content">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              <el-button
                v-if="msg.audioBase64"
                text
                size="small"
                @click="audioPlayer.playBase64(msg.audioBase64!)"
              >
                <el-icon>
                  <VideoPlay />
                </el-icon>
                播放
              </el-button>
            </div>
          </div>

          <!-- 处理中 -->
          <div v-if="voiceStore.state === 'processing'" class="message-item assistant">
            <div class="message-avatar">
              <el-icon>
                <Cpu />
              </el-icon>
            </div>
            <div class="message-body">
              <div class="message-content typing">
                <span class="dot" /><span class="dot" /><span class="dot" />
                {{ voiceStore.processingMessage }}
              </div>
            </div>
          </div>
        </div>

        <!-- 语音输入区 -->
        <div class="voice-input-area">
          <div class="mode-switch">
            <el-radio-group v-model="voiceStore.mode" size="small">
              <el-radio-button value="normal">普通</el-radio-button>
              <el-radio-button value="wizard">向导</el-radio-button>
            </el-radio-group>
          </div>

          <div
            v-if="voiceStore.partialText || voiceStore.state === 'listening'"
            class="recognized-preview"
          >
            <el-icon>
              <Microphone />
            </el-icon>
            <span>{{ voiceStore.partialText || '正在听...' }}</span>
          </div>

          <div class="record-controls">
            <div class="text-input-wrapper">
              <el-input
                v-model="textInput"
                placeholder="也可以输入文字..."
                clearable
                @keyup.enter="handleTextSubmit"
              />
            </div>
            <button
              class="record-btn"
              :class="{
                recording: recorder.isRecording.value,
                processing: voiceStore.state === 'processing',
              }"
              :disabled="voiceStore.state === 'processing'"
              @mousedown="handleRecordStart"
              @mouseup="handleRecordStop"
              @touchstart.prevent="handleRecordStart"
              @touchend.prevent="handleRecordStop"
            >
              <div class="btn-inner">
                <el-icon v-if="!recorder.isRecording.value" :size="28">
                  <Microphone />
                </el-icon>
                <div v-else class="wave-bars">
                  <span v-for="i in 5" :key="i" class="voice-wave-bar" />
                </div>
              </div>
              <span class="btn-label">
                {{
                  recorder.isRecording.value
                    ? recorder.formatDuration(recorder.duration.value)
                    : voiceStore.state === 'processing'
                      ? '处理中...'
                      : '按住说话'
                }}
              </span>
            </button>
          </div>

          <div v-if="recorder.isRecording.value" class="volume-indicator">
            <div class="volume-bar" :style="{ width: recorder.audioLevel.value + '%' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端底部操作栏 -->
    <!-- <div class="mobile-bottom-bar mobile-only">
      <el-button :disabled="!canUndo" circle size="small" @click="handleUndo">
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
      <el-button :disabled="!canRedo" circle size="small" @click="handleRedo">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
      <el-button circle size="small" @click="handleReadback">
        <el-icon><VideoPlay /></el-icon>
      </el-button>
      <el-button type="primary" circle size="small" @click="showChat = !showChat">
        <el-icon><ChatDotRound /></el-icon>
      </el-button>
    </div> -->

    <!-- 主数据选择弹窗 -->
    <MasterDataPicker
      v-model:visible="showMasterPicker"
      :source-code="pickerSourceCode"
      :source-label="pickerSourceLabel"
      @select="handleMasterDataSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Promotion, Search } from '@element-plus/icons-vue';
import { useFormStore } from '@/store/formStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useRecorder } from '@/composables/useRecorder';
import { useAudioPlayer } from '@/composables/useAudioPlayer';
import { useHotkeys } from '@/composables/useHotkeys';
import api from '@/api/index';
import MasterDataPicker from '@/components/MasterDataPicker.vue';
import type { TemplateField } from '@/types';
import dayjs from 'dayjs';

const props = defineProps({
  templateId: {
    type: String,
    default: null,
  },
});

const isMobile = useMediaQuery('(max-width: 768px)');

const formStore = useFormStore();
const voiceStore = useVoiceStore();
const recorder = useRecorder();
const audioPlayer = useAudioPlayer();

const showChat = ref(!isMobile.value);
const textInput = ref('');
const chatMessagesRef = ref<HTMLElement>();
const fieldRecommends = ref<Record<string, string[]>>({});

// 主数据弹窗
const showMasterPicker = ref(false);
const pickerSourceCode = ref('');
const pickerSourceLabel = ref('');
const pickerTargetField = ref('');

const templateId = computed(() => Number(props.templateId));

const canUndo = computed(() => formStore.historyPointer > 0);
const canRedo = computed(() => formStore.historyPointer < formStore.historyStack.length - 1);

const statusType = computed(() => {
  switch (formStore.formData?.status) {
    case 'confirmed':
      return 'success';
    case 'submitted':
      return 'info';
    default:
      return 'warning';
  }
});

// 快捷键
useHotkeys({
  'ctrl+r': () => {
    if (recorder.isRecording.value) handleRecordStop();
    else handleRecordStart();
  },
  'ctrl+enter': () => handleConfirm(),
  'ctrl+z': () => handleUndo(),
  'ctrl+y': () => handleRedo(),
  escape: () => {
    if (recorder.isRecording.value) recorder.cancel();
    voiceStore.setIdle();
  },
});

watch(
  () => templateId.value,
  // async (val) => {
  async () => {
    await formStore.loadTemplate(templateId.value);
    // if (val) {
    //   // 继续填已有表单
    //   try {
    //     const res: any = await api.voiceForm.getFormDetail(val);
    //     formStore.formData = res.data;
    //     formStore.formValues = {
    //       ...formStore.formValues,
    //       ...(res.data.formValues || {}),
    //     };
    //   } catch (e) {
    //     console.error('加载已有表单失败', e);
    //   }
    // } else {
    //   await formStore.initFormData();
    // }

    await formStore.initFormData();

    loadRecommends();

    if (formStore.template?.sampleSpeech) {
      voiceStore.conversationHistory.push({
        role: 'assistant',
        content: `欢迎使用${formStore.template.templateName}。${formStore.template.sampleSpeech}`,
        timestamp: Date.now(),
      });
    }
  },
  {},
);

// onMounted(async () => {
//   await formStore.loadTemplate(templateId.value);

//   if (existingFormId.value) {
//     // 继续填已有表单
//     try {
//       const res: any = api.voiceForm.getFormDetail(existingFormId.value);
//       formStore.formData = res.data;
//       formStore.formValues = {
//         ...formStore.formValues,
//         ...(res.data.formValues || {}),
//       };
//     } catch (e) {
//       console.error('加载已有表单失败', e);
//     }
//   } else {
//     await formStore.initFormData();
//   }

//   loadRecommends();

//   if (formStore.template?.sampleSpeech) {
//     voiceStore.conversationHistory.push({
//       role: 'assistant',
//       content: `欢迎使用${formStore.template.templateName}。${formStore.template.sampleSpeech}`,
//       timestamp: Date.now(),
//     });
//   }
// });

onUnmounted(() => {
  recorder.cancel();
  formStore.$reset();
  voiceStore.$reset();
});

async function loadRecommends() {
  if (!formStore.template?.fields) return;
  for (const field of formStore.template.fields) {
    try {
      const res: any = await api.voiceForm.getRecommendedValues(templateId.value, field.fieldCode);
      if (res.data?.length) fieldRecommends.value[field.fieldCode] = res.data;
    } catch (e) {
      console.log(e);
    }
  }
}

function isFilled(fieldCode: string): boolean {
  const v = formStore.formValues[fieldCode];
  return v !== undefined && v !== null && v !== '';
}

function isPriceField(field: TemplateField): boolean {
  return (
    field.fieldCode.toLowerCase().includes('price') ||
    field.fieldCode.toLowerCase().includes('amount')
  );
}

function onFieldChange(fieldCode: string) {
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, formStore.formValues[fieldCode], 'manual');
}

function setFieldFromRecommend(fieldCode: string, val: string) {
  // @ts-expect-error
  formStore.setFieldValue(fieldCode, val, 'recommend');
}

function openMasterDataPicker(field: TemplateField) {
  pickerSourceCode.value = field.masterDataCode || '';
  pickerSourceLabel.value = field.fieldName;
  pickerTargetField.value = field.fieldCode;
  showMasterPicker.value = true;
}

function handleMasterDataSelected(item: any) {
  console.log(666);
  // 回填主数据
  // @ts-expect-error
  formStore.setFieldValue(pickerTargetField.value, item.kksCode, 'master_data');

  // 回填关联字段
  if (item.dataValues) {
    const updates: Record<string, any> = {};
    const allFieldCodes = formStore.template?.fields.map((f) => f.fieldCode) || [];

    for (const [key, val] of Object.entries(item.dataValues)) {
      if (allFieldCodes.includes(key)) updates[key] = val;
    }
    // productCode
    if (allFieldCodes.includes('productCode')) {
      updates['productCode'] = item.dataCode;
    }

    if (Object.keys(updates).length > 0) {
      formStore.setFieldValues(updates);
      ElMessage.success(`已联动填充 ${Object.keys(updates).length} 个字段`);
    }
  }
}

async function handleRecordStart() {
  const ok = await recorder.start();
  if (ok) {
    voiceStore.startRecording();
  } else {
    ElMessage.error('无法启动录音，请检查麦克风权限');
  }
}

async function handleRecordStop() {
  voiceStore.stopRecording();
  const audioBlob = await recorder.stop();
  if (!audioBlob || audioBlob.size === 0) {
    voiceStore.setIdle();
    return;
  }

  voiceStore.setProcessing('asr_processing', '正在识别语音...');

  try {
    const fd = new FormData();
    fd.append('audio', audioBlob, 'recording.wav');
    fd.append('templateId', String(templateId.value));
    if (formStore.formData?.id) fd.append('formDataId', String(formStore.formData.id));
    fd.append('mode', voiceStore.mode);
    if (voiceStore.mode === 'wizard') fd.append('wizardStep', String(voiceStore.wizardStep));
    fd.append('currentValuesJson', JSON.stringify(formStore.formValues));

    const res: any = await api.voiceForm.processAudio(fd);
    handlePipelineResult(res.data);
  } catch (err: any) {
    voiceStore.setError(err.message || '处理失败');
  }
}

async function handleTextSubmit() {
  const text = textInput.value.trim();
  if (!text) return;
  textInput.value = '';

  voiceStore.setProcessing('nlu_processing', '正在理解...');

  try {
    const res: any = await api.voiceForm.processText({
      text,
      templateId: templateId.value,
      formDataId: formStore.formData?.id,
      mode: voiceStore.mode,
      wizardStep: voiceStore.mode === 'wizard' ? voiceStore.wizardStep : undefined,
      currentValues: formStore.formValues,
      needTts: false,
    });
    handlePipelineResult(res.data);
  } catch (err: any) {
    voiceStore.setError(err.message || '处理失败');
  }
}

function handlePipelineResult(result: any) {
  if (!result.success) {
    voiceStore.setError(result.error || '处理失败');
    return;
  }

  voiceStore.setResult(result.recognizedText || '', result.replyText || '', result.ttsAudioBase64);

  if (result.fieldUpdates && Object.keys(result.fieldUpdates).length > 0) {
    formStore.setFieldValues(result.fieldUpdates);
  }

  if (result.updatedFormValues) {
    // 同步服务端返回的完整值（含计算联动结果）
    for (const [k, v] of Object.entries(result.updatedFormValues)) {
      if (formStore.formValues[k] === undefined || formStore.formValues[k] === null) {
        formStore.formValues[k] = v;
      }
    }
  }

  if (result.validationWarnings?.length) {
    formStore.validationWarnings = result.validationWarnings;
  }

  if (result.formDataId && !formStore.formData?.id) {
    formStore.formData = {
      ...formStore.formData,
      id: result.formDataId,
    } as any;
  }

  if (result.ttsAudioBase64) {
    audioPlayer.playBase64(result.ttsAudioBase64);
  }

  if (
    voiceStore.mode === 'wizard' &&
    result.nluResult?.intent === 'FILL_FORM' &&
    !result.needFollowUp
  ) {
    voiceStore.wizardStep++;
  }

  scrollToBottom();
}

async function handleUndo() {
  const ok = formStore.formData?.id ? await formStore.remoteUndo() : formStore.localUndo();
  if (ok) ElMessage.success('已撤销');
  else ElMessage.info('没有可撤销的操作');
}

async function handleRedo() {
  const ok = formStore.formData?.id ? await formStore.remoteRedo() : formStore.localRedo();
  if (ok) ElMessage.success('已重做');
  else ElMessage.info('没有可重做的操作');
}

async function handleValidate() {
  try {
    const res: any = await api.voiceForm.validateForm(templateId.value, formStore.formValues);
    const warnings = res.data || [];
    formStore.validationWarnings = warnings;
    if (warnings.length === 0) ElMessage.success('校验通过，未发现异常');
    else ElMessage.warning(`发现 ${warnings.length} 项需要注意`);
  } catch (e) {
    console.log(e);
  }
}

async function handleReadback() {
  try {
    const res: any = await api.voiceForm.readbackForm(templateId.value, formStore.formValues);
    const { text, audioBase64 } = res.data || {};
    if (audioBase64) {
      audioPlayer.playBase64(audioBase64);
      voiceStore.conversationHistory.push({
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        audioBase64,
      });
      scrollToBottom();
    } else if (text) {
      ElMessage.info(text);
    }
  } catch (e) {
    console.log(e);
  }
}

async function handleConfirm() {
  if (formStore.missingRequiredFields.length > 0) {
    const names = formStore.missingRequiredFields.map((f) => f.fieldName).join('、');
    ElMessage.warning(`还有必填项未填写：${names}`);
    return;
  }
  await ElMessageBox.confirm('确认表单内容无误？', '确认');
  if (formStore.formData?.id) {
    const res: any = await api.voiceForm.confirmForm(formStore.formData.id);
    formStore.formData = res.data;
    ElMessage.success('表单已确认');
  }
}

async function handleSubmit() {
  await ElMessageBox.confirm('提交后不可修改，确定提交？', '提交');
  if (formStore.formData?.id) {
    const res: any = await api.voiceForm.submitForm(formStore.formData.id);
    formStore.formData = res.data;
    ElMessage.success('表单已提交');
  }
}

function getFieldWarning(fieldCode: string): string | null {
  const w = formStore.validationWarnings.find((w) => w.fieldCode === fieldCode);
  return w?.warningMessage || null;
}

function formatTime(ts: number) {
  return dayjs(ts).format('HH:mm:ss');
}

function scrollToBottom() {
  nextTick(() => {
    const el = chatMessagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
</script>

<style lang="scss" scoped>
.voice-form-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  color: #4a382c;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 7%) 0%, transparent 28%),
    linear-gradient(180deg, #fffaf5 0%, #fff 260px);
}

/* 顶部信息 */
.form-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 0 0, rgb(255 138 38 / 8%), transparent 32%), rgb(255 255 255 / 94%);
  border: 1px solid #f0dfcf;
  border-radius: 20px;
  box-shadow:
    0 12px 32px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

.header-info {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.form-title {
  position: relative;
  max-width: 680px;
  padding-left: 14px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  color: #4a382c;
  white-space: nowrap;

  &::before {
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 21px;
    content: '';
    background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
    border-radius: 999px;
    box-shadow: 0 0 0 3px rgb(255 138 38 / 8%);
    transform: translateY(-50%);
  }
}

.form-subtitle {
  display: flex;
  align-items: center;
  margin: 8px 0 0 14px;
  font-size: 13px;
  color: #a18b7b;

  :deep(.el-tag) {
    font-weight: 600;
    border-radius: 999px;
  }

  :deep(.el-tag--success) {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  :deep(.el-tag--info) {
    color: #c25f05;
    background: #fff4e9;
    border-color: #ffd3aa;
  }

  :deep(.el-tag--warning) {
    color: #d97706;
    background: #fff7ed;
    border-color: #fed7aa;
  }
}

/* 头部快捷按钮 */
.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  padding: 5px;
  background: #fff7ef;
  border: 1px solid #f0dfcf;
  border-radius: 999px;

  :deep(.el-button.is-circle) {
    width: 36px;
    height: 36px;
    margin-left: 0;
    color: #9b806c;
    background: transparent;
    border: none;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover:not(.is-disabled) {
      color: #f97316;
      background: #fff;
      box-shadow: 0 8px 18px rgb(249 115 22 / 12%);
      transform: translateY(-1px);
    }

    &:active:not(.is-disabled) {
      transform: translateY(0);
    }

    &.is-disabled {
      color: #c9b4a4;
      opacity: 0.45;
    }
  }
}

/* 进度条 */
.completion-bar {
  flex-shrink: 0;
  padding: 16px 20px;
  margin-bottom: 18px;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 6%), transparent 30%),
    rgb(255 255 255 / 94%);
  border: 1px solid #f0dfcf;
  border-radius: 18px;
  box-shadow:
    0 10px 26px rgb(126 72 24 / 6%),
    0 0 0 1px rgb(255 255 255 / 68%) inset;

  :deep(.el-progress-bar__outer) {
    overflow: hidden;
    background: #fff0e2;
    border: 1px solid #ffe0c2;
    border-radius: 999px;
  }

  :deep(.el-progress-bar__inner) {
    background: linear-gradient(90deg, #ffb36b 0%, #ff8a26 55%, #f97316 100%) !important;
    border-radius: 999px;
    box-shadow: 0 0 10px rgb(249 115 22 / 18%);
    transition: width 0.35s ease;
  }
}

.bar-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #6b5545;
}

.bar-percent {
  padding: 3px 8px;
  font-size: 15px;
  font-weight: 800;
  color: #e86f0b;
  background: #fff0e2;
  border: 1px solid #ffd3aa;
  border-radius: 999px;
}

/* 主体布局 */
.form-body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 20px;
  min-height: 0;
}

/* 左侧表单 */
.form-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(255 255 255 / 95%);
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 16px 38px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

.form-content {
  flex: 1;
  min-height: 0;
  padding: 22px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
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

/* 单个字段 */
.form-field {
  position: relative;
  padding: 16px;
  margin-bottom: 16px;
  background: #fffaf5;
  border: 1px solid #f3e4d6;
  border-radius: 16px;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &:hover {
    background: #fff;
    border-color: #ffc58f;
    box-shadow: 0 10px 24px rgb(249 115 22 / 9%);
    transform: translateY(-1px);
  }

  &.field-required {
    &::before {
      position: absolute;
      top: 16px;
      left: 0;
      width: 3px;
      height: 22px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 0 999px 999px 0;
    }
  }

  /* 已填写保留成功语义 */
  &.field-filled {
    background: #f7fff9;
    border-color: #bbf7d0;

    &:hover {
      border-color: #86efac;
      box-shadow: 0 10px 24px rgb(16 185 129 / 8%);
    }
  }

  /* 警告保留黄色语义 */
  &.field-warning {
    background: #fffbeb;
    border-color: #fde68a;

    &:hover {
      border-color: #fbbf24;
      box-shadow: 0 10px 24px rgb(245 158 11 / 10%);
    }
  }

  /* 输入框 */
  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper),
  :deep(.el-input-number .el-input__wrapper) {
    min-height: 40px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #f0dfcf inset;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    &.is-focus,
    &.is-focused {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 9%);
    }
  }

  :deep(.el-textarea__inner) {
    color: #4a382c;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #f0dfcf inset;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    &:focus {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 9%);
    }
  }

  :deep(.el-input__inner),
  :deep(.el-select__selected-item) {
    color: #4a382c;
  }

  :deep(.el-input__inner::placeholder),
  :deep(.el-textarea__inner::placeholder),
  :deep(.el-select__placeholder) {
    color: #b09b8c;
  }

  :deep(.el-input-group__append) {
    overflow: hidden;
    background: #fff7ef;
    border-color: #f0dfcf;
    border-radius: 0 12px 12px 0;

    .el-button {
      color: #e86f0b;

      &:hover {
        color: #f97316;
        background: #fff0e2;
      }
    }
  }

  :deep(.el-input-number__increase),
  :deep(.el-input-number__decrease) {
    color: #9b806c;
    background: #fff7ef;
    border-color: #f0dfcf;

    &:hover {
      color: #f97316;
    }
  }
}

/* 字段标题 */
.field-label {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #5b4738;
}

.field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-required-mark {
  color: #ef4444;
}

.field-unit {
  font-size: 12px;
  font-weight: 400;
  color: #a18b7b;
}

/* 推荐值 */
.field-recommend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.recommend-label {
  font-size: 12px;
  color: #a18b7b;
}

.recommend-tag {
  color: #c25f05;
  cursor: pointer;
  background: #fff4e9;
  border-color: #ffd3aa;
  border-radius: 999px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  &:hover {
    color: #f97316;
    background: #fff0e2;
    border-color: #ffad61;
    box-shadow: 0 5px 12px rgb(249 115 22 / 10%);
    transform: translateY(-1px);
  }
}

/* 校验警告 */
.field-warning-msg {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  margin-top: 10px;
  font-size: 12px;
  color: #b45309;
  background: rgb(245 158 11 / 10%);
  border: 1px solid rgb(245 158 11 / 18%);
  border-radius: 10px;

  .el-icon {
    flex-shrink: 0;
    color: #d97706;
  }
}

.w-full {
  width: 100%;
}

/* 表单底部操作 */
.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 16px 22px;
  background: linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  border-top: 1px solid #f3e4d6;

  :deep(.el-button) {
    height: 42px;
    padding: 0 24px;
    margin-left: 0;
    font-weight: 700;
    border-radius: 12px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover:not(.is-disabled) {
      transform: translateY(-1px);
    }
  }

  .btn-outline {
    color: #e86f0b !important;
    background: #fff !important;
    border-color: #ffc58f !important;

    &:hover:not(.is-disabled) {
      color: #f97316 !important;
      background: #fff0e2 !important;
      border-color: #ff8a26 !important;
      box-shadow: 0 10px 22px rgb(249 115 22 / 12%);
    }

    &.is-disabled {
      color: #c9ac95 !important;
      background: #fffaf5 !important;
      border-color: #f0dfcf !important;
    }
  }

  .btn-solid {
    color: #fff !important;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%) !important;
    border-color: #ff8a26 !important;
    box-shadow: 0 10px 22px rgb(249 115 22 / 22%);

    &:hover:not(.is-disabled) {
      background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%) !important;
      border-color: #f97316 !important;
      box-shadow: 0 14px 26px rgb(249 115 22 / 28%);
    }

    &.is-disabled {
      color: #fff !important;
      background: linear-gradient(135deg, #e8b88e, #d99a68) !important;
      border-color: #dfac7e !important;
      box-shadow: none;
    }
  }
}

/* 右侧智能助手 */
.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #f0dfcf;
  border-radius: 22px;
  box-shadow:
    0 16px 38px rgb(126 72 24 / 7%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
}

.chat-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 8%), transparent 38%),
    linear-gradient(135deg, #fff7ef 0%, #fff 70%);
  border-bottom: 1px solid #f3e4d6;

  h3 {
    position: relative;
    padding-left: 12px;
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #4a382c;

    &::before {
      position: absolute;
      top: 50%;
      left: 0;
      width: 4px;
      height: 16px;
      content: '';
      background: linear-gradient(180deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 999px;
      transform: translateY(-50%);
    }
  }

  :deep(.el-button.is-text) {
    color: #d97722;
    border-radius: 8px;

    &:hover {
      color: #f97316;
      background: #fff0e2;
    }
  }
}

/* 引导话术 */
.guide-banner {
  display: flex;
  gap: 12px;
  padding: 14px;
  margin: 14px 16px 4px;
  color: #f97316;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 138 38 / 9%), transparent 34%),
    linear-gradient(135deg, #fff0e2 0%, #fff7ef 100%);
  border: 1px solid #ffd3aa;
  border-radius: 16px;

  > .el-icon {
    flex-shrink: 0;
    color: #f97316;
  }
}

.guide-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 800;
  color: #d95f06;
}

.guide-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: #806b5b;
}

/* 对话区 */
.chat-messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  scrollbar-color: #e7b889 transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
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

/* 消息 */
.message-item {
  display: flex;
  gap: 10px;
  max-width: 92%;

  &.user {
    flex-direction: row-reverse;
    align-self: flex-end;

    .message-avatar {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      box-shadow: 0 6px 14px rgb(249 115 22 / 18%);
    }

    .message-content {
      color: #fff;
      background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
      border-radius: 16px 16px 4px;
      box-shadow: 0 10px 22px rgb(249 115 22 / 18%);
    }

    .message-time {
      text-align: right;
    }
  }

  &.assistant {
    align-self: flex-start;

    .message-avatar {
      color: #e86f0b;
      background: #fff0e2;
      border: 1px solid #ffd3aa;
    }

    .message-content {
      color: #5b4738;
      background: #fffaf5;
      border: 1px solid #f0dfcf;
      border-radius: 16px 16px 16px 4px;
    }

    :deep(.el-button.is-text) {
      color: #e86f0b;

      &:hover {
        color: #f97316;
        background: #fff0e2;
      }
    }
  }
}

.message-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 14px;
  border-radius: 50%;
}

.message-body {
  min-width: 0;
}

.message-content {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
}

.message-time {
  margin-top: 5px;
  font-size: 11px;
  color: #b8a597;
}

/* 思考动画 */
.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.typing .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #f97316;
  border-radius: 50%;
  animation: typing-dot 1.4s infinite;
}

.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%,
  60%,
  100% {
    opacity: 0.4;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-5px);
  }
}

/* 语音输入区 */
.voice-input-area {
  flex-shrink: 0;
  padding: 14px 16px 16px;
  background: linear-gradient(180deg, #fff 0%, #fffaf5 100%);
  border-top: 1px solid #f3e4d6;
}

/* 模式切换 */
.mode-switch {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;

  :deep(.el-radio-group) {
    padding: 3px;
    background: #fff0e2;
    border: 1px solid #ffd8b5;
    border-radius: 999px;
  }

  :deep(.el-radio-button__inner) {
    color: #806b5b;
    background: transparent;
    border: none;
    border-radius: 999px !important;
    box-shadow: none;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    color: #fff;
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
    box-shadow: 0 5px 12px rgb(249 115 22 / 18%);
  }
}

/* 识别预览 */
.recognized-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 9px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #806b5b;
  background: #fff7ef;
  border: 1px solid #f0dfcf;
  border-radius: 12px;

  .el-icon {
    flex-shrink: 0;
    color: #f97316;
  }
}

.record-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-input-wrapper {
  flex: 1;
  min-width: 0;

  :deep(.el-input__wrapper) {
    min-height: 42px;
    background: #fff;
    border-radius: 999px;
    box-shadow: 0 0 0 1px #f0dfcf inset;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      background: #fffaf5;
      box-shadow: 0 0 0 1px #ffc58f inset;
    }

    &.is-focus {
      background: #fff;
      box-shadow:
        0 0 0 1px #ff8a26 inset,
        0 0 0 4px rgb(255 138 38 / 9%);
    }
  }

  :deep(.el-input__inner) {
    color: #4a382c;

    &::placeholder {
      color: #b09b8c;
    }
  }
}

/* 录音按钮 */
.record-btn {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border: 1px solid #ff8a26;
  border-radius: 50%;
  box-shadow:
    0 14px 26px rgb(249 115 22 / 26%),
    0 0 0 5px rgb(255 138 38 / 7%);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background 0.22s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #ff8a26 0%, #e9680a 100%);
    box-shadow:
      0 18px 32px rgb(249 115 22 / 32%),
      0 0 0 7px rgb(255 138 38 / 8%);
    transform: translateY(-2px) scale(1.03);
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  /* 正在录音保留红色 */
  &.recording {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-color: #dc2626;
    box-shadow: 0 14px 26px rgb(239 68 68 / 25%);
    animation: recording-pulse 1.5s infinite;
  }

  &.processing {
    color: #fff;
    background: linear-gradient(135deg, #c59a78, #9f7a60);
    border-color: #a98569;
    box-shadow: none;
  }
}

@keyframes recording-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(239 68 68 / 35%);
  }

  70% {
    box-shadow: 0 0 0 14px rgb(239 68 68 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(239 68 68 / 0%);
  }
}

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
}

.btn-label {
  max-width: 60px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.wave-bars {
  display: flex;
  gap: 3px;
  align-items: center;
  height: 26px;
}

.voice-wave-bar {
  width: 3px;
  height: 10px;
  background: #fff;
  border-radius: 999px;
  animation: voice-wave 1s ease-in-out infinite;

  &:nth-child(2) {
    animation-delay: 0.1s;
  }

  &:nth-child(3) {
    animation-delay: 0.2s;
  }

  &:nth-child(4) {
    animation-delay: 0.3s;
  }

  &:nth-child(5) {
    animation-delay: 0.4s;
  }
}

@keyframes voice-wave {
  0%,
  100% {
    height: 8px;
  }

  50% {
    height: 24px;
  }
}

/* 音量条 */
.volume-indicator {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  background: #fff0e2;
  border-radius: 999px;
}

.volume-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffb36b 0%, #f97316 55%, #ef4444 100%);
  border-radius: 999px;
  transition: width 0.1s ease;
}

/* 移动端底栏 */
.mobile-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  padding: 0 16px;
  background: #fffaf5;
  border-top: 1px solid #f0dfcf;
  box-shadow: 0 -8px 24px rgb(126 72 24 / 9%);
}

.ml-2 {
  margin-left: 8px;
}

/* Loading */
:deep(.el-loading-mask) {
  background: rgb(255 250 245 / 78%);
}

:deep(.el-loading-spinner .path) {
  stroke: #ff8a26;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #f97316;
}

/* 通用标签 */
:deep(.el-tag) {
  font-weight: 600;
}

/* 中等屏幕 */
@media (width <=1200px) {
  .form-body {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 16px;
  }

  .voice-form-page {
    padding: 16px;
  }

  .form-title {
    max-width: 520px;
  }
}

/* 平板和移动端 */
@media (width <=768px) {
  .voice-form-page {
    height: 100%;
    padding: 12px;
    overflow-y: auto;
  }

  .form-header {
    align-items: flex-start;
    padding: 16px;
    border-radius: 18px;
  }

  .form-title {
    max-width: 100%;
    font-size: 19px;
    white-space: normal;
  }

  .form-subtitle {
    flex-wrap: wrap;
    gap: 6px;
  }

  .desktop-only {
    display: none;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: auto;
  }

  .form-panel {
    min-height: 520px;
    border-radius: 18px;
  }

  .form-content {
    padding: 16px;
  }

  .form-field {
    padding: 14px;
    margin-bottom: 14px;
  }

  .form-actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    padding: 12px 16px;
  }

  .action-buttons {
    width: 100%;
  }

  .form-actions :deep(.el-button) {
    flex: 1;
    padding: 0 12px;
  }

  .chat-panel {
    position: fixed;
    right: 10px;
    bottom: 12px;
    left: 10px;
    z-index: 90;
    width: auto;
    height: 68vh;
    border-color: #f0dfcf;
    border-radius: 22px 22px 0 0;
    box-shadow:
      0 -12px 34px rgb(92 54 24 / 18%),
      0 0 0 1px rgb(255 255 255 / 68%) inset;
    transform: translateY(calc(100% - 58px));
    transition: transform 0.3s ease;
  }

  .chat-panel.panel-expanded {
    transform: translateY(0);
  }

  .chat-header {
    padding: 16px;
  }

  .record-controls {
    align-items: stretch;
  }

  .record-btn {
    width: 64px;
    height: 64px;
  }
}

/* 小屏幕 */
@media (width <=480px) {
  .voice-form-page {
    padding: 10px;
  }

  .completion-bar {
    padding: 14px;
    border-radius: 16px;
  }

  .record-controls {
    flex-direction: column;
  }

  .text-input-wrapper {
    width: 100%;
  }

  .record-btn {
    flex-direction: row;
    gap: 8px;
    width: 100%;
    height: 54px;
    border-radius: 16px;
  }

  .btn-inner {
    height: auto;
  }

  .btn-label {
    max-width: none;
    margin-top: 0;
    font-size: 12px;
  }

  .action-buttons {
    flex-direction: column;

    :deep(.el-button) {
      width: 100%;
    }
  }
}
</style>
