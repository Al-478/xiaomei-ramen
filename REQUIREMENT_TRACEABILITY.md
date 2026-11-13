# 需求逐项证据表

本轮1.4.0证据：48项测试、自然93秒拖动、单件材料和10组背景/安全区渲染检查通过；微信菜单窗口已实际复查。历史原视频对照继续保留；真机与正式发布未完成。

版本1.4.0，日期2026-10-07。主文档45节、补丁55节逐项核对。用户最新明确修改优先；“部分可验证”不等于全部通过。视觉不是仅按截图能显示判定，详见[comparison/requirements-review.md](<D:/codex/mini game/美少女煮鸡蛋面/comparison/requirements-review.md>)。

| 文档 | 序号 | 要求与原文 | 本轮状态 | 证据 | 判据和边界 |
| --- | --- | --- | --- | --- | --- |
| 121212.md | 1 | 最终项目名称 [原文第49行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:49>) | 用户覆盖 | README.md；src/scenes/MenuScene.ts | 名称采用用户确认的《美少女煮拉面》，角色小美。 |
| 121212.md | 2 | 核心目标 [原文第82行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:82>) | 已核对 | src/gameplay/RoundSystem.ts；tests/cooking.test.mjs | 四锅、烹饪、金额、93秒回合、成功失败完整；具体评分系校准。 |
| 121212.md | 3 | 工作方式 [原文第116行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:116>) | 已核对 | comparison/requirements-review.md | 本轮读取文档、发现漏项、直接修改并复查，未停在方案。 |
| 121212.md | 4 | 视频分析 [原文第159行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:159>) | 部分可验证 | reference_analysis/spec.md；timeline.csv | 视觉、元数据和真实游戏区域已分析；原曲听音无法验证。 |
| 121212.md | 5 | 建立时间线 [原文第247行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:247>) | 已核对 | reference_analysis/timeline.csv | 43个可观察事件，未冒充所有底层触发精确时间。 |
| 121212.md | 6 | 玩法还原原则 [原文第294行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:294>) | 已核对 | src/gameplay；assets/runtime-groups.json | 只保留原核心料理玩法，不加经营、顾客、广告或养成。 |
| 121212.md | 7 | 视觉策略 [原文第323行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:323>) | 已修订 | comparison/requirements-review.md | 粉色厨房、金黄色锅具保留用户确认美术；熟面和手套重新制作。 |
| 121212.md | 8 | 角色和品牌替换 [原文第364行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:364>) | 用户覆盖 | assets/images/character；assets/images/ui/logo.png | 原创角色及Logo，名称使用最新用户确认。 |
| 121212.md | 9 | 正式美术要求 [原文第400行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:400>) | 已修订 | assets/manifest.json；ASSET_LICENSES.md | 45项正式源图；无Emoji和占位贴图，新增细卷面及手套。 |
| 121212.md | 10 | 布局还原 [原文第456行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:456>) | 已对照 | assets/scene-layout.json；comparison/requirements-review.md | 核对食材、四锅、水壶、托盘、HUD；锅具放大、柜内备用锅按用户后补要求。 |
| 121212.md | 11 | 微信小游戏屏幕适配 [原文第483行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:483>) | 用户覆盖 | src/core/Viewport.ts；tests/foundation.test.mjs | 核心4:3等比、安全区映射；用户要求背景延展铺满两侧。 |
| 121212.md | 12 | 技术方案 [原文第528行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:528>) | 已核对 | src/core/Platform.ts；release/preflight-report.json | 原生Canvas TypeScript架构，正式包无DOM和浏览器依赖。 |
| 121212.md | 13 | 工程结构 [原文第560行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:560>) | 已核对 | FINAL_FILE_TREE.txt | 源代码、素材、脚本、测试与独立运行目录齐全。 |
| 121212.md | 14 | 锅状态机 [原文第631行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:631>) | 已核对 | src/gameplay/Pot.ts；tests/cooking.test.mjs | 各锅独立状态、食材、水温、熟度、错误与出餐锁。 |
| 121212.md | 15 | 食材规则 [原文第669行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:669>) | 已核对 | src/gameplay/Pot.ts；tests/cooking.test.mjs | 面/调料可预放，水开下葱蛋；错误时机影响评分。 |
| 121212.md | 16 | 输入方式 [原文第701行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:701>) | 用户覆盖 | src/core/InputManager.ts；tests/drag.test.mjs | 用户明确改为拖动，覆盖原点击要求；取消、单指与错误落点已验证。 |
| 121212.md | 17 | 动画 [原文第743行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:743>) | 已修订 | src/scenes/ActionView.ts；KitchenView.ts；ServingFeedback.ts | 补手套、锅身烧黑、托盘评价、前排标记归属、蛋白凝固和角色结算结构。 |
| 121212.md | 18 | 音频 [原文第774行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:774>) | 部分可验证 | src/core/AudioManager.ts；previews/final/experience-check.json | 原创12项MP3、触发与解码通过；原曲听音和手机听感未验证。 |
| 121212.md | 19 | 文字 [原文第824行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:824>) | 用户覆盖 | src/scenes/TutorialScene.ts；MenuScene.ts | 教程随拖动规则修订，标题/角色采用新名称。 |
| 121212.md | 20 | HUD [原文第852行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:852>) | 已对照 | src/scenes/KitchenView.ts；comparison/requirements-review.md | 倒计时、金币、目标、备用锅与商品卡核对；评价从底栏移到托盘气泡。 |
| 121212.md | 21 | 游戏流程 [原文第878行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:878>) | 已核对 | src/core/Game.ts；tests/experience.test.mjs | 菜单、三页教程、料理、结果、重开、返回；连续十局不重复对象。 |
| 121212.md | 22 | Platform 适配 [原文第915行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:915>) | 已核对 | src/core/Platform.ts | 微信屏幕、输入、音频、存储、生命周期集中适配。 |
| 121212.md | 23 | 生命周期 [原文第943行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:943>) | 已核对 | src/core/Game.ts；tests/foundation.test.mjs | 后台停循环和声音，前台重算尺寸、不扣后台时间。 |
| 121212.md | 24 | 本地存档 [原文第964行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:964>) | 已核对 | src/core/SaveManager.ts；tests/experience.test.mjs | 只保存设置、教程、最佳成绩，支持版本和数据损坏。 |
| 121212.md | 25 | 审核友好要求 [原文第986行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:986>) | 部分可验证 | release/preflight-report.json；RELEASE_CHECKLIST.md | 客户端内容和包体扫描通过；平台审核/主体事项不能代替人工。 |
| 121212.md | 26 | 启动图和图标 [原文第1026行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1026>) | 已核对 | assets/images/ui；release/materials | 原创Logo、图标和加载候选图存在；发布尺寸按后台实际要求导出。 |
| 121212.md | 27 | 游戏简介 [原文第1048行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1048>) | 已核对 | README.md | 已有不含原品牌的小游戏后台简介。 |
| 121212.md | 28 | 性能 [原文第1064行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1064>) | 部分可验证 | src/core/GameLoop.ts；release/browser-performance.json | 缓存、像素预算、数量稳定与开发性能基线；手机FPS未验证。 |
| 121212.md | 29 | 测试 [原文第1089行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1089>) | 已核对 | tests；previews/phase4/browser-check.json | 单元/集成/回归与自然93秒完整操作；微信真机另列。 |
| 121212.md | 30 | DEV 模式 [原文第1130行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1130>) | 已补齐 | scripts/DebugOverlay.ts；scripts/verify-dev.mjs | DEV开发入口显示帧率、场景、锅状态/计时、选择、触摸；正式入口没有该模块。 |
| 121212.md | 31 | 构建 [原文第1155行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1155>) | 已核对 | scripts/build.mjs；release/resource-report.json | esbuild生成微信入口，依赖在package和锁文件。 |
| 121212.md | 32 | 测试 AppID [原文第1192行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1192>) | 用户覆盖 | project.config.json | 使用用户授权AppID，业务层无重复AppID，不需要AppSecret。 |
| 121212.md | 33 | 参考画面对比 [原文第1206行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1206>) | 已执行 | comparison/requirements-review.md；comparison/review.html | 13个不同原视频关键帧，逐项描述差异及修改前/后，非只检查能显示。 |
| 121212.md | 34 | 视觉还原优先级 [原文第1241行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1241>) | 已执行 | comparison/requirements-review.md | 先核布局和尺寸，再核汤面/配料、动作、控件、结算；保留用户后补覆盖。 |
| 121212.md | 35 | 允许保留的相似性 [原文第1275行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1275>) | 已核对 | ASSET_LICENSES.md；comparison/requirements-review.md | 结构/规则参考，品牌、角色、正式音频独立。 |
| 121212.md | 36 | 不要过度改造 [原文第1302行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1302>) | 已核对 | src/gameplay；src/scenes | 未增加原片不存在的顾客排队、经营、升级或剧情。 |
| 121212.md | 37 | 素材生成能力 [原文第1324行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1324>) | 已执行 | art_sources/parity-generation-prompts.json | 内置图片生成工具制作正式细卷面和粉色手套；源图与提示词保留。 |
| 121212.md | 38 | 最终微信兼容检查 [原文第1345行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1345>) | 部分可验证 | release/preflight-report.json；WECHAT_ACCEPTANCE.md | 禁止API和包体检查通过；开发工具完整自动操作与真机未验证。 |
| 121212.md | 39 | 最终运行 [原文第1366行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1366>) | 已执行 | release/preflight-report.json | 类型、测试、构建、总检查实际重跑；npm ci按锁文件。 |
| 121212.md | 40 | 代码质量 [原文第1388行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1388>) | 已修订 | src/config/timing.ts；src/scenes/PotGeometry.ts | 重要时长集中配置，独立视图模块；原位与托盘坐标按布局组织。 |
| 121212.md | 41 | 最终清理 [原文第1432行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1432>) | 已执行 | scripts/preflight.mjs；assets/runtime-groups.json | 移除六个不再使用的运行贴图，开发分析资料不进入包。 |
| 121212.md | 42 | Git [原文第1451行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1451>) | 已核对 | .gitignore；本地Git状态 | 已有Git工程，未执行破坏性重置；文件原本尚未提交。 |
| 121212.md | 43 | 完成标准 [原文第1478行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1478>) | 部分可验证 | FINAL_ACCEPTANCE.md | 自动检查和视觉修订记录齐全；真实微信触摸、设备性能不能标为完成。 |
| 121212.md | 44 | 最终回复 [原文第1556行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1556>) | 已核对 | FINAL_ACCEPTANCE.md | 最终汇报区分实际验证、用户覆盖与无法验证事项。 |
| 121212.md | 45 | 现在开始 [原文第1582行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/121212.md:1582>) | 已执行 | comparison/requirements-review.md | 本轮在原项目中补齐和验收，没有另起项目。 |
| PATCH.md | 1 | 真正的最终交付目标 [原文第26行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:26>) | 部分可验证 | FINAL_ACCEPTANCE.md | 工程/规则/浏览器及视觉验证已执行；微信完整触摸与真机保留未验证。 |
| PATCH.md | 2 | 微信小游戏当前规则不得写死 [原文第77行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:77>) | 部分可验证 | WECHAT_ACCEPTANCE.md；release/wechat-parity-check.json | 依据当前开发工具校验结果，未把平台规则作为永久常量；后台须人工核对。 |
| PATCH.md | 3 | 主包、分包和资源体积 [原文第118行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:118>) | 已核对 | release/resource-report.json | 统计JS/图/音频、最大文件；删除6张不用的运行贴图，当前单包。 |
| PATCH.md | 4 | 资源引用完整性 [原文第176行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:176>) | 已核对 | scripts/check-assets.mjs；scripts/art/check.mjs | 引用、清单、大小写、解码、透明边距及运行包裁剪。 |
| PATCH.md | 5 | AssetManager 必须处理失败 [原文第201行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:201>) | 已核对 | src/core/AssetManager.ts；tests/foundation.test.mjs | loading/success/failed/retry、有限重试与失败恢复。 |
| PATCH.md | 6 | Loading 必须是真实加载进度 [原文第238行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:238>) | 已核对 | src/scenes/BootScene.ts | 按实际资源数量计算加载进度，完成后才进菜单。 |
| PATCH.md | 7 | 首屏启动性能 [原文第262行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:262>) | 已核对 | assets/runtime-groups.json；previews/phase3/browser-check.json | 首屏5图，料理资源开始后加载，音频手势解锁。 |
| PATCH.md | 8 | 屏幕适配补充 [原文第280行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:280>) | 已核对 | src/core/Viewport.ts；tests/foundation.test.mjs | 多比例、DPR预算、等比坐标往返和宽屏两侧背景。 |
| PATCH.md | 9 | 安全区域 [原文第306行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:306>) | 已核对 | src/core/Viewport.ts | 安全区复核，异常竖屏安全区不会污染横屏映射。 |
| PATCH.md | 10 | 横竖屏行为 [原文第335行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:335>) | 已核对 | src/core/Game.ts；game.json | 横屏，resize及前台重新取尺寸。 |
| PATCH.md | 11 | 输入系统增强 [原文第353行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:353>) | 已核对 | src/core/InputManager.ts；tests/foundation.test.mjs | 四种触摸阶段、主指控制、次指不接管与取消；改为拖动后更新回归。 |
| PATCH.md | 12 | 点击命中优先级 [原文第386行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:386>) | 已核对 | src/scenes/GameScene.ts；tests/experience.test.mjs | 前排优先命中，模态独占输入，结果场景释放旧场景。 |
| PATCH.md | 13 | 确定性游戏时间 [原文第410行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:410>) | 已核对 | src/gameplay/Pot.ts；RoundSystem.ts | 用统一游戏时间推进，不拿后台墙钟计算料理。 |
| PATCH.md | 14 | 低帧率测试 [原文第442行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:442>) | 已核对 | tests/cooking.test.mjs | 60/30/20/10 FPS和大步长边界一致，烧焦之后熟度封顶。 |
| PATCH.md | 15 | 暂停体系 [原文第473行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:473>) | 已核对 | src/core/Game.ts；src/ui/SettingsDialog.ts | 暂停计时、声音和特效；前后台恢复不重建系统。 |
| PATCH.md | 16 | 音频真实设备问题 [原文第501行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:501>) | 部分可验证 | src/core/AudioManager.ts；tests/experience.test.mjs | 池上限、失败、释放、独立开关通过；手机音频听感未测。 |
| PATCH.md | 17 | 存档版本 [原文第528行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:528>) | 已核对 | src/core/SaveManager.ts；tests/experience.test.mjs | 版本、默认值、坏数据、迁移、写失败内存回退。 |
| PATCH.md | 18 | 正式版配置 [原文第565行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:565>) | 已核对 | src/config/version.ts；scripts/preflight.mjs | DEV=false，正式包无测试作弊和开发统计入口。 |
| PATCH.md | 19 | 版本号 [原文第597行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:597>) | 已核对 | src/config/version.ts；package.json | 版本统一为1.2.0，锁文件和报告同步。 |
| PATCH.md | 20 | 错误隔离 [原文第630行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:630>) | 已核对 | src/core/Game.ts；src/scenes/ActionView.ts | 动画失败有记录并隔离；核心错误安全结束，不吞掉全部错误。 |
| PATCH.md | 21 | 重复启动保护 [原文第660行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:660>) | 已核对 | tests/foundation.test.mjs；tests/experience.test.mjs | 重复start/bind/init不增加循环、监听和音频。 |
| PATCH.md | 22 | 内存泄漏专项检查 [原文第688行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:688>) | 已核对 | tests/experience.test.mjs | 十局获胜重开对象数稳定，RAF1/监听7/音频8。 |
| PATCH.md | 23 | 极端操作测试 [原文第719行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:719>) | 已核对 | tests/cooking.test.mjs；tests/drag.test.mjs | 锁单笔出餐、取消/重复结束/倒水锁、局末拒绝、多指与后台回归。 |
| PATCH.md | 24 | 数值边界 [原文第756行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:756>) | 已核对 | tests/cooking.test.mjs；src/core/SaveManager.ts | 金额、时间、缺料评分、数量上限和NaN/负值边界。 |
| PATCH.md | 25 | 视觉像素边界 [原文第786行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:786>) | 已核对 | scripts/art/check.mjs；src/scenes/PotGeometry.ts | 透明padding、同一锅体、锅口遮罩和连续水位；四锅标记归属已修。 |
| PATCH.md | 26 | 字体回退 [原文第808行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:808>) | 已核对 | src/config/runtime.ts | 动态文本有系统中文字体回退，字体文件不打包。 |
| PATCH.md | 27 | 颜色与可读性 [原文第834行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:834>) | 已对照 | comparison/requirements-review.md | 手机比例截图核对倒计时、金额、按钮、教程，评价不再挤长底条。 |
| PATCH.md | 28 | 正式素材许可证记录 [原文第855行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:855>) | 已核对 | ASSET_LICENSES.md；art_sources/parity-generation-prompts.json | 新增原创细卷面与手套的来源/提示词/用途有记录。 |
| PATCH.md | 29 | 隐私最小化 [原文第884行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:884>) | 已核对 | src/core/Platform.ts；release/preflight-report.json | 无账号、头像、位置、麦克风等收集接口。 |
| PATCH.md | 30 | 联网依赖审计 [原文第918行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:918>) | 已核对 | release/preflight-report.json | 正式包离线本地资源，无HTTP/CDN/远程字体。 |
| PATCH.md | 31 | 审核体验模式 [原文第949行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:949>) | 已核对 | src/scenes/TutorialScene.ts；previews/final/experience-check.json | 不用登录/广告/分享/付费，教程可立即开始。 |
| PATCH.md | 32 | 页面文案审计 [原文第989行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:989>) | 已核对 | scripts/preflight.mjs；src/scenes | 用户界面无旧品牌/DEBUG/TODO；开发报告不进运行包。 |
| PATCH.md | 33 | 应用图标和宣传图 [原文第1012行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1012>) | 已核对 | release/materials；RELEASE_CHECKLIST.md | 原创图标、菜单/游戏宣传候选；平台尺寸不猜测。 |
| PATCH.md | 34 | README 发布说明增强 [原文第1050行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1050>) | 已核对 | README.md；RELEASE_CHECKLIST.md | 开发/正式构建/导入/AppID/设备测试/后台限制均明确。 |
| PATCH.md | 35 | 发布配置不得散落 [原文第1087行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1087>) | 已核对 | project.config.json；game.json；src/config/version.ts | AppID、方向、版本集中，不散落业务层。 |
| PATCH.md | 36 | 禁止提交开发分析资源 [原文第1112行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1112>) | 已核对 | scripts/build.mjs；release/preflight-report.json | 视频、参考帧、源图集、测试与QA开发入口不进入微信包。 |
| PATCH.md | 37 | 敏感信息扫描 [原文第1134行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1134>) | 已核对 | scripts/preflight.mjs；.gitignore | 秘密、本机绝对路径及私有配置扫描/排除。 |
| PATCH.md | 38 | Git 忽略文件 [原文第1156行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1156>) | 已核对 | .gitignore | 排除依赖、构建、私有配置、日志和大量分析帧，不删正式素材。 |
| PATCH.md | 39 | 构建可复现性 [原文第1179行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1179>) | 已核对 | package-lock.json；README.md | 固定依赖，npm ci重跑与本地构建工具验证。 |
| PATCH.md | 40 | TypeScript 严格度 [原文第1209行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1209>) | 已核对 | tsconfig.json；src/core/types.ts | strict，核心类型明确，没有将全部wx声明any。 |
| PATCH.md | 41 | 测试分层 [原文第1239行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1239>) | 已核对 | tests；TEST_PLAN.md | 单元/集成/回归与正常93秒流程；QA截图另行标注。 |
| PATCH.md | 42 | 微信开发者工具人工验收清单 [原文第1282行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1282>) | 部分可验证 | WECHAT_ACCEPTANCE.md | 导入/刷新/预览有工具证据；自动截图超时，未伪造全通过。 |
| PATCH.md | 43 | 真机测试矩阵 [原文第1346行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1346>) | NOT VERIFIABLE | WECHAT_ACCEPTANCE.md | 无连接的iOS/Android设备；设备测试矩阵已提供。 |
| PATCH.md | 44 | 性能基线 [原文第1379行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1379>) | 部分可验证 | release/browser-performance.json；scripts/DebugOverlay.ts | 帧、对象、像素和加载开发基线；温度/手机内存没有实测。 |
| PATCH.md | 45 | 发布包检查脚本 [原文第1408行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1408>) | 已核对 | scripts/preflight.mjs | 类型、测试、构建、资源/API/秘密/版本扫描和报告。 |
| PATCH.md | 46 | 禁止 API 扫描 [原文第1441行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1441>) | 已核对 | scripts/preflight.mjs | 正式bundle禁止DOM、Node、网络依赖及开发入口。 |
| PATCH.md | 47 | 发布目录 [原文第1466行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1466>) | 已核对 | dist-wechat；release/genki-ramen-shop-1.2.0.zip | 独立微信运行目录与可解压运行包。 |
| PATCH.md | 48 | 最终文件树 [原文第1496行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1496>) | 已核对 | FINAL_FILE_TREE.txt | 核心目录和实际运行包清单更新，不展开node_modules。 |
| PATCH.md | 49 | 已知差异记录 [原文第1524行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1524>) | 已修订 | KNOWN_DIFFERENCES.md | 仅列无法恢复参数/原片听音和明确用户覆盖；漏项写修复记录，不拿差异掩盖。 |
| PATCH.md | 50 | 最终验收必须实际重新执行 [原文第1558行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1558>) | 已执行 | release/preflight-report.json；FINAL_ACCEPTANCE.md | 最后实际重新跑检查，再写当前证据。 |
| PATCH.md | 51 | 最终完成条件补充 [原文第1609行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1609>) | 部分可验证 | FINAL_ACCEPTANCE.md | 自动可验证项按证据列PASS；真机与后台保留NOT VERIFIABLE。 |
| PATCH.md | 52 | 你的执行方式 [原文第1685行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1685>) | 已执行 | PATCH_GAP_ANALYSIS.md；comparison/requirements-review.md | 重新按文档建立具体漏项，完成代码和素材修正后复查。 |
| PATCH.md | 53 | 关于平台审核、备案和发布 [原文第1729行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1729>) | NOT VERIFIABLE | RELEASE_CHECKLIST.md | 平台主体/备案/审核/正式发布未执行；不阻塞本地游戏实现。 |
| PATCH.md | 54 | 最终汇报格式更新 [原文第1757行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1757>) | 已核对 | FINAL_ACCEPTANCE.md | 最终列版本、检查、微信和设备边界及明确差异。 |
| PATCH.md | 55 | 现在继续执行 [原文第1781行](<D:/codex/mini game/美少女煮鸡蛋面/开发文档/PATCH.md:1781>) | 已执行 | comparison/requirements-review.md | 在现有项目补齐，不重建另一款游戏。 |
