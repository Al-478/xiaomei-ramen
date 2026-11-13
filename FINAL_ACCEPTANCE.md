# 当前验收

当前版本：1.4.4。更新日期：2026-10-09。启动文字及菜单/厨房标题图片改为“小美煮拉面”，后台同名已核对。1.4.2 的真机及自然计时回归保留其原有版本范围。

包含厨房布局、材料陈列、备用锅和告示牌调整、锅旁加水与锅口遮挡修复。Android 用户报告的两条竖向黑线已通过接缝取整及交叠覆盖修复；用户扫码 1.4.2 后确认菜单和厨房两处均消失。

| 项目 | 结果 | 证据与范围 |
| --- | --- | --- |
| 类型检查、51 项测试、资源与正式包扫描 | PASS | release/preflight-report.json |
| ZIP CRC、45 个文件与当前运行目录逐项一致 | PASS | release/zip-integrity.json |
| 1.4.4 烧焦锅金属外观与锅内焦化 | PASS（浏览器像素与视觉检查） | previews/layout-audit/check.json，6 组金属区域差异为 0，锅内区域实际发生变化 |
| 7 种尺寸/DPR、14 组背景检查 | PASS | previews/background-revision/check.json |
| 3 种尺寸、12 组实际食材拖动 | PASS（布局验收） | previews/stock-alignment/check.json |
| 自然 93 秒、三碗 30000、烧焦换锅、前后台和重开 | PASS | previews/phase4/browser-check.json，1.4.4 |
| 教程、设置、暂停、音频解码及失败容错 | PASS | previews/final/experience-check.json，1.4.2 |
| Android 基础操作与声音 | 用户报告正常 | 未提供手机型号；不作为性能测量结果 |
| Android 背景黑线复查 | 用户确认 PASS | 1.4.2 菜单和厨房两处均消失 |
| 微信后台名称与类目 | 已核对 | 小美煮拉面；游戏 > 休闲游戏 |
| 当前代码上传 | PASS | release/upload-1.4.4.json；官方 CLI 返回成功 |
| 本轮原生模拟器完整自动回归 | 未完成 | 自动化求值多次超时；桌面前台检查失败，停止输入 |
| iOS、低性能设备、十局长期性能 | 未验证 | 用户只有 Android，尚无 FPS、内存、温度实测 |
| 主体资料、备案、提审与正式发布 | 已登录，待继续核对与提交 | 上传成功不代表审核或发布 |

当前运行目录为 dist-wechat，当前交付 ZIP 为 release/genki-ramen-shop-1.4.4.zip。共 45 个文件，实际包体与 SHA-256 见 release/resource-report.json、release/zip-integrity.json。旧 ZIP 保留作历史快照。

浏览器验证、用户真机反馈和微信模拟器验证分别记录；不使用历史微信截图代替本轮结果。
