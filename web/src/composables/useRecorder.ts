import { ref, onUnmounted } from 'vue';

export interface RecorderOptions {
  sampleRate?: number;
  channelCount?: number;
  onDataAvailable?: (data: Blob) => void;
}

export function useRecorder(options: RecorderOptions = {}) {
  const { sampleRate = 16000, channelCount = 1 } = options;

  const isRecording = ref(false);
  const isPaused = ref(false);
  const duration = ref(0);
  const audioLevel = ref(0);

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let durationTimer: ReturnType<typeof setInterval> | null = null;
  let levelTimer: ReturnType<typeof requestAnimationFrame> | null = null;
  let pcmData: Int16Array[] = [];

  // 开始录音
  async function start(): Promise<boolean> {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioContext = new AudioContext({ sampleRate });
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferSize = 4096;
      scriptProcessor = audioContext.createScriptProcessor(bufferSize, channelCount, channelCount);
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      pcmData = [];

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          outputData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        pcmData.push(outputData);
      };

      isRecording.value = true;
      isPaused.value = false;
      duration.value = 0;

      durationTimer = setInterval(() => {
        duration.value += 100;
      }, 100);

      detectLevel();

      return true;
    } catch (err: any) {
      console.error('录音启动失败:', err);
      return false;
    }
  }

  // 停止录音
  async function stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!isRecording.value) {
        resolve(null);
        return;
      }

      if (scriptProcessor) {
        scriptProcessor.disconnect();
      }

      if (pcmData.length > 0) {
        const totalLength = pcmData.reduce((sum, arr) => sum + arr.length, 0);
        const wavBuffer = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of pcmData) {
          wavBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        const wavBlob = encodeWAV(wavBuffer, sampleRate, channelCount);
        cleanup();
        resolve(wavBlob);
      } else {
        cleanup();
        resolve(null);
      }
    });
  }

  // WAV 编码器
  function encodeWAV(samples: Int16Array, sampleRate: number, numChannels: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(44 + i * 2, samples[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // 暂停录音
  function pause() {
    if (isRecording.value && !isPaused.value) {
      isPaused.value = true;
      if (durationTimer) clearInterval(durationTimer);
    }
  }

  // 恢复录音
  function resume() {
    if (isRecording.value && isPaused.value) {
      isPaused.value = false;
      durationTimer = setInterval(() => {
        duration.value += 100;
      }, 100);
    }
  }

  // 取消录音
  function cancel() {
    if (isRecording.value) {
      if (scriptProcessor) {
        scriptProcessor.disconnect();
      }
      cleanup();
    }
  }

  // 音量检测
  function detectLevel() {
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!isRecording.value) return;
      analyser!.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      audioLevel.value = Math.min(100, Math.round((sum / dataArray.length / 255) * 200));

      levelTimer = requestAnimationFrame(tick);
    };

    tick();
  }

  // 格式化时长
  function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // 清理资源
  function cleanup() {
    isRecording.value = false;
    isPaused.value = false;
    pcmData = [];

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    if (levelTimer) {
      cancelAnimationFrame(levelTimer);
      levelTimer = null;
    }

    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }

    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }

    analyser = null;
    audioLevel.value = 0;
  }

  onUnmounted(cleanup);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    start,
    stop,
    pause,
    resume,
    cancel,
    formatDuration,
  };
}
