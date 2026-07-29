$ErrorActionPreference = 'Stop'

$desktopDir = Split-Path -Parent $PSScriptRoot
$repoDir = Split-Path -Parent $desktopDir
$source = Join-Path $desktopDir 'build_resources\porch\porch-chat-icon.svg'
$traySource = Join-Path $desktopDir 'build_resources\porch\porch-tray-symbol.svg'
$macGlyphSource = Join-Path $desktopDir 'build_resources\porch\porch-macos-glyph.svg'
$staticWebDir = Join-Path $repoDir 'fluxer_static\web'
$sizes = @(16, 24, 32, 48, 64, 128, 256, 512, 1024)
$windowsTileSizes = @{
	'StoreLogo.png' = 50
	'Square30x30Logo.png' = 30
	'Square44x44Logo.png' = 44
	'Square71x71Logo.png' = 71
	'Square89x89Logo.png' = 89
	'Square107x107Logo.png' = 107
	'Square142x142Logo.png' = 142
	'Square150x150Logo.png' = 150
	'Square284x284Logo.png' = 284
	'Square310x310Logo.png' = 310
}

foreach ($channel in @('stable', 'canary')) {
	$targetDir = Join-Path $desktopDir "build_resources\icons-$channel"
	foreach ($size in $sizes) {
		& magick -density 768 -background none $source -resize "${size}x${size}" (Join-Path $targetDir "${size}x${size}.png")
	}
	Copy-Item -LiteralPath (Join-Path $targetDir '256x256.png') -Destination (Join-Path $targetDir '128x128@2x.png') -Force
	Copy-Item -LiteralPath (Join-Path $targetDir '1024x1024.png') -Destination (Join-Path $targetDir 'icon.png') -Force
	foreach ($tile in $windowsTileSizes.GetEnumerator()) {
		& magick -density 768 -background none $source -resize "$($tile.Value)x$($tile.Value)" (Join-Path $targetDir $tile.Key)
	}
	& magick `
		(Join-Path $targetDir '16x16.png') `
		(Join-Path $targetDir '24x24.png') `
		(Join-Path $targetDir '32x32.png') `
		(Join-Path $targetDir '48x48.png') `
		(Join-Path $targetDir '64x64.png') `
		(Join-Path $targetDir '128x128.png') `
		(Join-Path $targetDir '256x256.png') `
		(Join-Path $targetDir 'icon.ico')
	& magick -density 768 -background none $traySource -resize '12x12' -gravity center -extent '16x16' (Join-Path $targetDir 'FluxerTrayTemplate.png')
	& magick -density 768 -background none $traySource -resize '24x24' -gravity center -extent '32x32' (Join-Path $targetDir 'FluxerTrayTemplate@2x.png')
	Copy-Item -LiteralPath $macGlyphSource -Destination (Join-Path $targetDir 'AppIcon.icon\Assets\Vector.svg') -Force
	$staticDesktopIconDir = Join-Path $staticWebDir "icons\desktop\$channel"
	New-Item -ItemType Directory -Path $staticDesktopIconDir -Force | Out-Null
	Copy-Item -LiteralPath (Join-Path $targetDir 'icon.ico') -Destination (Join-Path $staticDesktopIconDir 'icon.ico') -Force
}

New-Item -ItemType Directory -Path $staticWebDir -Force | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $staticWebDir 'porch-icon.svg') -Force
Copy-Item -LiteralPath $traySource -Destination (Join-Path $staticWebDir 'porch-symbol.svg') -Force

$webIcons = @{
	'android-chrome-192x192.png' = 192
	'android-chrome-512x512.png' = 512
	'apple-touch-icon.png' = 180
	'favicon-16x16.png' = 16
	'favicon-32x32.png' = 32
	'mstile-150x150.png' = 150
}
foreach ($icon in $webIcons.GetEnumerator()) {
	& magick -density 768 -background none $source -resize "$($icon.Value)x$($icon.Value)" (Join-Path $staticWebDir $icon.Key)
}
& magick `
	(Join-Path $staticWebDir 'favicon-16x16.png') `
	(Join-Path $staticWebDir 'favicon-32x32.png') `
	(Join-Path $staticWebDir 'favicon.ico')
& magick `
	-size '1200x630' 'xc:#111827' `
	'(' -density 768 -background none $source -resize '256x256' ')' `
	-gravity center -composite `
	(Join-Path $staticWebDir 'og-image-default.png')
