$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$sourceRoot = 'D:\gamedevsam\SATSLegends\src\assets\characters\characters'
$targetRoot = 'D:\gamedevsam\SATSLegends\src\assets\characters\mobile'

if (Test-Path $targetRoot) {
  Remove-Item $targetRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$maxWidth = 420
$maxHeight = 630
$count = 0

Get-ChildItem -Path $sourceRoot -Recurse -File -Filter *.png | ForEach-Object {
  $relative = $_.FullName.Substring($sourceRoot.Length + 1)
  $targetPath = Join-Path $targetRoot $relative
  $targetDir = Split-Path $targetPath -Parent

  if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  $image = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $ratio = [Math]::Min($maxWidth / $image.Width, $maxHeight / $image.Height)
    if ($ratio -gt 1) {
      $ratio = 1
    }

    $newWidth = [int][Math]::Round($image.Width * $ratio)
    $newHeight = [int][Math]::Round($image.Height * $ratio)

    $bitmap = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
      }
      finally {
        $graphics.Dispose()
      }

      $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $bitmap.Dispose()
    }
  }
  finally {
    $image.Dispose()
  }

  $count++
}

Write-Output "resized:$count"
