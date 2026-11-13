$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class RamenCapture {
 [StructLayout(LayoutKind.Sequential)] public struct RECT {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int state);
}
'@
[void][RamenCapture]::SetProcessDPIAware()
$taskCaptureRoot=(Get-Location).Path
$taskCaptureWindow=Get-Process | Where-Object {$_.MainWindowTitle -eq 'genki-ramen-shop' -and $_.MainWindowHandle -ne 0} | Select-Object -First 1
if(-not $taskCaptureWindow){throw '没有当前项目窗口'}
$taskCaptureHandle=[IntPtr]$taskCaptureWindow.MainWindowHandle
[void][RamenCapture]::SetForegroundWindow($taskCaptureHandle)
@{ready=$true;process=$taskCaptureWindow.Id}|ConvertTo-Json -Compress
while($taskCaptureLine=[Console]::ReadLine()){
 $request=$taskCaptureLine|ConvertFrom-Json
 if($request.action -eq 'close'){break}
 try{
  $taskCaptureWindow=Get-Process | Where-Object {$_.MainWindowTitle -eq 'genki-ramen-shop' -and $_.MainWindowHandle -ne 0} | Select-Object -First 1
  if(-not $taskCaptureWindow){throw '项目窗口已关闭'}
  $taskCaptureHandle=[IntPtr]$taskCaptureWindow.MainWindowHandle
  if([RamenCapture]::IsIconic($taskCaptureHandle)){[void][RamenCapture]::ShowWindow($taskCaptureHandle,9);Start-Sleep -Milliseconds 100}
  [void][RamenCapture]::SetForegroundWindow($taskCaptureHandle)
  if([RamenCapture]::GetAncestor([RamenCapture]::GetForegroundWindow(),2) -ne $taskCaptureHandle){throw '项目窗口被其他窗口遮挡，停止截图'}
  $taskCaptureFile=[System.IO.Path]::GetFullPath((Join-Path $taskCaptureRoot $request.file))
  if(-not $taskCaptureFile.StartsWith($taskCaptureRoot+[System.IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw '输出越界'}
  [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($taskCaptureFile))
  $r=New-Object RamenCapture+RECT
  if(-not [RamenCapture]::GetWindowRect($taskCaptureHandle,[ref]$r)){throw '无法取得项目窗口范围'}
  $v=[System.Windows.Forms.SystemInformation]::VirtualScreen
  $left=[Math]::Max($r.Left,$v.Left);$top=[Math]::Max($r.Top,$v.Top)
  $w=[Math]::Min($r.Right,$v.Right)-$left;$h=[Math]::Min($r.Bottom,$v.Bottom)-$top
  if($w -le 0 -or $h -le 0){throw "窗口范围无效：$($r.Left),$($r.Top),$($r.Right),$($r.Bottom)，屏幕 $($v.Left),$($v.Top),$($v.Right),$($v.Bottom)"}
  $bmp=New-Object System.Drawing.Bitmap($w,$h);$g=[System.Drawing.Graphics]::FromImage($bmp)
  try{$g.CopyFromScreen($left,$top,0,0,$bmp.Size);$bmp.Save($taskCaptureFile,[System.Drawing.Imaging.ImageFormat]::Png)}finally{$g.Dispose();$bmp.Dispose()}
  @{id=$request.id;ok=$true;file=$request.file}|ConvertTo-Json -Compress
 }catch{@{id=$request.id;ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress}
}
