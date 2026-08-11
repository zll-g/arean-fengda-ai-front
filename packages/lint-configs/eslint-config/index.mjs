import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/*.js'] }, // 忽略 node_modules 和 dist 目录
  eslint.configs.recommended, // 使用 ESLint 的推荐配置
  tseslint.configs.base, // 使用 TypeScript ESLint 的基础配置
  ...pluginVue.configs['flat/recommended'], // 使用 Vue ESLint 的推荐配置
  {
    files: ['**/*.vue'], // 针对所有 .vue 文件
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser', // 使用 TypeScript ESLint 解析器
      },
    },
  },
  {
    rules: {
      'no-debugger': 'error', // 禁止使用 debugger 语句
      // 'no-console': ['error', { allow: ['warn', 'error', 'info', 'clear'] }], // 禁止使用 console 语句，但允许 warn, error, info 和 clear
      'prefer-const': 'error', // 强制使用 const 而不是 let
      'sort-imports': ['error', { ignoreDeclarationSort: true }], // 强制排序导入语句，但忽略声明排序
      'no-duplicate-imports': 'error', // 禁止重复导入
      // 该规则强制使用 '@ts-expect-error' 注释在 TypeScript 代码中指示故意的类型错误，提高代码的清晰度和可维护性。
      '@typescript-eslint/prefer-ts-expect-error': 'error', // 强制使用 @ts-expect-error 而不是 @ts-ignore
      // 强制使用 'import type' 进行类型导入
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports', // 使用内联类型导入样式
          disallowTypeAnnotations: false, // 允许类型注解
        },
      ],
      // 强制在导入仅包含内联类型限定符的规范时使用顶级导入类型限定符
      '@typescript-eslint/no-import-type-side-effects': 'error', // 禁止导入类型时产生副作用
      'vue/max-attributes-per-line': 'off', // 关闭每行最多属性数的限制
      'vue/singleline-html-element-content-newline': 'off', // 关闭单行 HTML 元素内容换行的限制
      'vue/multi-word-component-names': 'off', // 关闭多单词组件名称的限制
      'vue/html-self-closing': [
        'error',
        {
          html: { component: 'always', normal: 'always', void: 'any' }, // 强制 HTML 组件和普通元素始终自闭合，void 元素可以自闭合或不自闭合
          math: 'always', // 强制 math 元素始终自闭合
          svg: 'always', // 强制 svg 元素始终自闭合
        },
      ],
    },
  },
);
