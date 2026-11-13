# 测试与视觉复查

本轮新增安全区外围背景回归，48项全部通过。scripts/verify-background.mjs覆盖5种尺寸/DPR下菜单与厨房共10组；缓存/降级颜色差最多一级，极少数通道舍入，外围不重复抽屉。重新执行完整93秒、体验/音频、单件份量及拖动检查。截图采集的后台冻结不用于局长验证。

版本1.4.0，2026-10-07；48项单元/集成/回归已通过，详见release/preflight-report.json。

| 层次 | 实际覆盖 | 命令/证据 |
| --- | --- | --- |
| 规则单元 | 水温/熟度独立、四锅独立、先面后水、早放/缺料/重复/过熟、补水上限、烧焦替补、胜负 | npm test；tests/cooking.test.mjs |
| 输入回归 | 点击不投料、拖动、主指/次指、取消/越界、重复结束、倒水锁 | tests/foundation.test.mjs、drag.test.mjs |
| 物理视觉约束 | 水位连续上升、补水不退空锅、液面在锅口；锅底接触托盘内台面且位于前沿之后 | tests/drag.test.mjs |
| 计时和事务 | 60/30/20/10 FPS跨界、烧焦熟度封顶、出餐评价冻结/同价、截止结算一次、评价显示时点 | tests/cooking.test.mjs、drag.test.mjs |
| 生命周期/音频/存档 | 十局获胜重开RAF1/监听7/音频8、前后台、模态暂停、损坏数据、坏音频容错 | tests/experience.test.mjs |
| 真实完整操作 | 鼠标拖动自然93秒，三碗30000、烧焦清理/备用、后台1.5秒、结果误触/重开 | scripts/verify-gameplay.mjs；previews/phase4/browser-check.json |
| 体验与解码 | 三页教程、设置/保存、暂停，12MP3实际解码，音频全失败时仍能拖动加水 | scripts/verify-experience.mjs |
| 屏幕 | 16:9/长屏/4:3/DPR、厨房延展、4M像素预算 | verify-preview、canvas-size-check.json |
| 开发/正式 | DEV统计显示场景、锅状态/计时/选择/触摸/帧率；正式入口无统计模块 | scripts/verify-dev.mjs |
| 视觉对照 | 13个不同原视频关键帧，每项有要求、具体问题、修改及前后图；实际查看后继续修正托盘落点 | comparison/requirements-review.md、review.html |
| 微信/真机 | 工具刷新/预览成功；完整自动截图与iOS/Android触摸/听感/性能未验证 | WECHAT_ACCEPTANCE.md |

capture-final只用于状态采集：等待实际steam/READY，在截图耗时内按标准Hide/Show暂停，结果标CAPTURED。它不能单独证明需求符合。capture-parity-states在开发QA入口控制同一规则时钟并冻结渲染，仅取得可比较的确定状态；正常操作/局长证据来自verify-gameplay，不冒充QA快进为真实操作。正式包没有这些入口。

人工复查顺序：布局/尺寸→水位/锅沿/食材→水壶/手套→READY归属→托盘接触与前沿遮挡→评价同价→备用锅与空炉位→失败刷锅及成功结算。13项图文审计记录具体差异，不能用截图文件存在或无异常直接标视觉通过。
