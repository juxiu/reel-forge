# Reference parity sample

这是 reel-forge 的“样片级生产蓝图”，用于把 anything2explainer 的 44 镜头 / 8 构建组 / 双轮 QC 方法映射到本项目自己的原创主题，而不是复制参考项目源码或画面。

## 结构

- 44 个独立 SCxx 镜头契约，按 G1–G8 分组。
- 每镜头包含主角尺寸、持续动作、30 帧稳定期、运镜与 6 张 still 采样点。
- 构建阶段可以由外部 Agent provider 分别承担 Research / Director / G1…Gn Build / QC / Repair 角色。
- QC 固定为 Render → Frame → Motion → Visual Regression → Agent QC → Repair → Recheck。
- 具体主题仍由 fixtures/project.json + fixtures/script.json 决定，样片蓝图只作为质量基准。

## 与参考流程的边界

本蓝图只复用生产方法：组化、逐镜头、人工确认点、双轮 QC、still 检查和性能测渲；不复制参考项目的脚本、示例文字、图片或镜头源码。
