$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = Join-Path $repoRoot 'src\assets\importedassets\screen comparison\00 - elements.jpg'
$targetRoot = Join-Path $repoRoot 'src\assets\screen_build\slices'
$manifestPath = Join-Path $targetRoot 'manifest.json'

if (!(Test-Path $sourcePath)) {
  throw "Source sheet not found: $sourcePath"
}

if (Test-Path $targetRoot) {
  Remove-Item $targetRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$referenceWidth = 853.0
$referenceHeight = 1795.0

# Rectangles are authored in reference coordinates (853x1795) then scaled
# to the real source dimensions.
$slices = @(
  @{ Name = 'top_icon_tabbar'; X = 68; Y = 22; W = 203; H = 24 },
  @{ Name = 'top_tabs_row'; X = 68; Y = 50; W = 266; H = 24 },
  @{ Name = 'top_currency_row'; X = 430; Y = 24; W = 208; H = 24 },

  @{ Name = 'panel_large_left'; X = 39; Y = 84; W = 358; H = 162 },
  @{ Name = 'panel_large_right'; X = 430; Y = 84; W = 286; H = 162 },
  @{ Name = 'panel_medium_left'; X = 46; Y = 304; W = 357; H = 190 },
  @{ Name = 'panel_medium_center'; X = 431; Y = 304; W = 171; H = 190 },
  @{ Name = 'panel_medium_right'; X = 629; Y = 304; W = 168; H = 190 },
  @{ Name = 'panel_center_ribbon'; X = 420; Y = 300; W = 198; H = 35 },

  @{ Name = 'card_tall'; X = 46; Y = 530; W = 136; H = 224 },
  @{ Name = 'form_panel'; X = 204; Y = 531; W = 201; H = 132 },
  @{ Name = 'form_input_slot'; X = 227; Y = 566; W = 151; H = 22 },
  @{ Name = 'form_input_slot_2'; X = 227; Y = 598; W = 151; H = 22 },
  @{ Name = 'glow_card'; X = 446; Y = 531; W = 74; H = 132 },
  @{ Name = 'glow_card_base'; X = 447; Y = 664; W = 72; H = 29 },

  @{ Name = 'button_group_frame'; X = 547; Y = 529; W = 265; H = 164 },
  @{ Name = 'button_tall_primary'; X = 548; Y = 562; W = 83; H = 137 },
  @{ Name = 'button_square_blue'; X = 641; Y = 562; W = 83; H = 83 },
  @{ Name = 'button_square_yellow'; X = 731; Y = 562; W = 82; H = 82 },

  @{ Name = 'status_board_topbar'; X = 45; Y = 780; W = 474; H = 30 },
  @{ Name = 'status_board_yellow_row'; X = 46; Y = 810; W = 473; H = 95 },
  @{ Name = 'small_button_yellow'; X = 567; Y = 833; W = 64; H = 64 },
  @{ Name = 'small_button_blue'; X = 567; Y = 920; W = 64; H = 63 },

  @{ Name = 'info_bar_light'; X = 45; Y = 1143; W = 474; H = 32 },
  @{ Name = 'info_bar_dark'; X = 45; Y = 1178; W = 474; H = 34 },
  @{ Name = 'speech_bubble_long'; X = 430; Y = 1141; W = 292; H = 41 },
  @{ Name = 'speech_bubble_short'; X = 730; Y = 1139; W = 74; H = 40 },
  @{ Name = 'tiny_action_row'; X = 432; Y = 1182; W = 372; H = 43 },
  @{ Name = 'button_row_small'; X = 46; Y = 1263; W = 470; H = 37 },

  @{ Name = 'progress_group'; X = 44; Y = 1392; W = 474; H = 115 },
  @{ Name = 'progress_long_fg'; X = 45; Y = 1509; W = 474; H = 18 },
  @{ Name = 'progress_long_bg'; X = 45; Y = 1528; W = 474; H = 16 },

  @{ Name = 'board_large'; X = 38; Y = 1547; W = 473; H = 228 },
  @{ Name = 'joystick_cluster'; X = 538; Y = 1548; W = 249; H = 223 }
)

$sheet = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  $scaleX = $sheet.Width / $referenceWidth
  $scaleY = $sheet.Height / $referenceHeight

  $manifest = [ordered]@{
    source = $sourcePath
    sourceWidth = $sheet.Width
    sourceHeight = $sheet.Height
    referenceWidth = $referenceWidth
    referenceHeight = $referenceHeight
    slices = @()
  }

  foreach ($slice in $slices) {
    $x = [int][Math]::Round($slice.X * $scaleX)
    $y = [int][Math]::Round($slice.Y * $scaleY)
    $w = [int][Math]::Round($slice.W * $scaleX)
    $h = [int][Math]::Round($slice.H * $scaleY)

    $x = [Math]::Max(0, [Math]::Min($x, $sheet.Width - 1))
    $y = [Math]::Max(0, [Math]::Min($y, $sheet.Height - 1))
    $w = [Math]::Max(1, [Math]::Min($w, $sheet.Width - $x))
    $h = [Math]::Max(1, [Math]::Min($h, $sheet.Height - $y))

    $rect = [System.Drawing.Rectangle]::new($x, $y, $w, $h)
    $cropped = $sheet.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    try {
      $targetPath = Join-Path $targetRoot "$($slice.Name).png"
      $cropped.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $manifest.slices += [ordered]@{
        name = $slice.Name
        x = $x
        y = $y
        width = $w
        height = $h
        file = "$($slice.Name).png"
      }
    }
    finally {
      $cropped.Dispose()
    }
  }

  $manifest | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding UTF8
}
finally {
  $sheet.Dispose()
}

Write-Output "sliced:$($slices.Count)"
