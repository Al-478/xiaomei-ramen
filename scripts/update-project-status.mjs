import{readFile,writeFile}from'node:fs/promises';
let phases=await readFile('DEVELOPMENT_PHASES.md','utf8');
phases=phases.replace(/整理日期：[^\n]+/,'整理日期：2026-10-06，更新日期：2026-10-07。版本1.0.0，阶段一至七工程与自动验收完成。微信预览生成成功；完整手机操作、听感、性能与后台发布未实测，明确NOT VERIFIABLE。');
phases=phases.replace('| 阶段五 | 未开始 |','| 阶段五 | 已完成教程、动作/金币/角色动画、原创音频、独立开关、暂停和版本化存档 |')
  .replace('| 阶段六 | 未开始 |','| 阶段六 | 39项回归、完整十局、17张画面对照及多比例/像素预算检查通过；真机未实测 |')
  .replace('| 阶段七 | 未开始 |','| 阶段七 | preflight、可复现安装、独立ZIP/哈希/物料/验收文档完成；后台人工事项保留 |');
phases=phases.replace(/下一阶段为阶段五[^\n]+/,'所有计划阶段的工程与自动交付已完成。最终证据见FINAL_ACCEPTANCE.md，人工事项见WECHAT_ACCEPTANCE.md与RELEASE_CHECKLIST.md。');
await writeFile('DEVELOPMENT_PHASES.md',phases);
const statuses={1:'视觉分析与需求归并完成；原片听音输入不可验证',2:'原创/授权素材及最新修订完成，许可证与来源记录齐全',3:'工程、加载、输入和适配通过自动检查',4:'核心玩法已实现与验证，未知精确参数作为校准值记录',5:'教程/流程/动画/原创音频/存档已实现与验证，手机听感未实测',6:'回归、十局、多比例和关键画面通过；真机结果NOT VERIFIABLE',7:'发布前总检查、ZIP和文档通过；平台后台人工事项NOT VERIFIABLE'};
const trace=await readFile('REQUIREMENT_TRACEABILITY.md','utf8');
await writeFile('REQUIREMENT_TRACEABILITY.md',trace.split('\n').map(line=>{
  const parts=line.split('|').map(x=>x.trim());if(parts.length===7&&['121212.md','PATCH.md'].includes(parts[1])&&statuses[parts[4]]){
    parts[5]=statuses[parts[4]];return '| '+parts.slice(1,-1).join(' | ')+' |';}return line;
}).join('\n'));
await writeFile('开发文档/当前进度整理.md',`# 当前进度\n\n日期2026-10-07，版本1.0.0。已完成七个计划阶段的工程和自动可验证交付；不是已经通过真机和后台审核的声明。\n\n已具备：四锅烹饪/评分、完整教程/结果/重开、宽屏与安全区、原创音频、倒水/敲蛋/投料/金币动画、音乐与音效独立设置、版本化存档、前后台/手动暂停、角色成功捧面和失败洗锅。\n\n39项测试、类型、构建、资源/图像检查和preflight通过，完整十局数量稳定，真实93秒回合与音频解码验证通过。正式源图片43项，运行图片35项，音频12项，运行包约3.02 MiB。已生成微信平台预览及独立ZIP。\n\n源目录为当前项目，运行目录dist-wechat，ZIP release/genki-ramen-shop-1.0.0.zip，最终报告FINAL_ACCEPTANCE.md。用户最后确认优先：小美、金币售价、四锅对齐独立黑色炉架、备用锅放柜格、全宽厨房、放大空托盘、点击抬锅、敲生蛋和持久辣汤。\n\n待人工：iOS/Android真实操作、音频听感/静音/性能、后台当时规则与审核/发布。工具自动截图接口超时，不伪造通过。精确评分/阈值等录像未唯一确定事项见KNOWN_DIFFERENCES.md。\n\n原对话已完整解析并留档于开发文档/按需求文档完成项目_对话文字记录.md，原两份需求文档保持不修改；100节对应表已更新。\n`);
await writeFile('PATCH_GAP_ANALYSIS.md',`# 最终需求差距与验证边界\n\n版本1.0.0，2026-10-07。100节需求对应表见REQUIREMENT_TRACEABILITY.md；原两份需求保持原文。\n\n| 要求组 | 当前状态 | 剩余事项 |\n| --- | --- | --- |\n| 需求/视频/布局与素材 | 视觉分析、43项素材、许可证、提示词/原创音频乐谱已完成 | 原片完整听音输入不可用，不能宣称已听音 |\n| 严格工程/加载/输入/安全区/宽屏 | 自动检查通过，资源按需加载与失败恢复 | 真机屏幕与触摸实测 |\n| 四锅/配方/评分/备用锅/出餐/倒计时 | 实现并通过单元与真实回合测试 | 录像不确定参数已记录，非精确恢复原公式 |\n| 教程/结果/重开/动画/原创音频 | 完成，音频解码与播放验证通过 | 手机听感与系统静音实测 |\n| 暂停/存档/版本/失败容错 | 完成，损坏恢复、暂停原因和释放测试通过 | 真机前后台实测 |\n| 十局/低FPS/数量稳定/关键画面 | 39项测试、17张画面对照与5种尺寸基线 | 手机FPS、内存、温度 |\n| 资源/禁止API/联网/秘密/DEV/发布目录 | preflight通过，独立ZIP、哈希、明细、物料与文件树齐全 | 平台当时后台规则及审核发布 |\n| 微信开发者工具 | 项目打开/刷新/预览生成成功 | 自动截图超时；不能把预览生成等同于真机通过 |\n\n上述工程及自动项完成，人工和能力边界保持NOT VERIFIABLE。\n`);
let differences=await readFile('KNOWN_DIFFERENCES.md','utf8');
differences=differences.replace('版本0.4.0','版本1.0.0').replace('正式音频、教程和动作动画尚未进入阶段五，属于未完成工作，不作为不可恢复差异。','教程、完整动作动画与原创音频已完成。参考听音不可验证，项目原创BGM按需求文档设计为112 BPM，不宣称恢复原曲。成功结算没有原片证据，采用原创捧面庆祝；失败采用洗锅与蓝色氛围，保留参考的表达方向。');
await writeFile('KNOWN_DIFFERENCES.md',differences);
let tests=await readFile('TEST_PLAN.md','utf8');tests=tests.replace('版本0.4.0。阶段四已通过30项自动测试：工程13项，核心玩法与触摸集成17项。','版本1.0.0。39项工程/玩法/体验/回归测试通过，含十局完整获胜与重开。后续计划列表已在阶段五至七执行：音频池与存档、教程暂停、画面对照、preflight和发布包审计；真机人工项仍未执行。');
tests=tests.replace('## 后续阶段待覆盖','## 执行记录与人工边界');await writeFile('TEST_PLAN.md',tests);
await writeFile('WECHAT_ACCEPTANCE.md',`# 微信与真机验收\n\n版本1.0.0，日期2026-10-07。当前工具Stable 2.02.2608080，实际日志基础库3.17.2，服务端口18121。项目AppID wxe6851863490a7827，横屏，不使用分包。包体见release/resource-report.json。\n\n- [x] 工具项目打开与刷新成功。\n- [x] 用户此前确认菜单、基础选择与返回操作。\n- [x] 平台预览二维码已实际生成，当前代码包被预览接口接受。\n- [x] 本地类型/39测试/构建/preflight/资源检查通过。\n- [x] 浏览器实际完整93秒回合、教程暂停存档、音频解码与失败容错通过。\n- [ ] 微信完整自动画面/触摸/音频验收：simulator_screenshot返回waitForAutomatorReady timeout；日志有WAGame.js的jsbridge not ready，未证实其与截图的因果关系。\n- [ ] iOS实际设备：启动、横屏/安全区、触摸、音频/静音、暂停、重开、连玩、FPS/内存/温度。\n- [ ] Android及较低性能/长屏设备：同上。\n- [ ] 当前后台规则、主体资料、审核与正式发布。\n\n官方网页本次抓取失败，不写死平台包体限制。接口类型采用[微信官方类型定义](https://github.com/wechat-miniprogram/minigame-api-typings)，实际预览结果为当次证据，不当作永久政策。浏览器指标不能替代手机性能。\n\n人工复核时记录设备型号、系统/微信/基础库/工具版本、日期和结果，未执行保持NOT VERIFIABLE。预览码位于release/materials/，失效后在工具重新生成；本次没有正式上传体验版或提交审核。\n`);
let licenses=await readFile('ASSET_LICENSES.md','utf8');licenses+=`\n## 最终角色与原创音频\n\n新增chef-win与chef-lose源图art_sources/chef-win.png、chef-lose.png，提示词result-prompts.json；内置图片工具基于本项目已授权角色制作，Original project asset。正式角色PNG位于assets/images/character。\n\nBGM与11项音效由项目原创乐谱和算法合成，源代码scripts/create-audio.mjs，乐谱art_sources/audio-score.json，原始WAV只作开发资料，正式assets/audio/*.mp3均Original project asset，无录屏原音轨、外部采样或署名要求。工具FFmpeg仅开发期编码，不随小游戏分发。全部12项列表见assets/audio-manifest.json。\n`;
await writeFile('ASSET_LICENSES.md',licenses);
console.log('已同步七阶段进度、100节对应表与最终边界。');
