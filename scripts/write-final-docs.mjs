import {readFile,writeFile,mkdir} from 'node:fs/promises';
const report=JSON.parse(await readFile('release/resource-report.json','utf8'));
const size=(report.totalBytes/1048576).toFixed(2);
const docs={
'README.md':`# 美少女煮拉面

版本1.0.0，更新日期2026-10-07。阶段一至七的工程、素材、完整流程、自动回归和发布准备已完成。微信预览包已实际生成；iOS/Android操作、听感、性能及后台提交仍需实测，状态见FINAL_ACCEPTANCE.md。

玩法：同时照看四口锅，选水壶或食材再点锅；面和辣椒粉可提前放，水开后放葱和鸡蛋。出现“煮好啦”后选锅，再点托盘。正确单碗10000金币，目标100000；错误时机、缺料、重复投料和过熟影响售价。烧焦锅需通过托盘清理，消耗三个备用锅，用完后炉位不可用。初始局长93秒。

已实现：宽屏延展厨房、首次三页教程、倒水/投料/敲蛋/熟成/烟雾/上菜/金币动画、原创音乐和音效、暂停、音乐与音效独立开关、版本化设置与最好成绩、成功/失败结算与重开。角色名称为小美，售价使用金币图标。

## 开发与构建

需要Node.js及npm，工具依赖固定在package.json与锁文件。

\`\`\`powershell
npm ci
npm run typecheck
npm run test
npm run build
npm run preflight
npm run package
\`\`\`

typecheck、39项测试、构建和preflight已实际通过。preflight检查图片解码/透明边距、资源引用与大小写、禁止API、联网依赖、秘密信息、DEV标志、版本、无用发布资源与包体报告。任一关键检查失败会返回非零退出码。

源工程位于当前目录；微信运行目录为dist-wechat/；独立ZIP为release/genki-ramen-shop-1.0.0.zip。运行包包含${report.imageCount}项必要图片、${report.audioCount}项MP3与入口配置，总计约${size} MiB。参考视频、原始图集、分析帧、测试、浏览器适配器和本机私有配置均不进入ZIP。资源明细与SHA256见release/resource-report.json和preflight-report.json。

## 微信开发者工具导入

导入dist-wechat/，或解压ZIP后选择包含game.js和project.config.json的目录，项目类型为小游戏。AppID已配置wxe6851863490a7827，无需替换；修改时只编辑源工程project.config.json并重新构建，不需要AppSecret。当前工具Stable 2.02.2608080，日志观察到基础库3.17.2。已有微信预览码位于release/materials/，失效后通过开发者工具重新生成。

命令行项目打开、刷新和预览生成已成功；模拟器自动截图接口仍有waitForAutomatorReady超时，不能据此宣称完整微信交互或真机通过。请按WECHAT_ACCEPTANCE.md核对实际设备。

## 预览与验证

\`\`\`powershell
npm run preview
node scripts/verify-preview.mjs
npm run verify-experience
npm run verify-gameplay
\`\`\`

预览默认http://127.0.0.1:4173，运行同一微信bundle。浏览器适配器只用于开发，不进入微信包。verify-gameplay采用正常点击和真实93秒回合，需约两分钟；verify-experience验证教程、暂停、存档、音频解码与失败容错。浏览器不能代替真机测试。

开发性能测量入口只存在于scripts/benchmark-entry.mjs，正式运行包无此入口。指标只统计GameLoop自身帧回调，排除测试轮询和截图开销；本机Headless Chrome循环频率可能高于屏幕刷新率，不能外推手机FPS。

重新制作美术可运行npm run export --prefix scripts/art，普通构建使用已保存素材。重新制作原创音频可运行npm run create-audio，需开发机安装FFmpeg/FFprobe；正式游戏不依赖它们。音频源码与乐谱位于art_sources/audio和audio-score.json。

## 验收与已知差异

TEST_PLAN.md、FINAL_ACCEPTANCE.md、KNOWN_DIFFERENCES.md记录证据及边界。烹饪阈值、完整评分公式、补水上限和未拍到的成功边界采用集中配置的校准值，不宣称已从原片精确恢复。原片听音输入不可用，原创BGM按需求文档设计，实际手机听感待确认。

## 后台简介候选

和小美一起照看四口汤锅，掌握加水、煮面和添加配料的时机，在时间结束前完成更多美味拉面！

主体资料、后台声明、当时要求的备案与审核、正式上传发布由有权限的开发者完成，详见RELEASE_CHECKLIST.md。本次未执行正式发布。
`,
'RELEASE_CHECKLIST.md':`# 发布准备清单

版本1.0.0，日期2026-10-07。技术发布准备已完成；本文件不承诺平台审核一定通过。

- [x] typecheck、39项自动测试、build、preflight实际通过。
- [x] 独立dist-wechat与ZIP、资源明细、SHA256和最终文件树已生成。
- [x] 正式包无参考视频、分析资料、生成源图、浏览器代码、测试入口、外部网络依赖或AppSecret。
- [x] AppID集中配置，横屏，菜单资源按需加载，图片失败可有限重试。
- [x] 43项正式源图片与12项原创MP3已有来源、提示词/乐谱及授权记录。
- [x] 图标、Logo、加载图、横版宣传候选图位于release/materials与正式资源目录。
- [x] 微信开发者工具打开/刷新与预览包生成有实际结果。
- [ ] 在实际iPhone与Android核对触摸、音频、静音、长宽比、安全区、连玩、前后台和温度/内存。
- [ ] 在当前微信公众平台核对包体/基础库/后台配置与提交物料尺寸。官方网页本次无法抓取，不把搜索摘要当成最新平台规则；预览成功也不等于正式审核通过。
- [ ] 由有权限者完成主体与后台资料、平台当时要求的备案/审核及正式上传发布。

代码只使用本地设置与最好成绩，没有登录、广告、付费、分享门槛或个人信息采集接口；核心资源本地包含。最终物料尺寸按提交时后台要求导出，候选尺寸不当作平台永久标准。
`,
'FINAL_ACCEPTANCE.md':`# 最终验收

版本1.0.0，日期2026-10-07。结论：工程及可自动验证的阶段一至七交付完成。人工真机、听感和后台事项保持NOT VERIFIABLE，不能把本结论理解为已经正式发布。

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 可复现npm ci | PASS | 根级依赖与锁文件，实际重新安装后构建检查 |
| strict类型检查 | PASS | npm run typecheck / preflight |
| 单元、集成、回归 | PASS | 39项测试，含十局完整获胜及重开 |
| 正式构建和发布前总检查 | PASS | release/preflight-report.json |
| 全部正式图片解码、尺寸、透明边距 | PASS | art_sources/asset-check-report.json，43项 |
| 原创音频格式与解码 | PASS | FFprobe和浏览器实际解码12项；无数字削波和静音文件 |
| 三页教程、暂停、设置与存档 | PASS | previews/final/experience-check.json |
| 音频失败不阻塞、池上限与释放 | PASS | 实际音频请求失败检查与单元测试；最多8个实例 |
| 四锅、评分、目标、备用锅、出餐锁 | PASS | 核心测试与真实完整93秒回合 |
| 回合重开、前后台与局末误触 | PASS | 十局测试、实际回合与后台模拟 |
| 低帧率确定性计时 | PASS | 60/30/20/10 FPS测试 |
| 多比例/DPR、静态缓存和像素预算 | PASS | viewport测试及5种尺寸测量；每画布最多四百万像素 |
| 关键画面对照 | PASS | comparison/visual-review.json、17个真实画面与contact sheet |
| 成功/失败角色与动画 | PASS | 新原创捧面/洗锅素材，成功开发QA截图与真实失败回合截图 |
| 发布包无垃圾、无用资源、禁止API、联网、秘密与DEV入口 | PASS | preflight扫描和哈希；ZIP排除私有配置 |
| 微信项目打开/刷新及预览生成 | PASS | 本机CLI/技能实际返回成功，平台接受当前预览包 |
| 微信完整自动操作 | NOT VERIFIABLE | 模拟器自动化截图等待超时，不能声称操作通过 |
| iOS真机 | NOT VERIFIABLE | 未连接实际设备 |
| Android真机 | NOT VERIFIABLE | 未连接实际设备 |
| 手机音频听感、静音与性能 | NOT VERIFIABLE | 浏览器播放/解码不等于手机听感和性能 |
| 原视频完整听音确认 | NOT VERIFIABLE | 参考音轨已提取，但当前模型不支持音频输入；未虚构原曲BPM或触发点 |
| 后台最新规则、主体资料、审核与正式发布 | NOT VERIFIABLE | 官方网页未成功抓取，后台需有权限者核对和提交 |

运行目录dist-wechat/，ZIP release/genki-ramen-shop-1.0.0.zip。原两份需求文档保留，100节对应表见REQUIREMENT_TRACEABILITY.md。无法精确恢复的评分/阈值已明确记录于KNOWN_DIFFERENCES.md，未写成录像证实的事实。
`,
'reference_analysis/notes/PHASE_FIVE_ACCEPTANCE.md':`# 阶段五验收

版本1.0.0。加载→菜单→首次教程→烹饪→成功/失败结果→重开/菜单已接通。首次教程可快速开始且不穿透下层；三页规则明确。

倒水、材料移动、裂壳/蛋液落下、凝固荷包蛋、气泡、蒸汽、熟成、烟雾、上菜移动、金币和结算角色均由有限对象与游戏时间驱动。失败洗锅，成功捧面庆祝。当前动态图层和公开用户按钮均有实际状态，不使用固定金额或预置熟成提示。

原创BGM为112 BPM项目乐谱，另有11项动作音效。MP3格式及浏览器解码/播放验证通过；最多1条BGM、1条沸腾环境音与6个音效。音乐/音效独立开关，多个暂停原因分别解除，不在重开时创建新BGM。失败音频句柄释放，不无限重试或阻塞玩法。

存档version=1，验证类型/数值，迁移旧格式并修复损坏数据。读写失败只影响持久保存，游戏仍运行。保存教程完成、音乐、音效和最好成绩，不保存账号或个人资料。

证据：39项测试、previews/final/experience-check.json、完整93秒回合记录及成功/失败实际画面。原片听音和真机听感不能验证，已明确保留边界。
`,
'reference_analysis/notes/PHASE_SIX_ACCEPTANCE.md':`# 阶段六验收

版本1.0.0。工程、玩法、体验与回归39项测试通过；覆盖重复出餐、缺料、重复投料、补水、过熟、烧焦、截止边界、多指/cancel、重复监听、低帧率、存档损坏与音频失败。

连续十局完整获胜并重开：4个锅、1个场景、1个帧请求、7个监听、8个音频实例保持稳定，旧动作与金币粒子释放，资源不重复解码。动作按锅/种类去重，最多20项动作及12枚金币；结算装饰固定数量。没有无限计时器或数组增长。

17个实际关键状态截图已保存到comparison/recreated，配对说明和参考帧关系见visual-review.json。成功截图使用仅开发测量入口驱动同一规则，失败截图来自正常点击与真实93秒回合，不把成功开发截图称为手机录像。

多比例与DPR已检查，背景全宽延展，核心对象等比，安全区与输入映射一致。DPR最多2，四百万像素预算，静态背景使用单个缓存画布；缓存不可用可回退。5种尺寸指标见release/browser-performance.json，仅统计GameLoop自身帧回调，Headless Chrome无屏幕同步，不能外推真机FPS。

微信自动截图仍出现waitForAutomatorReady超时；平台预览已生成。真机触摸、听感、温度/内存和实际帧率保持NOT VERIFIABLE，不伪造通过。
`,
'reference_analysis/notes/PHASE_SEVEN_ACCEPTANCE.md':`# 阶段七验收

版本1.0.0。npm ci后实际通过typecheck、39项测试、资源检查、图片解码、build与preflight。生成独立运行目录、资源大小/最大文件报告、逐文件SHA256、ZIP及最终文件树。ZIP只包含通过检查的运行文件，私有IDE配置、分析媒体与源码工具不进入ZIP。

正式包无缺失或无用运行资源、DOM/浏览器存储、Node运行依赖、远程图片/字体/音频、网络接口、AppSecret、旧品牌或开发作弊入口。版本/AppID/横屏集中配置，正式DEV=false。

微信当前预览包已经由平台实际接受，但这只证明当次预览，不把包体限制当作永久常量。官方网页抓取失败；当前后台规则与发布物料尺寸需在提交时核对。账号主体、平台审核/备案、实际真机等由有权限者完成，明确NOT VERIFIABLE。
`,
'comparison/README.md':`# 画面对照说明

visual-review.json收录17个实际画面；reference字段对应原视频关键帧。检查布局、锅数量与层级、食材区、水壶/托盘、计时金额、投料/熟成/烧焦/出餐和结算，目标是结构与体验对照，不是复制原品牌素材或逐像素匹配。

新增result-win.png为开发QA入口驱动真实规则后的成功结算，result-lose.png来自正常点击93秒回合。新增立绘与音频均有来源记录。当前最终画面见previews/final/，完整接触表为final-contact-sheet.png。
`,
'reference_analysis/audio/README.md':`# 音频分析与原创制作记录

原片的10秒音轨已提取，仅作开发分析，未进入正式包。当前工具无法向模型提供音频输入，因此没有把提取和元数据读取写成“听音完成”，未宣称恢复原曲BPM或精确音效触发。

项目BGM与11项音效由scripts/create-audio.mjs原创合成，乐谱和种子为art_sources/audio-score.json。轻快铃音、低音和轻打击乐，112 BPM。FFmpeg 9.0.2执行PCM转MP3，FFprobe验证单声道44100Hz、MP3及长度；浏览器实际解码确认非静音和无数字削波。原始WAV只保留开发目录，正式MP3位于assets/audio/。

实际手机听感/系统静音/音量与原片风格对照由人工复听，标为NOT VERIFIABLE，不因此阻塞原创合法音频交付。
`,
};
for(const [file,text]of Object.entries(docs)){await mkdir(file.includes('/')?file.slice(0,file.lastIndexOf('/')):'.',{recursive:true});await writeFile(file,text);}
console.log('已更新最终交付、阶段五至七验收与发布说明。');
