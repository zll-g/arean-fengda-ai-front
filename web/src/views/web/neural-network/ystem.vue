<template>
  <div class="boiler-dashboard-page">
    <section class="panel-card iframe-section">
      <div class="section-header">
        <div class="section-title">
          <span class="title-mark" />
          <div>
            <h2>{{ t('boilerDashboard.title') }}</h2>
            <p>{{ t('boilerDashboard.desc') }}</p>
          </div>
        </div>
      </div>

      <div ref="cardRef" class="iframe-card">
        <button class="fullscreen-btn" @click.stop="handleFullscreen">
          <span class="fullscreen-icon">{{ isFullscreen ? '×' : '⛶' }}</span>
          <span>
            {{
              isFullscreen
                ? t('boilerDashboard.exitFullscreen')
                : t('boilerDashboard.enterFullscreen')
            }}
          </span>
        </button>

        <iframe :src="iframeUrl" class="iframe" frameborder="0" allowfullscreen />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const iframeUrl =
  'http://10.15.3.211:8088/%E7%94%9F%E4%BA%A7%E8%BF%87%E7%A8%8B/GYDCS/2020-COM_AUXILIARY_BOILER2.html';

const cardRef = ref<HTMLDivElement | null>(null);
const isFullscreen = ref(false);

type FullscreenElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const updateFullscreenState = () => {
  const doc = document as FullscreenDocument;

  isFullscreen.value =
    document.fullscreenElement === cardRef.value || doc.webkitFullscreenElement === cardRef.value;
};

const handleFullscreen = async () => {
  const card = cardRef.value as FullscreenElement | null;
  const doc = document as FullscreenDocument;

  if (!card) return;

  try {
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
      return;
    }

    if (card.requestFullscreen) {
      await card.requestFullscreen();
    } else if (card.webkitRequestFullscreen) {
      await card.webkitRequestFullscreen();
    }
  } catch (error) {
    console.error(t('boilerDashboard.fullscreenFailed'), error);
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenState);
  document.addEventListener('webkitfullscreenchange', updateFullscreenState);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState);
  document.removeEventListener('webkitfullscreenchange', updateFullscreenState);
});
</script>

<style lang="scss" scoped>
.boiler-dashboard-page {
  --primary: #2f80ed;
  --primary-soft: #eaf3ff;
  --success: #27ae60;
  --card-bg: #fff;
  --border: #e6edf7;
  --border-strong: #d6e4f5;
  --text-title: #101828;
  --text-main: #344054;
  --text-subtle: #98a2b3;

  box-sizing: border-box;
  display: grid;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px 14px;
  overflow: hidden;
  color: var(--text-main);
  background:
    radial-gradient(circle at 0 0, rgb(47 128 237 / 6%), transparent 24%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
}

.panel-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 6px 18px rgb(47 128 237 / 5%);
}

.iframe-section {
  padding: 12px;
}

.predict-section {
  padding: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.predict-section-header {
  margin-bottom: 8px;
}

.section-title {
  display: flex;
  gap: 9px;
  align-items: center;
  min-width: 0;
}

.title-mark {
  width: 4px;
  height: 20px;
  background: linear-gradient(180deg, #4096ff, #2f80ed);
  border-radius: 999px;
  box-shadow: 0 4px 10px rgb(47 128 237 / 22%);
}

.section-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-title);
}

.section-title p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-subtle);
}

.iframe-card {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #f2f4f7;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
}

.iframe {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
  border: none;
}

.fullscreen-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 10;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: rgb(16 24 40 / 62%);
  border: 1px solid rgb(255 255 255 / 64%);
  border-radius: 999px;
  box-shadow: 0 8px 20px rgb(15 23 42 / 18%);
  backdrop-filter: blur(10px);
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.fullscreen-btn:hover {
  background: rgb(47 128 237 / 92%);
  box-shadow: 0 10px 24px rgb(47 128 237 / 28%);
  transform: translateY(-1px);
}

.fullscreen-btn:active {
  transform: translateY(0);
}

.fullscreen-icon {
  font-size: 15px;
  line-height: 1;
}

.predict-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f8fbff;
  border-radius: 12px;
}

/* 压缩 Predict 子组件，避免撑出父容器 */
.predict-body :deep(.prediction-page),
.predict-body :deep(.app-shell) {
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
  background: transparent !important;
}

/* 父组件已有标题，隐藏 Predict 内部标题 */
.predict-body :deep(.page-header),
.predict-body :deep(.top-bar) {
  display: none !important;
}

.predict-body :deep(.workspace) {
  gap: 10px !important;
}

.predict-body :deep(.control-card) {
  padding: 10px 12px !important;
}

.predict-body :deep(.toolbar),
.predict-body :deep(.history-toolbar) {
  gap: 8px !important;
}

.predict-body :deep(.toolbar-group),
.predict-body :deep(.toolbar-row) {
  gap: 8px !important;
}

.predict-body :deep(.summary-grid),
.predict-body :deep(.summary-strip) {
  gap: 10px !important;
}

.predict-body :deep(.summary-card),
.predict-body :deep(.summary-item) {
  min-height: 64px !important;
  padding: 10px 12px !important;
}

.predict-body :deep(.summary-label),
.predict-body :deep(.summary-item .label) {
  margin-bottom: 5px !important;
  font-size: 12px !important;
}

.predict-body :deep(.summary-value),
.predict-body :deep(.summary-item .value) {
  font-size: 17px !important;
}

.predict-body :deep(.summary-value.count),
.predict-body :deep(.summary-item .emphasis) {
  font-size: 22px !important;
}

.predict-body :deep(.main-grid),
.predict-body :deep(.content-grid) {
  grid-template-columns: minmax(0, 1fr) 270px !important;
  gap: 10px !important;
}

.predict-body :deep(.chart-column),
.predict-body :deep(.chart-stack) {
  gap: 10px !important;
}

.predict-body :deep(.panel-card),
.predict-body :deep(.chart-panel),
.predict-body :deep(.overview-panel) {
  padding: 11px !important;
  border-radius: 12px !important;
}

.predict-body :deep(.panel-header),
.predict-body :deep(.section-heading) {
  margin-bottom: 7px !important;
}

.predict-body :deep(.panel-header h2),
.predict-body :deep(.section-heading h2) {
  font-size: 14px !important;
}

.predict-body :deep(.panel-header p),
.predict-body :deep(.section-heading p) {
  margin-top: 3px !important;
  font-size: 12px !important;
}

.predict-body :deep(.chart-frame) {
  height: 190px !important;
  border-radius: 10px !important;
}

.predict-body :deep(.chart-frame.compact) {
  height: 160px !important;
}

.predict-body :deep(.side-column),
.predict-body :deep(.side-panel) {
  position: sticky !important;
  top: 0 !important;
}

.predict-body :deep(.fgr-card),
.predict-body :deep(.fgr-panel) {
  padding: 13px !important;
  border-radius: 12px !important;
}

.predict-body :deep(.fgr-header) {
  margin-bottom: 10px !important;
}

.predict-body :deep(.fgr-title) {
  font-size: 15px !important;
}

.predict-body :deep(.fgr-detail) {
  min-height: auto !important;
  margin-bottom: 10px !important;
  font-size: 12px !important;
  line-height: 1.55 !important;
}

.predict-body :deep(.metric-list),
.predict-body :deep(.fgr-metrics) {
  gap: 5px !important;
}

.predict-body :deep(.metric-item),
.predict-body :deep(.metric-row) {
  min-height: 26px !important;
}

.predict-body :deep(.metric-item span),
.predict-body :deep(.metric-row dt) {
  font-size: 12px !important;
}

.predict-body :deep(.metric-item strong),
.predict-body :deep(.metric-row dd) {
  font-size: 13px !important;
}

.predict-body :deep(.metric-item.suggested strong),
.predict-body :deep(.metric-row dd.suggested) {
  font-size: 14px !important;
}

/* 全屏 */
.iframe-card:fullscreen {
  width: 100vw;
  height: 100vh;
  background: #000;
  border: none;
  border-radius: 0;

  .iframe {
    width: 100%;
    height: 100%;
  }

  .fullscreen-btn {
    right: 24px;
    bottom: 24px;
    background: rgb(16 24 40 / 66%);
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.86);
  }

  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@media (width <= 1440px) {
  .boiler-dashboard-page {
    grid-template-rows: clamp(430px, 58vh, 620px) minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px;
  }

  .predict-body :deep(.chart-frame) {
    height: 180px !important;
  }

  .predict-body :deep(.chart-frame.compact) {
    height: 150px !important;
  }

  .predict-body :deep(.main-grid),
  .predict-body :deep(.content-grid) {
    grid-template-columns: minmax(0, 1fr) 255px !important;
  }
}

@media (width <= 1200px) {
  .boiler-dashboard-page {
    grid-template-rows: 500px auto;
    height: auto;
    min-height: calc(100vh - 86px);
    overflow: visible;
  }

  .predict-section {
    min-height: 560px;
  }

  .predict-body {
    overflow: visible;
  }

  .predict-body :deep(.main-grid),
  .predict-body :deep(.content-grid) {
    grid-template-columns: 1fr !important;
  }

  .predict-body :deep(.side-column),
  .predict-body :deep(.side-panel) {
    position: static !important;
  }
}

@media (width <= 768px) {
  .boiler-dashboard-page {
    grid-template-rows: 420px auto;
    padding: 10px;
  }

  .iframe-section,
  .predict-section {
    padding: 10px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .predict-body :deep(.summary-grid),
  .predict-body :deep(.summary-strip) {
    grid-template-columns: 1fr !important;
  }

  .fullscreen-btn {
    right: 10px;
    bottom: 10px;
    height: 30px;
    padding: 0 12px;
    font-size: 12px;
  }
}
</style>
