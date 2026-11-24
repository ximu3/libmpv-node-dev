# libmpv-node

本项目交付独立的 Node 原生绑定。公共 API 适配在 `src/`，Rust 核心和 Node-API 接入分别在 `crates/core` 和 `crates/binding`。操作、资源寿命和验收范围见 [libmpv-node 设计](https://github.com/ximu3/kisaki-dev/tree/main/refactor/design/projects/libmpv-node)和[原生库工程规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/projects/native-runtime.md)。

工程、工具、测试和示例遵守[共用工程规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/engineering/conventions.md)。Node 环境的自维护源码使用 TypeScript，原生实现使用 Rust。构建、检查和消费任务在 `vite.config.ts` 定义，通过 `pnpm exec vp run` 执行。消费者从配对的 tarball 安装并运行。

每项独立变更从最新 main 建立短分支，通过 PR 和必需检查后 Squash 合并。管理员同样遵守主线保护。公开开发仓库的 Issue 和 PR 仅限受邀协作者创建。仓库操作使用 git 和 gh，遵守[共同协作规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/engineering/workspace.md#collaboration)。
