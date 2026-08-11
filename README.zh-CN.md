## 运行步骤

- pnpm install
- pnpm run dev

**简体中文**

# 一个基于Turbo、Vue3.5+、TypeScript5+的 Monorepo 组件库模板项目，帮助快速搭建属于自己/企业级的组件库🚀

这是一个基于 `Turborepo + Vue 3.5 + TypeScript` 的现代化组件库模板，采用 Monorepo 架构来管理多个包，涵盖了 ESLint、Prettier、Stylelint、Commitlint + Husky + Lint-Staged 和 TypeScript 的项目规范配置。此模板提供了一套完整的开发环境，旨在让开发者能够专注于组件的开发，而无需担心底层配置的复杂性，帮助快速搭建属于自己/企业级的组件库（还配备了详情的保姆级注释~）。

## ✨ 特性

- 📦 基于 Monorepo 架构，更好的代码复用和版本管理
- 🚫 强制采用 pnpm 管理依赖，解决幽灵依赖、节省磁盘空间和加快安装速度
- 🚀 使用 Turbo + Vue 3.5 + TypeScript，享受最新技术特性
- 🎨 集成完整的代码规范配置，保证代码质量
- 📚 使用 VitePress 构建文档，支持国际化语言切换
- 🔥 组件库支持按需引入，减小打包体积
- 🎯 完整的类型提示，提升开发体验
- 🛠️ 丰富的工具函数和 Hooks，提高开发效率
- 🔄 支持热更新，提升开发体验
- ⚡️ 基于 Vite/Rollup 构建 ESM 和 CJS 产物
- ❤️ 配备两种打包模式，gulp + rollup统一打包或者每个子包的 rollup/vite 单独打包，可由开发者根据喜好自主选择
- 📝 changeset 管理多包的版本和发布

## 📦 项目结构

项目采用 Monorepo 架构，主要包含以下部分：

- `packages/lint-configs`：包含所有配置相关的包，例如 ESLint、Prettier、Stylelint、Commitlint 和 TypeScript 配置。这些配置包确保代码风格的一致性和高质量。
- `packages/hooks`：包含所有自定义 Hooks 的包。
- `packages/directives`：包含所有指令的包。
- `packages/utils`：包含所有工具函数的包。
- `packages/ui`：包含所有 UI 组件的包。
- `apps/docs`：文档应用，使用 Vitepress 构建，提供详尽的组件库文档和使用指南。
- `playground`：演练场，用于测试和演示组件的示例应用，使用 Vite 构建。
- `build`：gulp管理的统一打包脚本，与每个子包的单独打包互不影响。

此外，项目还包括自动化脚本和持续集成配置，以支持高效的开发流程和质量保证。

## pkg.json相关命令解读

```bash
"dev": "turbo run dev", // 启动所有包的开发环境
"dev:web": "pnpm -F @yusui/web run dev", // 启动@yusui/web
"build": "turbo run build", // 构建所有包
"build:gulp": "gulp -f build/gulpfile.cjs",// 使用gulp管理的统一打包脚本
"format": "prettier --write \"**/*.{js,jsx,ts,tsx,mjs,mts,md,vue}\"", // 格式化所有包的代码
"clean": "turbo run clean --continue && rimraf .turbo dist && rm -rf node_modules", // 清理所有包
"deps:update": "pnpm update -r --latest", // 更新所有包的依赖
"deps:check": "pnpm outdated -r", // 检查所有包的依赖
"preinstall": "npx only-allow pnpm", // 确保使用 pnpm 安装依赖
"postinstall": "turbo run build",// 安装依赖后，构建所有包，确保项目成功运行
"prepare": "husky install", // 安装 Husky 钩子
```

## 🚀 快速开始

```bash
# 以下请替换为自己的包名，@yusui
pnpm add @yusui/ui @yusui/util @yusui/directives

# 演示安装：
pnpm add @yusui/ui @yusui/utils @yusui/directives
``

## 相关链接

- [Vue 3](https://vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Turborepo](https://turbo.build/repo)
- [Vite](https://vitejs.dev/)

## 帮助指南

1. 如果遇到不能执行 `rm -rf` 或者 `shell` 命令的问题，可以使用git bash终端运行命令（安装git后自带的）。
   ![](https://huangmingfu.github.io/drawing-bed/images/pic-go/202412251542234.png)
   项目根目录中的，`clean`、`rename-pkg`等相关命令不能运行，可以使用上面的方法解决。
2. 如遇到 `pnpm run dev` 运行失败的问题，需要先执行一遍打包命令：`pnpm run build`，再运行 `pnpm run dev`。

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## License

[MIT](LICENSE)
```
