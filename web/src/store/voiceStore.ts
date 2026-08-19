import { defineStore } from 'pinia';
import { ref } from 'vue';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export const useVoiceStore = defineStore('voice', () => {
  const state = ref<VoiceState>('idle');
  const isRecording = ref(false);
  const recognizedText = ref('');
  const partialText = ref('');
  const replyText = ref('');
  const ttsAudioBase64 = ref('');
  const sessionId = ref('');
  const processingStage = ref('');
  const processingMessage = ref('');
  const conversationHistory = ref<
    Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: number;
      audioBase64?: string;
    }>
  >([]);

  // 模式
  const mode = ref<'normal' | 'wizard' | 'correction'>('normal');
  const wizardStep = ref(0);

  // 唤醒
  const wakeupEnabled = ref(true);
  const isAwake = ref(false);

  function startRecording() {
    state.value = 'listening';
    isRecording.value = true;
    partialText.value = '';
    recognizedText.value = '';
  }

  function stopRecording() {
    isRecording.value = false;
    state.value = 'processing';
  }

  function setProcessing(stage: string, message: string) {
    processingStage.value = stage;
    processingMessage.value = message;
  }

  function setResult(text: string, reply: string, audio?: string, addUserMessage = true) {
    recognizedText.value = text;
    replyText.value = reply;

    if (audio) {
      ttsAudioBase64.value = audio;
    }

    state.value = audio ? 'speaking' : 'idle';

    // 是否添加用户消息，避免提前显示后重复添加
    if (text && addUserMessage) {
      conversationHistory.value.push({
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
    }

    if (reply) {
      conversationHistory.value.push({
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        audioBase64: audio,
      });
    }
  }
  function setIdle() {
    state.value = 'idle';
  }

  function setError(msg: string) {
    state.value = 'error';
    replyText.value = msg;
  }

  function clearHistory() {
    conversationHistory.value = [];
  }

  function $reset() {
    state.value = 'idle';
    isRecording.value = false;
    recognizedText.value = '';
    partialText.value = '';
    replyText.value = '';
    ttsAudioBase64.value = '';
    sessionId.value = '';
    processingStage.value = '';
    processingMessage.value = '';
    conversationHistory.value = [];
    mode.value = 'normal';
    wizardStep.value = 0;
  }

  return {
    state,
    isRecording,
    recognizedText,
    partialText,
    replyText,
    ttsAudioBase64,
    sessionId,
    processingStage,
    processingMessage,
    conversationHistory,
    mode,
    wizardStep,
    wakeupEnabled,
    isAwake,
    startRecording,
    stopRecording,
    setProcessing,
    setResult,
    setIdle,
    setError,
    clearHistory,
    $reset,
  };
});
