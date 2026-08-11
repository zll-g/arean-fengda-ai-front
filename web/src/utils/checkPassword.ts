import type { Ref } from 'vue';
import { computed } from 'vue';

export type PasswordStrength = 'weak' | 'medium' | 'strong' | '';

export interface StrengthResult {
  strength: PasswordStrength;
  strengthText: string;
  color: string;
  tagType: 'danger' | 'warning' | 'success' | 'info';
  icon: string;
  hint: string;
}

export function checkPasswordStrength(password: string): StrengthResult {
  let strength: PasswordStrength = '';
  let score = 0;
  const hints: string[] = [];

  if (password && password.length > 0) {
    if (password.length > 4) score++;
    if (password.length > 8) score++;
    if (password.length > 12) score++;

    if (/[a-z]/.test(password)) score++;

    if (/[A-Z]/.test(password)) score++;

    if (/\d/.test(password)) score++;

    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score < 4) {
      strength = 'weak';
    } else if (score < 7) {
      strength = 'medium';
    } else {
      strength = 'strong';
    }
  }

  const strengthText = getStrengthText(strength);

  const color = getColor(strength);

  const tagType = getTagType(strength);

  const icon = getIcon(strength);

  const hint = hints.length > 0 ? `建议: ${hints.join('，')}` : '密码强度优秀';

  return {
    strength,
    strengthText,
    color,
    tagType,
    icon,
    hint,
  };
}

// 获取强度文本
function getStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '弱';
    case 'medium':
      return '中';
    case 'strong':
      return '强';
    default:
      return '无';
  }
}

// 获取颜色
function getColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '#f56c6c';
    case 'medium':
      return '#e6a23c';
    case 'strong':
      return '#67c23a';
    default:
      return '#909399';
  }
}

function getTagType(strength: PasswordStrength): 'danger' | 'warning' | 'success' | 'info' {
  switch (strength) {
    case 'weak':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'strong':
      return 'success';
    default:
      return 'info';
  }
}

// 获取图标
function getIcon(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'CircleCloseFilled';
    case 'medium':
      return 'WarningFilled';
    case 'strong':
      return 'CircleCheckFilled';
    default:
      return '';
  }
}

export function usePasswordStrength(password: Ref<string>) {
  const strengthResult = computed(() => checkPasswordStrength(password.value));
  return {
    strengthResult,
  };
}
