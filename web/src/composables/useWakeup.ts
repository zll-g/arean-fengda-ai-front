import { ref, onUnmounted } from 'vue';

export function useWakeup(onWakeup: (text: string) => void) {
  const isListening = ref(false);
  const supported = ref(false);

  let recognition: any = null;

  function init() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      supported.value = false;
      return;
    }

    supported.value = true;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        // 检测唤醒词
        const wakeupWords = ['开始填单', '语音填单', '帮我填单'];
        if (wakeupWords.some((w) => text.includes(w))) {
          onWakeup(text);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('语音识别错误:', event.error);
      if (event.error !== 'no-speech' && isListening.value) {
        // 自动重启
        setTimeout(() => {
          if (isListening.value) recognition?.start();
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isListening.value) {
        setTimeout(() => {
          recognition?.start();
        }, 500);
      }
    };
  }

  function start() {
    if (!recognition) init();
    if (!supported.value) return;
    isListening.value = true;
    try {
      recognition?.start();
    } catch {}
  }

  function stop() {
    isListening.value = false;
    try {
      recognition?.stop();
    } catch {}
  }

  onUnmounted(stop);

  return { isListening, supported, start, stop };
}
