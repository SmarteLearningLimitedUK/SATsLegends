$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = Join-Path $repoRoot 'src\assets\level_backgrounds\take_out.png'
$targetRoot = Join-Path $repoRoot 'src\assets\take_out\slices'

if (Test-Path $targetRoot) {
  Remove-Item $targetRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$slices = @(
  @{ Name = 'tray_lid'; X = 34; Y = 52; W = 404; H = 202 },
  @{ Name = 'portion_eighth_b'; X = 502; Y = 60; W = 414; H = 150 },
  @{ Name = 'portion_eighth_c'; X = 40; Y = 284; W = 412; H = 170 },
  @{ Name = 'portion_eighth_d'; X = 560; Y = 292; W = 322; H = 154 },
  @{ Name = 'portion_eighth_a'; X = 42; Y = 516; W = 414; H = 144 },
  @{ Name = 'portion_eighth_e'; X = 566; Y = 514; W = 330; H = 164 },
  @{ Name = 'portion_quarter'; X = 32; Y = 712; W = 418; H = 170 },
  @{ Name = 'portion_half'; X = 562; Y = 650; W = 330; H = 250 },
  @{ Name = 'sauce_swirl_a'; X = 34; Y = 894; W = 406; H = 120 },
  @{ Name = 'sauce_swirl_b'; X = 34; Y = 1078; W = 410; H = 118 },
  @{ Name = 'tray_base'; X = 570; Y = 896; W = 330; H = 238 }
)

function Remove-Backdrop {
  param([System.Drawing.Bitmap]$Bitmap)

  for ($x = 0; $x -lt $Bitmap.Width; $x++) {
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
      $pixel = $Bitmap.GetPixel($x, $y)
      $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
      $spread = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))

      if ($avg -ge 214 -and $avg -le 246 -and $spread -le 16) {
        $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }
}

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

  $maxWidth = 440
  $maxHeight = 220
  $ratio = [Math]::Min($maxWidth / $Bitmap.Width, $maxHeight / $Bitmap.Height)

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

$sheet = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  foreach ($slice in $slices) {
    $cropped = $sheet.Clone(
      [System.Drawing.Rectangle]::new($slice.X, $slice.Y, $slice.W, $slice.H),
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    Remove-Backdrop -Bitmap $cropped
    $trimmed = Trim-Transparent -Bitmap $cropped
    $final = Resize-IfNeeded -Bitmap $trimmed

    try {
      $targetPath = Join-Path $targetRoot "$($slice.Name).png"
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
