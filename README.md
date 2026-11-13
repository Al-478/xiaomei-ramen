# 小美煮拉面

## 网页版与 Vercel 部署

网页版复用现有 H5 入口和游戏逻辑，无需账号登录。使用 Node.js 24 和 npm：

```powershell
npm ci
npm run build:taptap
npx --yes serve dist-taptap-h5
```

构建产物为 `dist-taptap-h5`，包含网页入口、游戏脚本、图片与音效，不需要环境变量或后端服务。图片、音效使用项目内相对路径，中文使用系统字体。手机建议横屏游玩。

Vercel 配置见 `vercel.json`：框架为 Other，根目录为仓库根目录，安装命令 `npm ci`，构建命令 `npm run build:taptap`，输出目录 `dist-taptap-h5`。Git 原生集成使用 `main` 作为生产分支；推送其他分支或创建 PR 时生成预览部署。构建失败时现有成功版本继续提供访问。

源码仓库不包含依赖、构建缓存、环境变量、历史发布包、后台记录或验收截图；这些本地文件保留。现有微信与 TapTap 小游戏构建入口继续可用。

2026-11-11 新增独立的 TapTap H5 小游戏构建：`npm run build:taptap`，输出 `dist-taptap-h5` 与 `release/taptap/xiaomei-ramen-taptap-h5-1.4.4.zip`。`npm run verify:taptap` 从 ZIP 实测完整玩法。上传类型为 H5 包体，平台解析、真机自测及审核仍需完成，详见 release/taptap/H5使用说明.md。微信原入口和发布包保留。

1.4.4 修复烧焦锅：保留金色锅身与把手，仅在锅内壁和食物中添加焦化；移除烧焦食物表面的额外黄色描边，烟雾从食物上方升起。51 项测试、6 组金属区域像素验证与自然 93 秒玩法回归通过，截图见 previews/layout-audit/burnt-*.png。新版真机外观仍需扫码复查。

当前交付版本 **1.4.4**，2026-10-09 更新。名称统一为“小美煮拉面”，同步启动文字、菜单及厨房标题图片。微信原生 Canvas 2D 横屏小游戏，四锅拖动烹饪。

## 当前状态

- 最新运行目录：dist-wechat。
- 最新交付包：release/genki-ramen-shop-1.4.4.zip，45 个文件，实际大小和校验见 release/resource-report.json 与 release/zip-integrity.json。
- 51 项测试、14 组背景检查和完整 93 秒浏览器玩法回归通过。
- Android 用户报告基础操作和声音正常，1.4.2 菜单及厨房两条竖向黑线复查确认消失。
- 微信后台名称已显示“小美煮拉面”，类目为“游戏 > 休闲游戏”。当前上传结果见 release/upload-1.4.4.json。备案、提审及正式发布尚未完成。
- iOS 与长期性能测量未验证。模拟器自动化求值多次超时，桌面前台验证失败，未宣称完整原生模拟器回归通过。

详细证据见 FINAL_ACCEPTANCE.md、WECHAT_ACCEPTANCE.md、RELEASE_CHECKLIST.md。

## 玩法

按住水壶拖到锅附近松手加水；面和辣椒粉可以提前放，水开后放葱和蛋。熟成后把锅拖到托盘上菜。标准一碗 10000 金币，目标 100000，回合 93 秒。早放、缺料、重复和过熟影响售价。烧焦的锅拖到托盘清理，备用锅共三口。

菜单、教程、暂停和设置按钮点击操作。声音开关和最好成绩保存在本机，没有账号登录、广告或付费入口。

## 微信导入与预览

微信开发者工具导入 dist-wechat，类型选择「小游戏」。AppID 已配置为 wxe6851863490a7827；修改根 project.config.json 后重新构建。

当前官方预览二维码为 release/materials/wechat-preview-1.4.4.png。二维码过期后，在工具点击「预览」重新生成。旧 ZIP 和旧二维码是历史记录。

## 开发、构建与打包

安装 Node.js 后，在项目目录执行：

```powershell
npm ci
npm run preflight
npm run package
python scripts/verify-package.py
npm run preview
```

浏览器开发预览地址：http://127.0.0.1:4173。它使用正式微信运行包和开发适配器；适配器不进入发布包。

## 验证与证据

```powershell
node scripts/verify-gameplay.mjs
node scripts/verify-background.mjs
node scripts/verify-stock-alignment.mjs
node scripts/verify-drag.mjs
node scripts/verify-experience.mjs
node scripts/verify-layout.mjs
```

自然 93 秒玩法回归覆盖三碗 30000、烧焦换锅、前后台、结算与重开。背景检查覆盖非整数接缝和 DPR，缓存与降级路径一致。布局截图用于检查摆放与遮挡，不能代替自然计时测试。

素材来源见 ASSET_LICENSES.md。参考视频、分析帧、源图集、测试与开发工具不进入运行包。后台候选物料说明见 release/materials/README.md。

2026-11-12 新增 TapTap 普通小游戏独立适配候选包 1.4.5：npm run build:taptap-minigame 与 npm run verify:taptap-minigame。使用 tap API，ZIP根目录直接包含game.js、game.json、project.config.json及assets。类型检查、51项单元测试和发布ZIP模拟环境完整93秒玩法回归通过；未验证平台解析、应用类型权限与真机运行，详见 release/taptap-minigame/使用说明.md。
