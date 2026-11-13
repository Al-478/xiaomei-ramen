# 当前美术与画面交接

1.3.0单件素材已纳入：egg-single、seasoning-single、egg-shells，来源和提示词见art_sources/portion-generation-prompts.json。各材料份量与入锅尺寸独立，蛋壳与蛋液分开绘制。1.4.0只修正背景渲染坐标，不重新生成美术；单幅背景按游戏安全区坐标绘制，外围延展边缘。

版本1.4.0，2026-10-07。正式源图48项；运行29图及12项原创MP3，约2.62 MiB。源数据见assets/manifest.json；运行筛选见assets/runtime-groups.json，导出node scripts/art/export.mjs。

保留用户确认的粉色全宽厨房、金黄锅具、柜内备用锅、空托盘、原创小美及新标题。宽背景2400×1086，核心逻辑1448×1086等比；核心锅具不随屏幕比例拉伸。

本轮新素材：
- art_sources/noodle-strands-v2.png → assets/images/cookware/noodle-strands.png：轻描细卷熟面，代替粗亮整面块。
- art_sources/oven-mitt-v1.png → assets/images/effects/oven-mitt.png：原创粉色花纹隔热手套，提壶与端锅复用，右手运行时镜像。
- 工具：内置image_gen.imagegen；完整提示词art_sources/parity-generation-prompts.json，授权见ASSET_LICENSES.md。

运行合成：同一空锅轮廓+锅口clip；暖清汤/红汤和水位渐升；细面/葱花/荷包蛋；烧焦轮廓染黑与焦面；锅底/炉架使用接触点；出餐锅底与托盘台面同点，重新绘制盘前沿遮挡，不以贴图外框底部定位。素材锚点在assets/scene-layout.json.mounts；相关ServingGeometry.ts/PotGeometry.ts。

UI：托盘上方花朵评价气泡、相同冻结售价与金币；READY贴所属锅左前侧；底部长白条移除。失败采用独立蓝色泡沫刷锅场景与较大角色，成功为粉色捧面庆祝。可复查的原片/修改前/修改后图见comparison/review.html及review-01..04.png。

旧pot-water/pot-noodles/pot-seasoned/bubbles/pour-stream/noodle-surface从运行组移除，原始源图留作追溯；不得将原视频帧裁为正式贴图。分析图和生成原图不进入运行包。
