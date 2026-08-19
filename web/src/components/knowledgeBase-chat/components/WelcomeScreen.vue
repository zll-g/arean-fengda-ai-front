<template>
  <div class="welcome-screen">
    <!-- 页面介绍 -->
    <div class="welcome-header">
      <div class="logo-wrapper">
        <div class="logo-glow" />

        <div class="logo-icon">
          <Command :size="42" />
        </div>
      </div>

      <h1 class="title">
        {{ t('welcomeScreen.title') }}
      </h1>

      <p class="subtitle">
        {{ t('welcomeScreen.subtitle') }}
      </p>
    </div>

    <!-- 快速开始建议 -->
    <div class="quick-start">
      <h4>{{ t('welcomeScreen.quickStartTitle') }}</h4>

      <div class="suggestions-grid">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.textKey"
          class="suggestion-card"
          @click="$emit('select', t(suggestion.textKey))"
        >
          <component :is="suggestion.icon" :size="18" class="suggestion-icon" />
          <span>{{ t(suggestion.textKey) }}</span>
          <ChevronRight :size="16" class="arrow-icon" />
        </button>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="welcome-footer">
      <div class="tip">
        <Keyboard :size="14" />

        <span>
          {{ t('welcomeScreen.focusInputTipPrefix') }}
          <kbd>Ctrl</kbd>
          +
          <kbd>/</kbd>
          {{ t('welcomeScreen.focusInputTipSuffix') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronRight, Command, Globe, Keyboard, Lightbulb, PenTool } from '@/components/icons';

const { t } = useI18n();

defineEmits<{
  select: [text: string];
}>();

// const features = computed(() => [
//   {
//     icon: MessageSquare,
//     titleKey: 'welcomeScreen.features.smartChat.title',
//     descriptionKey: 'welcomeScreen.features.smartChat.description',
//     gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
//   },
//   {
//     icon: Command,
//     titleKey: 'welcomeScreen.features.dataQuery.title',
//     descriptionKey: 'welcomeScreen.features.dataQuery.description',
//     gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
//   },
//   {
//     icon: Mic,
//     titleKey: 'welcomeScreen.features.voice.title',
//     descriptionKey: 'welcomeScreen.features.voice.description',
//     gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
//   },
//   {
//     icon: FileText,
//     titleKey: 'welcomeScreen.features.document.title',
//     descriptionKey: 'welcomeScreen.features.document.description',
//     gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
//   },
// ]);

const suggestions = computed(() => [
  {
    icon: Lightbulb,
    textKey: 'welcomeScreen.suggestions.currentTime',
  },
  {
    icon: Globe,
    textKey: 'welcomeScreen.suggestions.machineLearning',
  },
  {
    icon: PenTool,
    textKey: 'welcomeScreen.suggestions.businessEmail',
  },
  {
    icon: Command,
    textKey: 'welcomeScreen.suggestions.knowledgeBaseContent',
  },
]);
</script>

<style lang="scss" scoped>
.welcome-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 8%, rgb(255 138 38 / 8%) 0%, transparent 34%),
    linear-gradient(180deg, rgb(255 249 243 / 72%) 0%, transparent 42%);

  .dark & {
    background:
      radial-gradient(circle at 50% 8%, rgb(249 115 22 / 8%) 0%, transparent 34%),
      linear-gradient(180deg, rgb(249 115 22 / 4%) 0%, transparent 42%);
  }
}

.welcome-header {
  margin-bottom: 38px;
  text-align: center;
}

.logo-wrapper {
  position: relative;
  display: inline-flex;
  margin-bottom: 22px;
}

.logo-icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 74px;
  color: #fff;
  background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%);
  border-radius: 20px;
  box-shadow:
    0 18px 36px -12px rgb(249 115 22 / 38%),
    0 0 0 6px rgb(255 138 38 / 6%);
}

.logo-glow {
  position: absolute;
  inset: -24px;
  pointer-events: none;
  background: radial-gradient(circle, rgb(255 138 38 / 22%) 0%, transparent 70%);
}

.title {
  margin: 0 0 12px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.35;
  color: #332820;

  .dark & {
    color: #fff7f0;
  }
}

.subtitle {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: #a0816b;

  .dark & {
    color: #a99484;
  }
}

/* 功能卡片 */
.feature-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 900px;
  margin-bottom: 48px;

  @media (width <= 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (width <= 500px) {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  position: relative;
  padding: 24px;
  overflow: hidden;
  text-align: center;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #f0dfcf;
  border-radius: 16px;
  box-shadow:
    0 6px 18px rgb(126 72 24 / 4%),
    0 0 0 1px rgb(255 255 255 / 70%) inset;
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;

  &::before {
    position: absolute;
    top: 0;
    right: 18px;
    left: 18px;
    height: 2px;
    content: '';
    background: linear-gradient(90deg, transparent, #ff9a3d, transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .dark & {
    background: #251d18;
    border-color: #49382e;
    box-shadow: none;
  }

  &:hover {
    background: #fffaf5;
    border-color: #ffc58f;
    box-shadow:
      0 14px 28px -8px rgb(249 115 22 / 17%),
      0 0 0 1px rgb(255 138 38 / 5%);
    transform: translateY(-4px);

    &::before {
      opacity: 1;
    }

    .feature-icon {
      box-shadow:
        0 10px 20px rgb(249 115 22 / 24%),
        0 0 0 5px rgb(255 138 38 / 7%);
      transform: translateY(-2px) scale(1.04);
    }

    .dark & {
      background: #2d231d;
      border-color: rgb(255 138 38 / 30%);
      box-shadow: 0 14px 28px -8px rgb(0 0 0 / 42%);
    }
  }

  .feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    color: #fff;

    /* 覆盖 template 中的内联 gradient，统一橙色 */
    background: linear-gradient(135deg, #ff9a3d 0%, #f97316 100%) !important;
    border: 1px solid rgb(255 255 255 / 22%);
    border-radius: 14px;
    box-shadow: 0 8px 18px rgb(249 115 22 / 18%);
    transition:
      box-shadow 0.3s ease,
      transform 0.3s ease;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #4a382c;

    .dark & {
      color: #f6ece4;
    }
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #8d7868;

    .dark & {
      color: #a18c7c;
    }
  }
}

/* 快速开始 */
.quick-start {
  width: 100%;
  max-width: 700px;
  margin-bottom: 40px;

  h4 {
    position: relative;
    width: fit-content;
    padding: 0 14px;
    margin: 0 auto 16px;
    font-size: 14px;
    font-weight: 600;
    color: #8a7462;
    text-align: center;

    &::before,
    &::after {
      position: absolute;
      top: 50%;
      width: 34px;
      height: 1px;
      content: '';
      background: linear-gradient(90deg, transparent, #e8b98e);
    }

    &::before {
      right: 100%;
    }

    &::after {
      left: 100%;
      transform: rotate(180deg);
    }

    .dark & {
      color: #9f8a7a;

      &::before,
      &::after {
        background: linear-gradient(90deg, transparent, #76513a);
      }
    }
  }
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (width <= 600px) {
    grid-template-columns: 1fr;
  }
}

.suggestion-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 20px;
  font-size: 14px;
  color: #5b4738;
  text-align: left;
  cursor: pointer;
  background: rgb(255 255 255 / 96%);
  border: 1px solid #f0dfcf;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgb(126 72 24 / 4%);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  .dark & {
    color: #eadfd6;
    background: #251d18;
    border-color: #49382e;
    box-shadow: none;
  }

  &:hover {
    color: #dc6509;
    background: #fff5eb;
    border-color: #ffbd7c;
    box-shadow:
      0 8px 20px rgb(249 115 22 / 10%),
      0 0 0 3px rgb(255 138 38 / 5%);
    transform: translateY(-1px);

    .suggestion-icon {
      color: #f97316;
      background: #ffead7;
      transform: scale(1.05);
    }

    .arrow-icon {
      color: #f97316;
      transform: translateX(4px);
    }

    .dark & {
      background: rgb(249 115 22 / 10%);
      border-color: rgb(255 138 38 / 30%);
      box-shadow: none;
    }
  }

  .suggestion-icon {
    box-sizing: content-box;
    flex-shrink: 0;
    padding: 6px;
    color: #f97316;
    background: #fff3e7;
    border-radius: 9px;
    transition:
      color 0.2s ease,
      background 0.2s ease,
      transform 0.2s ease;

    .dark & {
      color: #ffad61;
      background: rgb(249 115 22 / 12%);
    }
  }

  span {
    flex: 1;
    min-width: 0;
  }

  .arrow-icon {
    flex-shrink: 0;
    color: #b49e8d;
    transition:
      color 0.2s ease,
      transform 0.2s ease;

    .dark & {
      color: #806e61;
    }
  }
}

/* 底部提示 */
.welcome-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  justify-content: center;
}

.tip {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #a18b7b;

  > svg {
    color: #e8893c;
  }

  .dark & {
    color: #8d7869;

    > svg {
      color: #e8893c;
    }
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 24px;
    padding: 0 7px;
    margin: 0 2px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #d9680b;
    background: #fff2e5;
    border: 1px solid #ffd3aa;
    border-bottom-width: 2px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgb(126 72 24 / 5%);

    .dark & {
      color: #ffb36b;
      background: rgb(249 115 22 / 12%);
      border-color: rgb(255 138 38 / 22%);
      box-shadow: none;
    }
  }
}

@media (width <= 768px) {
  .welcome-screen {
    justify-content: flex-start;
    padding: 28px 16px;
    overflow-y: auto;
  }

  .feature-cards {
    gap: 14px;
    margin-bottom: 36px;
  }

  .feature-card {
    padding: 20px;
  }

  .quick-start {
    margin-bottom: 30px;
  }
}

@media (width <= 500px) {
  .feature-card {
    padding: 18px;
  }

  .suggestion-card {
    padding: 14px 16px;
  }

  .welcome-footer {
    gap: 14px;
  }
}
</style>
