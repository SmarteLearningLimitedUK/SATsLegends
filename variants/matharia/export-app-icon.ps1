$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourcePath = Join-Path $PSScriptRoot 'assets/matharia-app-icon.png'
$destinationPath = Join-Path $PSScriptRoot 'native/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
$source = [System.Drawing.Image]::FromFile($sourcePath)
$output = New-Object System.Drawing.Bitmap(1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb))
$graphics = [System.Drawing.Graphics]::FromImage($output)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($source, 0, 0, 1024, 1024)
  $output.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $output.Dispose()
  $source.Dispose()
}
