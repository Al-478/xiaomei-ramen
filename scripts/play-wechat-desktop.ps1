param([ValidateSet('capture','click','drag')][string]$Action='capture',[string]$Output='previews/desktop/current.png',[string]$Points='[]',[int]$HoldMs=250,[switch]$CaptureHeld)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class RamenDesktop {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int command);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
}
'@
[void][RamenDesktop]::SetProcessDPIAware()
# 只操作已确认的项目窗口，不向其他应用发送鼠标输入。
$taskWindow=Get-Process | Where-Object {$_.MainWindowTitle -eq 'genki-ramen-shop' -and $_.MainWindowHandle -ne 0} | Select-Object -First 1
if(-not $taskWindow){throw '没有找到当前项目的微信工具窗口'}
$targetHandle=[IntPtr]$taskWindow.MainWindowHandle
if([RamenDesktop]::IsIconic($targetHandle)){[void][RamenDesktop]::ShowWindow($targetHandle,9)}
[void][RamenDesktop]::SetForegroundWindow($targetHandle)
Start-Sleep -Milliseconds 200
if([RamenDesktop]::GetAncestor([RamenDesktop]::GetForegroundWindow(),2) -ne $targetHandle){throw '项目窗口没有取得前台，已停止输入'}
$bounds=New-Object RamenDesktop+RECT
[void][RamenDesktop]::GetWindowRect($targetHandle,[ref]$bounds)
$moves=ConvertFrom-Json -NoEnumerate $Points
foreach($point in $moves){if($point[0] -lt 0 -or $point[1] -lt 0 -or $point[0] -ge ($bounds.Right-$bounds.Left) -or $point[1] -ge ($bounds.Bottom-$bounds.Top)){throw '鼠标落点超出项目窗口'}}
function Move-TaskMouse($point){[void][RamenDesktop]::SetCursorPos($bounds.Left+[int]$point[0],$bounds.Top+[int]$point[1])}
function Save-HeldCapture {
 $heldPath=[System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path ($Output.Replace('.png','-held.png'))))
 [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($heldPath))
 $heldBitmap=New-Object System.Drawing.Bitmap(($bounds.Right-$bounds.Left),($bounds.Bottom-$bounds.Top))
 $heldGraphics=[System.Drawing.Graphics]::FromImage($heldBitmap)
 try{$heldGraphics.CopyFromScreen($bounds.Left,$bounds.Top,0,0,$heldBitmap.Size);$heldBitmap.Save($heldPath,[System.Drawing.Imaging.ImageFormat]::Png)}finally{$heldGraphics.Dispose();$heldBitmap.Dispose()}
}
if($Action -ne 'capture'){
 if($moves.Count -lt 1){throw '需要窗口内坐标'}
 Move-TaskMouse $moves[0]
 [RamenDesktop]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
 try{
  foreach($point in $moves){Move-TaskMouse $point;Start-Sleep -Milliseconds 20}
  Start-Sleep -Milliseconds $HoldMs
  if($CaptureHeld){Save-HeldCapture}
 }finally{[RamenDesktop]::mouse_event(4,0,0,0,[UIntPtr]::Zero)}
}
Start-Sleep -Milliseconds 80
$taskRoot=(Resolve-Path '.').Path
$outputPath=[System.IO.Path]::GetFullPath((Join-Path $taskRoot $Output))
if(-not $outputPath.StartsWith($taskRoot+[System.IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw '截图输出路径超出项目'}
[void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($outputPath))
$screenBounds=[System.Windows.Forms.SystemInformation]::VirtualScreen
$x=[Math]::Max($bounds.Left,$screenBounds.Left);$y=[Math]::Max($bounds.Top,$screenBounds.Top)
$width=[Math]::Min($bounds.Right,$screenBounds.Right)-$x;$height=[Math]::Min($bounds.Bottom,$screenBounds.Bottom)-$y
$bitmap=New-Object System.Drawing.Bitmap($width,$height)
$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
try{$graphics.CopyFromScreen($x,$y,0,0,$bitmap.Size);$bitmap.Save($outputPath,[System.Drawing.Imaging.ImageFormat]::Png)}finally{$graphics.Dispose();$bitmap.Dispose()}
@{action=$Action;x=$x;y=$y;width=$width;height=$height;file=$outputPath;process=$taskWindow.Id}|ConvertTo-Json -Compress
