<template>
  <div class="login-page">
    <div class="login-panel">
      <!-- 右上角系统入口 -->
      <button class="gms-entry" type="button" title="进入 GMS 系统" @click="router.push('/index')">
        <span>GMS系统1.0</span>
        <el-icon><ArrowRight /></el-icon>
      </button>

      <!-- 企业信息 -->
      <div class="company-section">
        <img
          class="company-logo"
          src="@/assets/images/login/logo_fd.png"
          alt="惠州深能源丰达电力有限公司"
        />
      </div>

      <!-- 系统品牌 -->
      <div class="system-brand">
        <h1>智维引擎</h1>
      </div>

      <!-- 登录表单 -->
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model.trim="loginForm.username"
            :prefix-icon="User"
            placeholder="请输入账号"
            size="large"
            clearable
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            :prefix-icon="Lock"
            placeholder="请输入密码"
            type="password"
            size="large"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-form-item class="button-form-item">
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '正在登录...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowRight, Lock, User } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import autofit from 'autofit.js';

import api from '@/api';
import { saveToken, saveUserInfo } from '@/utils/device';

interface LoginForm {
  username: string;
  password: string;
}

const emit = defineEmits<{
  login: [data: LoginForm];
}>();

const router = useRouter();
const loginFormRef = ref<FormInstance>();
const loading = ref(false);

const loginForm = reactive<LoginForm>({
  username: '',
  password: '',
});

const loginRules: FormRules<LoginForm> = {
  username: [
    {
      required: true,
      message: '请输入账号',
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: 'blur',
    },
    {
      min: 3,
      max: 30,
      message: '密码长度为 3 至 30 个字符',
      trigger: 'blur',
    },
  ],
};

const handleLogin = async () => {
  if (!loginFormRef.value || loading.value) {
    return;
  }

  try {
    await loginFormRef.value.validate();

    loading.value = true;

    emit('login', {
      username: loginForm.username,
      password: loginForm.password,
    });

    const res = await api.login.login({
      username: loginForm.username,
      password: loginForm.password,
    });

    const { token, userInfo } = res.data;

    saveToken(token);
    saveUserInfo(userInfo);

    await router.push('/web/home');
  } catch (error) {
    console.warn('登录失败或表单校验未通过', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  autofit.init({
    dh: 1080,
    dw: 1920,
    el: '.login-page',
    resize: true,
  });
});
</script>

<style scoped lang="scss">
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    linear-gradient(rgb(255 255 255 / 2%), rgb(255 255 255 / 2%)),
    center / 100% 100% no-repeat url('@/assets/images/login/login_bg.png');
}

.login-page::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: radial-gradient(circle at center, transparent 30%, rgb(20 33 16 / 12%) 100%);
}

.login-panel {
  position: relative;
  z-index: 1;
  width: 1000px;
  padding: 36px 58px 30px;
  overflow: hidden;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 10px;
}

.login-panel::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  content: '';
  background: linear-gradient(90deg, #e96b0c, #ff9b37 48%, #f58220);
}

.login-panel::after {
  position: absolute;
  top: -100px;
  right: -80px;
  width: 280px;
  height: 280px;
  pointer-events: none;
  content: '';
  background: radial-gradient(circle, rgb(245 130 32 / 12%), transparent 68%);
  border-radius: 50%;
}

/* GMS 系统入口 */
.gms-entry {
  position: absolute;
  top: 24px;
  right: 30px;
  z-index: 2;
  display: flex;
  gap: 5px;
  align-items: center;
  height: 34px;
  padding: 0 13px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #676d72;
  cursor: pointer;
  background: rgb(255 255 255 / 58%);
  border: 1px solid rgb(245 130 32 / 24%);
  border-radius: 17px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #f58220;
    background: #fff;
    border-color: #f58220;
    transform: translateX(2px);
  }

  .el-icon {
    font-size: 13px;
  }
}

/* 企业 Logo */
.company-section {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  padding: 2px 180px 0;
}

.company-logo {
  display: block;
  width: 570px;
  max-height: 74px;
  object-fit: contain;
  object-position: center;
}

/* 智维引擎品牌区域 */
.system-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 25px;
  color: #666;
}

.system-icon {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  margin-right: 20px;
  font-size: 31px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(145deg, #ffab52, #f58220 65%, #e96d0c);
  border: 4px solid rgb(255 255 255 / 74%);
  border-radius: 17px;
  box-shadow:
    0 12px 25px rgb(245 130 32 / 30%),
    inset 0 1px 1px rgb(255 255 255 / 30%);
}

.system-icon::after {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 15px;
  height: 15px;
  content: '';
  background: #ffbd73;
  border: 3px solid rgb(255 255 255 / 90%);
  border-radius: 50%;
}

.system-content {
  min-width: 0;
}

.system-title-row {
  display: flex;
  gap: 12px;
  align-items: center;

  h1 {
    margin: 0;
    font-size: 42px;
    font-weight: 900;
    line-height: 1.1;
    color: #353b40;
    letter-spacing: 5px;
    text-shadow: 0 2px 3px rgb(255 255 255 / 70%);
  }
}

.system-version {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  color: #f58220;
  background: rgb(245 130 32 / 10%);
  border: 1px solid rgb(245 130 32 / 25%);
  border-radius: 12px;
}

.system-content p {
  margin: 10px 0 0;
  font-size: 16px;
  font-weight: 500;
  color: #747a80;
  letter-spacing: 7px;
}

/* 分割标题 */
.brand-divider {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin: 26px 0 24px;

  span {
    width: 95px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgb(245 130 32 / 48%));

    &:last-child {
      background: linear-gradient(90deg, rgb(245 130 32 / 48%), transparent);
    }
  }

  em {
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    color: #8a8f94;
    letter-spacing: 4px;
  }
}

/* 横向表单 */
.login-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 150px;
  gap: 22px;
  align-items: start;

  :deep(.el-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.el-form-item__content) {
    width: 100%;
  }

  :deep(.el-input) {
    width: 100%;
  }

  :deep(.el-input__wrapper) {
    min-height: 56px;
    padding: 1px 17px;
    background: rgb(255 255 255 / 92%);
    border-radius: 7px;
    box-shadow:
      0 0 0 1px rgb(152 157 161 / 55%) inset,
      0 5px 14px rgb(45 55 40 / 6%);
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover {
      box-shadow:
        0 0 0 1px #f3a35f inset,
        0 6px 16px rgb(45 55 40 / 8%);
    }

    &.is-focus {
      background: #fff;
      box-shadow:
        0 0 0 1px #f58220 inset,
        0 0 0 4px rgb(245 130 32 / 12%);
      transform: translateY(-1px);
    }
  }

  :deep(.el-input__inner) {
    height: 54px;
    font-size: 17px;
    color: #353a3e;
  }

  :deep(.el-input__inner::placeholder) {
    font-size: 15px;
    color: #a4a8ac;
  }

  :deep(.el-input__prefix-inner) {
    margin-right: 8px;
    font-size: 20px;
    color: #f58220;
  }

  :deep(.el-input__password) {
    font-size: 20px;
    color: #64696e;

    &:hover {
      color: #f58220;
    }
  }

  :deep(.el-form-item__error) {
    padding-top: 6px;
    font-size: 13px;
  }
}

.button-form-item {
  :deep(.el-form-item__content) {
    display: block;
  }
}

.login-button {
  width: 100%;
  height: 56px;
  padding: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 5px;
  background: linear-gradient(135deg, #ffa043, #f58220 65%, #ed730f);
  border: 0;
  border-radius: 8px;
  box-shadow:
    0 10px 22px rgb(245 130 32 / 27%),
    inset 0 1px 0 rgb(255 255 255 / 25%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;

  &:hover,
  &:focus {
    background: linear-gradient(135deg, #ff9531, #eb710d);
    box-shadow: 0 13px 26px rgb(245 130 32 / 34%);
    transform: translateY(-2px);
  }

  &:active {
    box-shadow: 0 6px 14px rgb(245 130 32 / 24%);
    transform: translateY(0);
  }
}

.panel-footer {
  display: flex;
  gap: 13px;
  align-items: center;
  justify-content: center;
  margin-top: 28px;
  font-size: 15px;
  font-weight: 500;
  color: #73797e;
  letter-spacing: 3px;
}

.footer-dot {
  width: 5px;
  height: 5px;
  background: #f58220;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(245 130 32 / 10%);
}

@media (width <= 1200px) {
  .login-panel {
    width: 940px;
  }

  .company-logo {
    width: 530px;
  }
}

@media (width <= 900px) {
  .login-page {
    min-width: 0;
    padding: 24px;
    background-size: cover;
  }

  .login-panel {
    width: min(100%, 620px);
    padding: 72px 32px 28px;
  }

  .company-section {
    padding: 0;
  }

  .company-logo {
    width: min(100%, 500px);
  }

  .system-title-row h1 {
    font-size: 34px;
    letter-spacing: 3px;
  }

  .system-content p {
    letter-spacing: 4px;
  }

  .login-form {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
