param(
    [Parameter(Mandatory=$true)]
    [string]$SourceImage,
    [string]$TargetDir = "frontend/src-tauri/icons"
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $SourceImage)) {
    Write-Error "Source image not found: $SourceImage"
    exit 1
}

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$sourceBmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourceImage).Path)

function Resize-And-Save-Png {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$outputPath
    )
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $destImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Generated: $outputPath ($width x $height)"
}

function Get-Png-Bytes {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height
    )
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $destImage.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return ,$bytes
}

# 1. Generate PNGs for Tauri
Resize-And-Save-Png $sourceBmp 32 32 (Join-Path $TargetDir "32x32.png")
Resize-And-Save-Png $sourceBmp 128 128 (Join-Path $TargetDir "128x128.png")
Resize-And-Save-Png $sourceBmp 256 256 (Join-Path $TargetDir "128x128@2x.png")
Resize-And-Save-Png $sourceBmp 512 512 (Join-Path $TargetDir "icon.png")

# Also copy 32x32 as web favicon
Resize-And-Save-Png $sourceBmp 32 32 "frontend/favicon.ico"
if (Test-Path "frontend/dist") {
    Resize-And-Save-Png $sourceBmp 32 32 "frontend/dist/favicon.ico"
}

# Square and Store logos
$squareSizes = @{
    "Square30x30Logo.png" = 30
    "Square44x44Logo.png" = 44
    "Square71x71Logo.png" = 71
    "Square89x89Logo.png" = 89
    "Square107x107Logo.png" = 107
    "Square142x142Logo.png" = 142
    "Square150x150Logo.png" = 150
    "Square284x284Logo.png" = 284
    "Square310x310Logo.png" = 310
    "StoreLogo.png" = 50
}
foreach ($name in $squareSizes.Keys) {
    $size = $squareSizes[$name]
    Resize-And-Save-Png $sourceBmp $size $size (Join-Path $TargetDir $name)
}

# 2. Pack Multi-resolution ICO (16, 32, 48, 64, 128, 256)
$icoSizes = @(16, 32, 48, 64, 128, 256)
$icoImages = @()
foreach ($s in $icoSizes) {
    $bytes = Get-Png-Bytes $sourceBmp $s $s
    $icoImages += [PSCustomObject]@{
        Size = $s
        Bytes = $bytes
    }
}

$icoPath = Join-Path $TargetDir "icon.ico"
$fs = [System.IO.File]::Create((Resolve-Path -Path $TargetDir).Path + "\icon.ico")
$bw = New-Object System.IO.BinaryWriter($fs)

# Header: Reserved(2) = 0, Type(2) = 1, Count(2) = $icoImages.Count
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$icoImages.Count)

$offset = 6 + ($icoImages.Count * 16)
foreach ($img in $icoImages) {
    $w = if ($img.Size -ge 256) { [byte]0 } else { [byte]$img.Size }
    $h = if ($img.Size -ge 256) { [byte]0 } else { [byte]$img.Size }
    $bw.Write($w) # Width
    $bw.Write($h) # Height
    $bw.Write([byte]0) # ColorCount
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Planes
    $bw.Write([uint16]32) # BitCount
    $bw.Write([uint32]$img.Bytes.Length) # BytesInRes
    $bw.Write([uint32]$offset) # ImageOffset
    $offset += $img.Bytes.Length
}

# Write image payloads
foreach ($img in $icoImages) {
    [byte[]]$rawBytes = $img.Bytes
    $bw.Write($rawBytes, 0, $rawBytes.Length)
}

$bw.Close()
$fs.Close()
$sourceBmp.Dispose()

Write-Host "Successfully generated all Tauri icon assets including $icoPath!"
