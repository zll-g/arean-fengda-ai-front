<template>
  <div class="form-slider">
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="handleInput"
    />
    <div class="slider-track">
      <div class="slider-fill" :style="{ width: fillPercent + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const fillPercent = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100;
});

function handleInput(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value);
  emit('update:modelValue', value);
}
</script>

<style lang="scss" scoped>
.form-slider {
  position: relative;
  width: 100%;
  height: 24px;

  input[type='range'] {
    position: absolute;
    z-index: 2;
    width: 100%;
    height: 100%;
    cursor: pointer;
    opacity: 0;

    &:disabled {
      cursor: not-allowed;
    }
  }
}

.slider-track {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 6px;
  overflow: hidden;
  background: #e5e7eb;
  border-radius: 3px;
  transform: translateY(-50%);

  .dark & {
    background: #374151;
  }
}

.slider-fill {
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px;
  transition: width 0.1s ease;
}

// 滑块样式（不同浏览器）
.form-slider input[type='range']::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  -webkit-appearance: none;
  cursor: pointer;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
}

.form-slider input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  cursor: pointer;
  background: white;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgb(0 0 0 / 15%);
}
</style>
