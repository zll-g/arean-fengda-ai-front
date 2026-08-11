<template>
  <label class="form-switch" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="switch-slider" />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<style lang="scss" scoped>
.form-switch {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  cursor: pointer;

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;

    &:checked + .switch-slider {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);

      &::before {
        transform: translateX(20px);
      }
    }

    &:focus + .switch-slider {
      box-shadow: 0 0 0 3px rgb(59 130 246 / 20%);
    }
  }
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: #d1d5db;
  border-radius: 24px;
  transition: all 0.3s ease;

  .dark & {
    background: #4b5563;
  }

  &::before {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    content: '';
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
    transition: transform 0.3s ease;
  }
}
</style>
