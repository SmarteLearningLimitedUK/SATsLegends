$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceBoard = Join-Path $repoRoot 'src\assets\fraction_match\board_premium.png'
$sourceTiles = Join-Path $repoRoot 'src\assets\fraction_match\board_premium.png'
$targetRoot = Join-Path $repoRoot 'src\assets\fraction_match'
$tileRoot = Join-Path $targetRoot 'tiles'

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
if (Test-Path $tileRoot) {
  Remove-Item $tileRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $tileRoot | Out-Null
Copy-Item $sourceBoard (Join-Path $targetRoot 'board.png')

$slices = @(
  @{ Name = 'ember'; X = 34; Y = 126; W = 246; H = 250 },
  @{ Name = 'sapphire'; X = 326; Y = 126; W = 246; H = 250 },
  @{ Name = 'emerald'; X = 630; Y = 126; W = 246; H = 250 },
  @{ Name = 'azure'; X = 36; Y = 434; W = 246; H = 250 },
  @{ Name = 'verdant'; X = 332; Y = 434; W = 246; H = 250 },
  @{ Name = 'violet'; X = 628; Y = 434; W = 246; H = 250 },
  @{ Name = 'storm'; X = 38; Y = 736; W = 256; H = 268 },
  @{ Name = 'plasma'; X = 330; Y = 730; W = 256; H = 280 },
  @{ Name = 'gold'; X = 634; Y = 736; W = 246; H = 250 }
)

function Trim-Transparent {
  param([System.Drawing.Bitmap]$Bitmap)

  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = -1
  $maxY = -1

  for ($x = 0; $x -lt $Bitmap.Width; $x++) {
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
      if ($Bitmap.GetPixel($x, $y).A -gt 0) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0 -or $maxY -lt 0) {
    return $Bitmap
  }

  $trimmedWidth = $maxX - $minX + 1
  $trimmedHeight = $maxY - $minY + 1
  $trimmed = New-Object System.Drawing.Bitmap($trimmedWidth, $trimmedHeight)

  $graphics = [System.Drawing.Graphics]::FromImage($trimmed)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage(
      $Bitmap,
      [System.Drawing.Rectangle]::new(0, 0, $trimmedWidth, $trimmedHeight),
      [System.Drawing.Rectangle]::new($minX, $minY, $trimmedWidth, $trimmedHeight),
      [System.Drawing.GraphicsUnit]::Pixel
    )
  }
  finally {
    $graphics.Dispose()
  }

  $Bitmap.Dispose()
  return $trimmed
}

function Resize-IfNeeded {
  param([System.Drawing.Bitmap]$Bitmap)

  $maxSide = 220
  $ratio = [Math]::Min($maxSide / $Bitmap.Width, $maxSide / $Bitmap.Height)

  if ($ratio -ge 1) {
    return $Bitmap
  }

  $newWidth = [int][Math]::Round($Bitmap.Width * $ratio)
  $newHeight = [int][Math]::Round($Bitmap.Height * $ratio)
  $resized = New-Object System.Drawing.Bitmap($newWidth, $newHeight)

  $graphics = [System.Drawing.Graphics]::FromImage($resized)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($Bitmap, 0, 0, $newWidth, $newHeight)
  }
  finally {
    $graphics.Dispose()
  }

  $Bitmap.Dispose()
  return $resized
}

$sheet = [System.Drawing.Bitmap]::FromFile($sourceTiles)
try {
  foreach ($slice in $slices) {
    $cropped = $sheet.Clone(
      [System.Drawing.Rectangle]::new($slice.X, $slice.Y, $slice.W, $slice.H),
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    $trimmed = Trim-Transparent -Bitmap $cropped
    $final = Resize-IfNeeded -Bitmap $trimmed

    try {
      $targetPath = Join-Path $tileRoot "$($slice.Name).png"
      $final.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $final.Dispose()
    }
  }
}
finally {
  $sheet.Dispose()
}

Write-Output "sliced:$($slices.Count)"
