<template>
  <div class="voice-input-page">
    <!-- 导航栏 -->
    <van-sticky>
      <van-nav-bar title="语音填单" left-text="返回" left-arrow @click-left="router.back()">
        <template #right>
          <van-icon name="clock-o" size="18" @click="handleHistory" />
        </template>
      </van-nav-bar>
    </van-sticky>
    <VoiceAssist />

    <!-- Form -->
    <van-form @submit="onSubmit">
      <!-- 表单类型 -->
      <van-field
        v-model="formData.formType"
        name="formType"
        label="表单类型"
        readonly
        is-link
        @click="showFormTypePicker = true"
      />

      <!-- 缺陷类别 -->
      <van-field
        v-model="formData.defectCategory"
        name="defectCategory"
        label="缺陷类别"
        placeholder="请选择缺陷类别"
        readonly
        is-link
        required
        :rules="[{ required: true, message: '请选择缺陷类别' }]"
        @click="showCategoryPicker = true"
      />

      <!-- 紧急程度 -->
      <van-field name="urgency" label="紧急程度" required>
        <template #input>
          <van-radio-group v-model="formData.urgency" direction="horizontal">
            <van-radio name="urgent" checked-color="#1989fa">紧急</van-radio>
            <van-radio name="important" checked-color="#1989fa">重要</van-radio>
            <van-radio name="general" checked-color="#1989fa">一般</van-radio>
          </van-radio-group>
        </template>
      </van-field>

      <!-- 设备名称 -->
      <van-field
        v-model="formData.equipmentName"
        name="equipmentName"
        label="设备名称"
        placeholder="请输入设备名称"
        required
        :rules="[{ required: true, message: '请输入设备名称' }]"
      />

      <!-- 设备补充描述 -->
      <van-field
        v-model="formData.equipmentDesc"
        name="equipmentDesc"
        label="设备补充描述"
        placeholder="请输入设备补充描述"
      />

      <!-- 缺陷现象 -->
      <van-field
        v-model="formData.defectPhenomenon"
        name="defectPhenomenon"
        label="缺陷现象"
        placeholder="请输入缺陷现象"
        required
        :rules="[{ required: true, message: '请输入缺陷现象' }]"
      />

      <!-- 缺陷单号 -->
      <van-field
        v-model="formData.defectNumber"
        name="defectNumber"
        label="缺陷单号"
        placeholder="系统自动生成"
        readonly
      />

      <!-- KKS编码 -->
      <van-field
        v-model="formData.kksCode"
        name="kksCode"
        label="KKS编码"
        placeholder="请输入KKS编码"
      />

      <!-- 发现时间 -->
      <van-field
        v-model="formData.discoveryTime"
        name="discoveryTime"
        label="发现时间"
        placeholder="请选择发现时间"
        readonly
        is-link
        required
        :rules="[{ required: true, message: '请选择发现时间' }]"
        @click="openDatePicker"
      />

      <!-- 发现人 -->
      <van-field
        v-model="formData.discoverer"
        name="discoverer"
        label="发现人"
        placeholder="请输入发现人"
        required
        :rules="[{ required: true, message: '请输入发现人' }]"
      />

      <!-- 现场图片 -->
      <van-field name="photos" label="现场图片">
        <template #input>
          <van-uploader v-model="formData.photos" multiple :max-count="9" :after-read="afterRead" />
        </template>
      </van-field>

      <!-- 备注信息 -->
      <van-field
        v-model="formData.remarks"
        name="remarks"
        label="备注信息"
        type="textarea"
        placeholder="请输入备注信息"
        rows="3"
        autosize
      />

      <!-- 提交按钮 -->
      <div class="button-group">
        <van-button plain block @click="handleValidate"> 智能校验 </van-button>
        <van-button type="primary" block native-type="submit"> 提交表单 </van-button>
      </div>
    </van-form>

    <!-- Picker 弹窗 -->
    <van-popup v-model:show="showFormTypePicker" position="bottom">
      <van-picker
        :columns="formTypeOptions"
        @confirm="onConfirmFormType"
        @cancel="showFormTypePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryOptions"
        @confirm="onConfirmCategory"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="currentDateArray"
        title="选择日期"
        @confirm="onConfirmDate"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-time-picker
        v-model="currentTimeArray"
        title="选择时间"
        @confirm="onConfirmTime"
        @cancel="showTimePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { type UploaderFileListItem, closeToast, showLoadingToast, showToast } from 'vant';
import VoiceAssist from './components/VoiceAssist.vue';

const router = useRouter();

interface FormData {
  formType: string;
  defectCategory: string;
  urgency: string;
  equipmentName: string;
  equipmentDesc: string;
  defectPhenomenon: string;
  defectNumber: string;
  kksCode: string;
  discoveryTime: string;
  discoverer: string;
  photos: UploaderFileListItem[];
  remarks: string;
}

const formData = reactive<FormData>({
  formType: '缺陷单',
  defectCategory: '',
  urgency: 'urgent',
  equipmentName: '6号机组3号闭式冷却水泵电机',
  equipmentDesc: '',
  defectPhenomenon: '定子线圈温度1统变至负数，数据异常波动',
  defectNumber: '',
  kksCode: '',
  discoveryTime: '',
  discoverer: '张三',
  photos: [],
  remarks: '',
});

// 初始化发现时间为当前时间
const initDiscoveryTime = () => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  formData.discoveryTime = `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 页面加载时初始化时间
initDiscoveryTime();

const showFormTypePicker = ref(false);
const showCategoryPicker = ref(false);
const showDatePicker = ref(false);
const showTimePicker = ref(false);

// 用于存储日期选择器的值 [年, 月, 日]
const currentDateArray = ref(['2026', '03', '20']);
// 用于存储时间选择器的值 [时, 分]
const currentTimeArray = ref(['11', '30']);

const openDatePicker = () => {
  // 使用当前时间作为默认值
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  currentDateArray.value = [year, month, day];
  currentTimeArray.value = [hours, minutes];

  showDatePicker.value = true;
};

const onConfirmDate = ({ selectedValues }: any) => {
  currentDateArray.value = selectedValues as string[];
  showDatePicker.value = false;
  showTimePicker.value = true;
};

const onConfirmTime = ({ selectedValues }: any) => {
  currentTimeArray.value = selectedValues as string[];
  showTimePicker.value = false;

  // 组合日期和时间
  const [year, month, day] = currentDateArray.value;
  const [hours, minutes] = currentTimeArray.value;
  formData.discoveryTime = `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formTypeOptions = [
  { text: '缺陷单', value: '缺陷单' },
  { text: '维修单', value: '维修单' },
  { text: '巡检单', value: '巡检单' },
];

const categoryOptions = [
  { text: '设备故障', value: '设备故障' },
  { text: '安全隐患', value: '安全隐患' },
  { text: '性能异常', value: '性能异常' },
  { text: '其他', value: '其他' },
];

const onConfirmFormType = ({ selectedValues }: any) => {
  formData.formType = selectedValues[0];
  showFormTypePicker.value = false;
};

const onConfirmCategory = ({ selectedValues }: any) => {
  formData.defectCategory = selectedValues[0];
  showCategoryPicker.value = false;
};

const afterRead = (file: UploaderFileListItem | UploaderFileListItem[]) => {
  console.log('上传图片:', file);
};

const handleHistory = () => {
  router.push('/h5/history/voice-form');
};

const handleValidate = () => {
  showLoadingToast({
    message: '校验中...',
    forbidClick: true,
    duration: 1500,
  });
  setTimeout(() => {
    closeToast();
    showToast('校验通过');
  }, 1500);
};

const onSubmit = () => {
  showLoadingToast({
    message: '提交中...',
    forbidClick: true,
    duration: 2000,
  });
  setTimeout(() => {
    closeToast();
    showToast('提交成功');
    console.log('表单数据:', formData);
  }, 2000);
};
</script>

<style scoped>
.voice-input-page {
  min-height: 100vh;
  padding-bottom: 80px;
  background-color: #f7f8fa;
}

.button-group {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background-color: white;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 8px rgb(0 0 0 / 5%);
}

:deep(.van-field) {
  background-color: white;
}

:deep(.van-radio-group) {
  display: flex;
  gap: 16px;
}

:deep(.van-radio) {
  flex: 1;
}
</style>
