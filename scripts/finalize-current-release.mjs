import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=async name=>JSON.parse(await readFile(name,'utf8'));
const pkg=await read('package.json'),version=pkg.version;
const resources=await read('release/resource-report.json'),preflight=await read('release/preflight-report.json');
const background=await read('previews/background-revision/check.json'),portions=await read('previews/portions/check.json');
const round=await read('previews/phase4/browser-check.json'),experience=await read('previews/final/experience-check.json');
const drag=await read('previews/drag-revision/verification.json'),wechat=await read('release/wechat-background-check.json');
for(const r of [preflight,background,portions,round,experience,drag])if(r.status!=='PASS')throw Error('尚有验收未通过');
for(const r of [resources,preflight,background,portions,wechat])if(r.version!==version)throw Error('当前版本证据不一致');
const consoleText=await readFile('release/preflight-console.txt','utf8');
const count=Number(consoleText.match(/tests\s+(\d+)/)?.[1]);
if(!count||!consoleText.includes('发布前检查PASS'))throw Error('缺少本轮预检实际输出');
const archivePath=`release/genki-ramen-shop-${version}.zip`,zip=await readFile(archivePath);
const zipCheck=await read('release/zip-integrity.json');
if(zipCheck.version!==version||zipCheck.status!=='PASS')throw Error('ZIP完整性尚未验证');
const date='2026-10-07',size=(resources.totalBytes/1048576).toFixed(2);
const report={date,version,engineering:'PASS',automaticAcceptance:'PASS',typecheck:'PASS',tests:{status:'PASS',count},build:'PASS',preflight:preflight.status,
  resources,background,portions,round,experience,drag,archive:{path:archivePath,bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex'),zipIntegrity:'PASS'},
  visualReview:{status:'已复查本轮关键截图',scope:'开场外围、单件材料、敲蛋、熟成和出餐；不是逐像素还原或真机验收',screenshots:'previews/background-revision/'},
  wechatRefresh:wechat.refresh,wechatMenuScreenshot:'previews/background-revision/wechat-menu.png',
  wechatCookingEvidence:{version:'1.3.0',path:'previews/desktop/live/record.json',scope:'历史实际微信投料和出餐；本轮料理逻辑未改，未冒充1.4.0完整微信回归'},
  ios:'NOT VERIFIABLE',android:'NOT VERIFIABLE',phoneAudioAndPerformance:'NOT VERIFIABLE',platformReviewAndPublication:'未执行正式上传、审核或发布'};
await writeFile('release/final-report.json',JSON.stringify(report,null,2)+'\n');
const docs={
'README.md':`# 美少女煮拉面

版本${version}，${date}。四锅拖动烹饪小游戏，TypeScript + 微信原生 Canvas 2D。最新修订解决菜单和厨房外围双层背景造成的抽屉重复、台面错位；背景统一使用游戏与安全区坐标，超出素材范围的区域延展边缘。此前单件鸡蛋、调料包、独立材料尺寸、蛋壳与蛋液分离及锅沿遮挡已保留。

## 玩法

材料、水壶拖至锅口松手；面和调料可预放，水开后放葱蛋。熟成后把锅拖至托盘，标准一碗10000金币，目标100000，回合93秒。早放、缺料、重复和过熟影响售价。烧焦锅拖至托盘清理，最多消耗三口备用锅。菜单、教程及设置按钮点击。

沸腾2.4秒；沸腾后熟成3.4秒、过熟5.6秒、烧焦8.2秒；最佳窗口2.2秒。倒水总1.15秒，其中水流0.72秒。评分和火候为集中校准值，并非声称从参考视频精确恢复。

## 开发与构建

安装Node.js后执行：

\`\`\`powershell
npm ci
npm run typecheck
npm test
npm run build
npm run preflight
npm run package
npm run preview
\`\`\`

本轮${count}项测试、类型检查、资源/图像检查、构建与preflight通过。发布包${resources.files.length}文件、${resources.imageCount}张图片、${resources.audioCount}项原创音频，约${size} MiB。源资源48项保留；参考视频、分析帧、源图集、测试、浏览器适配器、QA及开发统计不进入发布包。

## 微信导入

导入dist-wechat，类型选择“小游戏”，或解压${archivePath}后导入。用户AppID已集中配置在根project.config.json，更换后重新构建。当前版本已刷新微信工具并查看实际菜单截图。历史1.3.0实际投料和出餐记录位于previews/desktop/live；本轮不把它冒充全流程微信回归。

## 预览与验收

预览地址为http://127.0.0.1:4173，使用正式微信bundle及开发适配器。

\`\`\`powershell
node scripts/verify-background.mjs
node scripts/verify-preview.mjs
node scripts/verify-portions.mjs
node scripts/verify-drag.mjs
node scripts/verify-gameplay.mjs
node scripts/verify-experience.mjs
node scripts/capture-final.mjs
\`\`\`

背景检查覆盖5种尺寸/DPR及安全区、10组菜单/厨房渲染；缓存和降级路径逐像素比较，允许少量GPU颜色舍入。正常拖动自然93秒回合重新通过，三碗30000、烧焦替补、前后台、局末与重开正常。截图期间可暂停以固定视觉状态，不能用截图采集代替真实局长测试。高DPR截图按CSS尺寸导出，实际Canvas仍检查四百万像素预算。

历史13个参考关键帧与100条需求对照见comparison/review.html及REQUIREMENT_TRACEABILITY.md，本轮修订见comparison/background-review.md。音频为原创12项MP3，解码及音频失败容错通过。DEV=false，设置和最好成绩保存在本机；没有账号、广告或付费入口。

## 发布状态

技术发布包已准备，当前验收见FINAL_ACCEPTANCE.md。iOS/Android真实触控、静音、听感、连玩和性能未验证；后台主体资料及正式上传、审核和发布未执行，见WECHAT_ACCEPTANCE.md及RELEASE_CHECKLIST.md。Git尚无提交，ZIP保留交付快照。
`,
'FINAL_ACCEPTANCE.md':`# 当前验收

版本${version}，${date}。本轮修复外围背景重复和错位，并复查最新单件材料、敲蛋和出餐画面。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 类型检查、${count}项单元/集成/回归 | PASS | release/preflight-console.txt |
| 源资源路径、48项图片解码 | PASS | release/preflight-report.json |
| 构建、正式API/网络/秘密/DEV/版本/资源扫描 | PASS | release/preflight-report.json |
| ZIP与当前运行目录一致、CRC完整性 | PASS | release/zip-integrity.json |
| 自然93秒正常拖动、三碗30000、烧焦替补、前后台和重开 | PASS | previews/phase4/browser-check.json |
| 单碗拖动10000、错误落点和后台取消 | PASS | previews/drag-revision/verification.json |
| 四种材料单件拿起及尺寸 | PASS | previews/portions/check.json |
| 教程、设置、存档、暂停、12项音频解码及失败容错 | PASS | previews/final/experience-check.json |
| 外围背景、安全区、缓存/降级一致性 | PASS | previews/background-revision/check.json；comparison/background-review.md |
| 17个料理关键状态、5种尺寸/DPR截图 | CAPTURED，关键图已查看 | comparison/visual-review.json |
| 微信本轮刷新与菜单实际窗口复查 | PASS（该范围） | release/wechat-background-check.json；previews/background-revision/wechat-menu.png |
| 微信材料投放与出餐 | 历史1.3.0证据 | previews/desktop/live/record.json；不冒充本轮完整回归 |
| iOS/Android、手机听感与性能 | NOT VERIFIABLE | 尚无连接的真实设备 |
| 后台主体、上传、审核与发布 | 未执行 | RELEASE_CHECKLIST.md |

发布目录dist-wechat，ZIP ${archivePath}，${resources.files.length}文件，${size} MiB。原两份需求保持原文，最新用户确认优先。完整评分/精确阈值的参考证据边界见KNOWN_DIFFERENCES.md。技术及当前自动检查通过，不表示手机和平台审核已通过。
`,
'WECHAT_ACCEPTANCE.md':`# 微信与真机验收

版本${version}，${date}。运行目录dist-wechat，${size} MiB，横屏，AppID按用户授权配置。本轮工具刷新成功，实际Windows窗口菜单截图已复查，外围重复柜台已消除。

历史自动截图接口超时是旧记录。后来1.3.0已用实际窗口截图和标准画布触摸完成材料拿起、投料、倒水、出餐，证据previews/desktop/live/record.json；本轮新增菜单复查证据previews/background-revision/wechat-menu.png。这些局部证据不能替代全部微信行为或手机实测。

| 范围 | 状态 |
| --- | --- |
| 配置、入口、横屏、类型、资源及正式包检查 | PASS |
| 本轮微信刷新、菜单外围视觉 | PASS |
| 1.3.0实际微信材料与出餐 | 已操作/截图，历史范围 |
| 本轮完整浏览器料理、设置、存档、93秒及重开 | PASS，同bundle开发适配器 |
| 完整原生微信生命周期及音频实测 | NOT VERIFIABLE |
| iOS真机 | NOT VERIFIABLE |
| Android真机 | NOT VERIFIABLE |

设备矩阵：iPhone与Android各至少一台，再覆盖低性能Android、高DPR及长屏设备。记录设备/系统/微信/基础库版本、日期及结果。逐项测试启动加载、横屏安全区、四种材料拖动和锅口遮挡、水流/水位、四锅并行、敲蛋、熟成、烧焦替补和空炉位、托盘评价/金币、93秒、胜负与重开、暂停和设置、存档、前后台、静音及连续十局FPS/内存/温度。

历史二维码不代表当前版本。在微信工具点击“预览”生成当前包二维码；本轮没有正式upload或提交审核。当前后台规则与物料要求在提交时核对，不在本文写死平台限制。
`,
'RELEASE_CHECKLIST.md':`# 发布准备清单

版本${version}，${date}。

- [x] 类型检查、${count}项测试、构建、资源检查、preflight通过。
- [x] ${archivePath}完整性通过，逐文件与dist-wechat一致。
- [x] 正式${resources.imageCount}图、${resources.audioCount}音频、${resources.files.length}文件，${size} MiB。
- [x] 正式包无参考视频、分析帧、原图集、浏览器适配器、QA/开发统计、网络依赖或秘密。
- [x] 四锅流程、自然93秒、重开、前后台、音频解码和失败容错通过本轮浏览器检查。
- [x] 外围背景、安全区、多比例和DPR复查；本轮微信菜单截图确认。
- [x] 当前README、验收及最终报告同步；历史文件保留版本与证据范围。
- [ ] iPhone/Android触控、听感、静音、安全区、前后台、连续游玩和性能实测。
- [ ] 有权限者核对微信后台主体、当时备案/审核要求、资源和物料尺寸。
- [ ] 正式上传、审核和发布。

工具刷新及开发预览不等于正式发布。Git当前无提交，交付ZIP作为现有文件快照保留；是否建立Git提交由后续版本管理任务处理。
`,
'开发文档/当前进度整理.md':`# 当前进度

${date}，版本${version}。七阶段工程及当前自动验收已完成，真机与后台发布未完成。

已实现四锅拖动、连续倒水/水位、细面/葱花/辣汤、单件材料、整蛋敲壳与蛋液分离、烧焦替补、出餐评价、金币、93秒、教程、设置/暂停/存档、胜负/重开、12项原创音频。

本轮消除菜单及厨房外围重复背景：同一安全区坐标绘制一次背景，只延展外围像素。微信菜单已实际截图复查；5种屏幕/DPR、10组菜单/厨房背景检查通过。${count}项测试、preflight、完整自然93秒三碗30000、单碗10000、体验/音频、份量及ZIP检查通过。运行${resources.imageCount}图、${resources.audioCount}音频、${resources.files.length}文件，${size} MiB。

运行目录dist-wechat；包${archivePath}。最终报告release/final-report.json，验收FINAL_ACCEPTANCE.md，本轮对照comparison/background-review.md。1.3.0微信料理截图是历史实际操作，本轮新增的是菜单检查，不把它冒充完整原生微信回归。手机触控/音频/性能及正式后台上传、审核、发布仍未验证。
`};
for(const [name,text] of Object.entries(docs))await writeFile(name,text);
await copyFile('previews/background-revision/menu-844x390-dpr1.png','release/materials/final-menu.png');
await copyFile('previews/final/ready.png','release/materials/final-game.png');
console.log(`已同步${version}最终报告及${Object.keys(docs).length}份当前文档。`);
