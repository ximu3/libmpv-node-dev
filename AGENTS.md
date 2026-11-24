# libmpv-node

本项目交付独立的 Node 原生绑定。公共 API 适配在 `src/`，Rust 核心和 Node-API 接入分别在 `crates/core` 和 `crates/binding`。操作、资源寿命和验收范围见 [libmpv-node 设计](https://github.com/ximu3/kisaki-dev/tree/main/refactor/design/projects/libmpv-node)和[原生库工程规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/projects/native-runtime.md)。

工程、工具、测试和示例遵守[共用工程规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/engineering/conventions.md)。Node 环境的自维护源码使用 TypeScript，原生实现使用 Rust。构建、检查和消费任务在 `vite.config.ts` 定义，通过 `pnpm exec vp run` 执行。消费者从配对的 tarball 安装并运行。

每项独立变更从最新 main 建立短分支，通过 PR 和必需检查后 Squash 合并。管理员同样遵守主线保护。公开开发仓库的 Issue 和 PR 仅限受邀协作者创建。仓库操作使用 git 和 gh，遵守[共同协作规范](https://github.com/ximu3/kisaki-dev/blob/main/refactor/design/engineering/workspace.md#collaboration)。

Windows x64 和 arm64 的 `engine:windows <输出目录> --cache <归档目录>` 从固定输入构建 FFmpeg、MuJS、仅启用 DirectWrite 的 libass 和带补丁的 libmpv。输出包含媒体 DLL、PE 依赖清单、第三方许可材料及单独的对应源码。运行 `build` 后可用 `pack:platform <制品目录> --runtime <引擎输出目录>` 组装开发包。用 `test:consumers <制品目录> --electron <可执行文件>` 核对安装后的声明和两个宿主的实际调用。

四个 Unix 目标使用 `engine:unix` 准备媒体运行库。各目标先运行 `build`，再用 `pack:platform` 生成主包与平台包，用 `verify:media` 验证仓库外的 Node 和实际 Electron。手动运行 CI 并选择 all，会将六份已验证的平台包交给 `pack:all` 生成一份主包，再分别从最终 tarball 消费。运行记录包含各平台清单与摘要。
