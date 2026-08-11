import { ref, onUnmounted } from 'vue';

export function useAudioPlayer() {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const totalDuration = ref(0);

  let audioElement: HTMLAudioElement | null = null;

  function playBase64(base64Audio: string, format = 'wav') {
    stop();

    const audio = new Audio();
    audio.src = `data:audio/${format};base64,${base64Audio}`;

    audio.onplay = () => {
      isPlaying.value = true;
    };
    audio.onended = () => {
      isPlaying.value = false;
      currentTime.value = 0;
    };
    audio.onerror = () => {
      isPlaying.value = false;
    };
    audio.ontimeupdate = () => {
      currentTime.value = audio.currentTime;
      totalDuration.value = audio.duration || 0;
    };

    audioElement = audio;
    audio.play().catch((e) => console.error('播放失败:', e));
  }

  function playUrl(url: string) {
    stop();
    const audio = new Audio(url);
    audio.onplay = () => {
      isPlaying.value = true;
    };
    audio.onended = () => {
      isPlaying.value = false;
    };
    audioElement = audio;
    audio.play().catch((e) => console.error('播放失败:', e));
  }

  function stop() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
    }
    isPlaying.value = false;
    currentTime.value = 0;
  }

  function pause() {
    audioElement?.pause();
    isPlaying.value = false;
  }

  function resume() {
    audioElement?.play();
  }

  onUnmounted(stop);

  return { isPlaying, currentTime, totalDuration, playBase64, playUrl, stop, pause, resume };
}
