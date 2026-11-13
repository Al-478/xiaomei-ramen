$ErrorActionPreference='Stop'
# 复用只允许当前项目窗口的原生鼠标控制；本脚本不注入游戏状态、不改金币、不快进。
. "$PSScriptRoot/play-wechat-desktop.ps1" -Action capture -Output 'previews/desktop/after-session-begin.png'
function Check-TaskForeground {
 if([RamenDesktop]::GetAncestor([RamenDesktop]::GetForegroundWindow(),2) -ne $targetHandle){throw '前台窗口发生变化，停止鼠标操作'}
}
function Logical-Point([double]$x,[double]$y){return ,@([int](520+$x*.711),[int](152+$y*.711))}
function Capture-TaskFrame([string]$name){
 Check-TaskForeground
 $taskImagePath=Join-Path (Get-Location).Path "previews/desktop/after-$name.png"
 $virtual=[System.Windows.Forms.SystemInformation]::VirtualScreen
 $left=[Math]::Max($bounds.Left,$virtual.Left);$top=[Math]::Max($bounds.Top,$virtual.Top)
 $w=[Math]::Min($bounds.Right,$virtual.Right)-$left;$h=[Math]::Min($bounds.Bottom,$virtual.Bottom)-$top
 $captureBitmap=New-Object System.Drawing.Bitmap($w,$h);$captureGraphics=[System.Drawing.Graphics]::FromImage($captureBitmap)
 try{$captureGraphics.CopyFromScreen($left,$top,0,0,$captureBitmap.Size);$captureBitmap.Save($taskImagePath,[System.Drawing.Imaging.ImageFormat]::Png)}finally{$captureGraphics.Dispose();$captureBitmap.Dispose()}
}
function Task-Click([double]$x,[double]$y){
 Check-TaskForeground;Move-TaskMouse (Logical-Point $x $y)
 [RamenDesktop]::mouse_event(2,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 40
 [RamenDesktop]::mouse_event(4,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 140
}
function Task-Drag([double]$x1,[double]$y1,[double]$x2,[double]$y2,[string]$heldName=''){
 Check-TaskForeground;Move-TaskMouse (Logical-Point $x1 $y1);[RamenDesktop]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
 try{
  for($i=1;$i -le 10;$i++){Check-TaskForeground;Move-TaskMouse (Logical-Point ($x1+($x2-$x1)*$i/10) ($y1+($y2-$y1)*$i/10));Start-Sleep -Milliseconds 16}
  Start-Sleep -Milliseconds 50
  if($heldName){Capture-TaskFrame $heldName}
 }finally{[RamenDesktop]::mouse_event(4,0,0,0,[UIntPtr]::Zero)}
 Start-Sleep -Milliseconds 40
}
Task-Click 1100 800
Capture-TaskFrame 'initial'
Task-Drag 410 275 240 370 'egg-held'
Task-Drag 180 165 560 370 'seasoning-held'
Task-Drag 410 165 250 365 'scallion-held'
Task-Drag 180 275 240 480 'noodles-held'
Start-Sleep -Milliseconds 500;Capture-TaskFrame 'dry-noodles'
Task-Drag 180 165 240 480
Start-Sleep -Milliseconds 180;Capture-TaskFrame 'powder-pour'
Start-Sleep -Milliseconds 330;Capture-TaskFrame 'powder-settled'
Task-Drag 880 750 240 480
$waterClock=[System.Diagnostics.Stopwatch]::StartNew()
Start-Sleep -Milliseconds 220;Capture-TaskFrame 'water-low'
Start-Sleep -Milliseconds 260;Capture-TaskFrame 'water-high'
while($waterClock.Elapsed.TotalSeconds -lt 2.65){Start-Sleep -Milliseconds 30}
Capture-TaskFrame 'boiling'
Task-Drag 410 165 240 480
Task-Drag 410 275 240 480
Start-Sleep -Milliseconds 150;Capture-TaskFrame 'egg-drop'
while($waterClock.Elapsed.TotalSeconds -lt 5.9){Start-Sleep -Milliseconds 20}
Capture-TaskFrame 'ready'
Task-Drag 240 480 1200 680 'serving-held'
Start-Sleep -Milliseconds 720;Capture-TaskFrame 'score'
Task-Drag 180 275 220 670
Start-Sleep -Milliseconds 510;Capture-TaskFrame 'front-pot-noodles'
Task-Click 322 982
Capture-TaskFrame 'paused'
@{scope='原生Windows鼠标实际操作微信开发者工具当前窗口；自然计时，无浏览器适配器、无游戏注入';date='2026-10-07';version='1.3.0';process=$taskWindow.Id;sequence='四种材料拿起/松手、倒粉、倒水、水开下葱蛋、熟成、拖锅上菜、前排投面、暂停';files='previews/desktop/after-*.png';status='CAPTURED_REQUIRES_VISUAL_REVIEW'}|ConvertTo-Json|Set-Content -LiteralPath 'previews/desktop/session-record.json' -Encoding utf8
