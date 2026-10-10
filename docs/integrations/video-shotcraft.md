# video-shotcraft 接入指南

## 目的与边界

把 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) 作为 **可选的镜头配方与 Remotion 示例参考库**，供 Reel Forge 的分镜/Build Agent 选用成熟的运动语法和已调校的参数。它不是第二个渲染引擎，也不会替代 Reel Forge 的 RenderIR、`ExplainerShot`、组内 `stage.jsx`、帧级时间轴或 QC。

上游仓库声明采用 **Apache-2.0**。本接入不把上游代码、模板、音频或视觉素材复制进 Reel Forge；使用者本地单独克隆上游仓库，避免把两套项目依赖和许可证混成一个包。若将来复制或改编上游源码，必须重新审查对应文件的许可证与声明义务。

- 上游仓库与许可证：[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) · [LICENSE](https://github.com/Vincentwei1021/video-shotcraft/blob/main/LICENSE)
- 镜头卡来源说明：[ATTRIBUTION.md](https://github.com/Vincentwei1021/video-shotcraft/blob/main/references/shots/ATTRIBUTION.md)
- 音频素材的来源和授权记录：[audio/ATTRIBUTION.md](https://github.com/Vincentwei1021/video-shotcraft/blob/main/assets/audio/ATTRIBUTION.md)

## 1. 配置本地参考库

将 Shotcraft 克隆到 Reel Forge 工作目录之外，例如与 Reel Forge 同级：

```bash
git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft.git ../video-shotcraft
export VIDEO_SHOTCRAFT_DIR="$(cd ../video-shotcraft && pwd)"
npm run verify:shotcraft
```

PowerShell：

```powershell
git clone --depth 1 https://github.com/Vincentwei1021/video-shotcraft.git ..\video-shotcraft
$env:VIDEO_SHOTCRAFT_DIR = (Resolve-Path ..\video-shotcraft).Path
npm run verify:shotcraft
```

`VIDEO_SHOTCRAFT_DIR` 必须指向 Shotcraft 仓库根目录，那里应同时有 `LICENSE`、`SKILL.md`、`gallery/api/library.json`、`references/shots/` 和 `demos/`。该路径会随环境传给 Build Agent；启动 Reel Forge 的生产命令时应保留此环境变量。

不设置该变量时接入是可选的，Reel Forge 仍按原有路径运行；验证命令会明确报告 SKIP，而不会自动下载仓库或网络访问。

## 2. 每次选卡的规则

1. **先决定叙事任务，再找动效。** 先明确观众此镜头需要理解的关系、变化或证据；不能为了用某张卡而反过来扭曲解说。
2. 从 `gallery/api/library.json` 校验卡名/样式名，再读对应的 `references/shots/` 卡片全文，确认适用情境、参数和已知坑。
3. 依卡片的“参考实现”定位并阅读**准确的 demo 源码**。配方描述不是参数的唯一真源；禁止只看卡名后凭印象重写。
4. 每镜原则上只选一种主运动语法。继承节奏、缓动和动作逻辑，不照搬源产品的文案、品牌、布局或整体视听表达。
5. 将动作适配到 Reel Forge 已有的镜头体系：`src/shots/Gn/SCxx.jsx` 声明镜头自己的 `SHOT_RECIPE`；组内拓扑和绘制逻辑放在 `src/shots/Gn/stage.jsx`；通用效果优先复用 `src/remotion/Primitives.jsx`、`src/remotion/Fx.jsx` 和现有视觉词表。不要再建一套 Composition/根组件或第二个渲染引擎。
6. Reel Forge 以 1280×720、30fps 的横屏逻辑画布为设计基准；部分 Shotcraft Motion demo 使用 480×270 的 `DesignStage` 坐标。复制实现时要显式换算坐标、尺寸与时长，不能将两套坐标直接混用。
7. 不要为单个动效无评估地引入 `three`、`@remotion/three`、`@remotion/motion-blur` 或其他依赖。先用现有实现独立改写；确实需要新增依赖时说明理由，并单独做依赖与渲染冒烟检查。

## 3. 来源记录

凡实际参考了 Shotcraft 卡片或 demo 的镜头，在 `src/shots/Gn/SCxx.jsx` 中加入简短注释，并同步记录到组内 `BUILD_NOTES.md`。记录格式：

```text
Shotcraft reference: <card-id> / <style-key>
Demo: <relative demo source path>
Upstream revision: <git rev-parse HEAD>
Adaptation: <what was changed for Reel Forge>
Assets reused: none
```

若是纯粹的动效思路参考、未复制具体实现，也应写明“technique reference; independently implemented”。不要把不存在的卡名、路径、版本或审查结果写进来源记录。

## 4. 版权与素材

- Apache-2.0 允许在满足许可证条件的前提下使用、修改和再分发受该许可证覆盖的作品；如果分发复制/修改的上游源码，应随附许可证副本、保留适用声明，并标注修改文件。商标许可不会因 Apache-2.0 自动授予。
- 不要把上游参考宣传片里的画面、截图、产品品牌或美术资产作为可自由复用的素材。公开可见不等于有复刻许可；采用动效技法并独立实现，不等于获准复制原片的具体表达。
- **音频逐文件审查**：上游音频归属记录明确指出有部分文件无法反查或需要商用前确认。不得因为仓库主许可证是 Apache-2.0 就推定所有音效/BGM 均受同样条款覆盖。默认不复制上游音频。
- 上游仓库及其单独资源的许可证/权利状态可能不同。来源表用于溯源，不是第三方作品授权凭证。

## 5. 预览与验收闭环

改镜后先预览目标镜头，不要立刻重新渲整片：

```bash
npm run debug:shot -- scene-012
# 打开 artifacts/debug/16x9/scene-012/frames/ 中的 PNG 检查帧
npm run verify:shot-sample -- --quick
npm run preview
```

将 `scene-012` 替换成实际 RenderIR 场景 ID。视觉修改满意后再看前 30 秒衔接，最终确认 Pilot 后才进入全片渲染。机器测量通过不能代替肉眼检查画面表达、可读性、动作弧和衔接。

## 当前集成边界

本集成提供可发现的本地参考库路径、Build Agent 指引与配置验证；它**不自动导入 Shotcraft 源码，也不保证 Agent 能访问该路径**。外部 `AGENT_COMMAND` 必须运行在能读取所配置目录与修改工作区的执行环境中。若 Agent 无法读取本地库，应明确报告并按 Reel Forge 原流程继续，不能声称使用过 Shotcraft。
