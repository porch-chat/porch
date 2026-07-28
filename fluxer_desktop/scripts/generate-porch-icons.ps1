$ErrorActionPreference = 'Stop'

$desktopDir = Split-Path -Parent $PSScriptRoot
$source = Join-Path $desktopDir 'build_resources\porch\porch-chat-icon.svg'
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
}
