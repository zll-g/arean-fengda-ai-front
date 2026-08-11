<template>
  <div class="form-select" :class="{ open: isOpen, disabled }">
    <button class="select-trigger" :disabled="disabled" @click="toggleOpen">
      <span class="select-value">
        <slot name="selected" :option="selectedOption">
          {{ selectedOption?.label || placeholder }}
        </slot>
      </span>
      <ChevronDown :size="18" class="select-arrow" />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="select-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          class="select-option"
          :class="{ active: option.value === modelValue }"
          @click="selectOption(option)"
        >
          <slot name="option" :option="option">
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.description" class="option-desc">{{ option.description }}</span>
          </slot>
          <Check v-if="option.value === modelValue" :size="16" class="check-icon" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Check, ChevronDown } from '@/components/icons';

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    valueProp?: string;
  }>(),
  {
    placeholder: '请选择',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const isOpen = ref(false);

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue);
});

function toggleOpen() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
}

function selectOption(option: any) {
  emit('update:modelValue', option[props.valueProp || 'value']);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.form-select')) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.form-select {
  position: relative;
  width: 100%;

  &.disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  &.open {
    .select-arrow {
      transform: rotate(180deg);
    }
  }
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;

  .dark & {
    color: #f3f4f6;
    background: #2d2d3d;
    border-color: #374151;
  }

  &:hover {
    border-color: #3b82f6;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
  }
}

.select-value {
  flex: 1;
  text-align: left;
}

.select-arrow {
  color: #9ca3af;
  transition: transform 0.2s ease;
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgb(0 0 0 / 10%);

  .dark & {
    background: #1e1e2e;
    border-color: #2d2d3d;
    box-shadow: 0 10px 40px rgb(0 0 0 / 40%);
  }
}

.select-option {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:first-child {
    border-radius: 11px 11px 0 0;
  }

  &:last-child {
    border-radius: 0 0 11px 11px;
  }

  &:hover {
    background: #f3f4f6;

    .dark & {
      background: #2d2d3d;
    }
  }

  &.active {
    background: rgb(59 130 246 / 10%);

    .option-label {
      color: #3b82f6;
    }
  }
}

.option-label {
  flex: 1;
  font-size: 14px;
  color: #1f2937;

  .dark & {
    color: #f3f4f6;
  }
}

.option-desc {
  margin-left: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.check-icon {
  margin-left: 8px;
  color: #3b82f6;
}

// 下拉动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
