Add-Type -AssemblyName System.Drawing

$targetDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\img'))
$targetPath = Join-Path $targetDir 'og-image.png'
$tempPath = Join-Path $targetDir 'og-image.new.png'

if (-not $targetPath.StartsWith($targetDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Invalid target path for the OG image.'
}

$bitmap = New-Object System.Drawing.Bitmap 1200, 630
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0A0A0D'))

function Add-Glow {
  param(
    [System.Drawing.Graphics]$Canvas,
    [float]$X,
    [float]$Y,
    [float]$Radius,
    [System.Drawing.Color]$Color,
    [int]$Alpha
  )
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($X - $Radius, $Y - $Radius, $Radius * 2, $Radius * 2)
  $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $brush.CenterColor = [System.Drawing.Color]::FromArgb($Alpha, $Color)
  $brush.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::FromArgb(0, $Color))
  $brush.SetSigmaBellShape(0.28, 1)
  $Canvas.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

$teal = [System.Drawing.ColorTranslator]::FromHtml('#34B7C4')
$deepTeal = [System.Drawing.ColorTranslator]::FromHtml('#0C6B74')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#F2F0EA')
$muted = [System.Drawing.ColorTranslator]::FromHtml('#9B9BA6')
$line = [System.Drawing.ColorTranslator]::FromHtml('#26262E')

Add-Glow -Canvas $graphics -X 1050 -Y 80 -Radius 570 -Color $deepTeal -Alpha 175
Add-Glow -Canvas $graphics -X 1060 -Y 600 -Radius 390 -Color $teal -Alpha 82

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(55, $line)), 1
for ($x = 48; $x -lt 1200; $x += 72) { $graphics.DrawLine($gridPen, $x, 0, $x, 630) }
for ($y = 54; $y -lt 630; $y += 72) { $graphics.DrawLine($gridPen, 0, $y, 1200, $y) }
$gridPen.Dispose()

$markBrush = New-Object System.Drawing.SolidBrush $deepTeal
$graphics.FillRectangle($markBrush, 72, 58, 48, 48)
$markFont = New-Object System.Drawing.Font 'Segoe UI Black', 24, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$markTextBrush = New-Object System.Drawing.SolidBrush $ink
$graphics.DrawString('D', $markFont, $markTextBrush, 82, 65)

$nameFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 22, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$nameBrush = New-Object System.Drawing.SolidBrush $ink
$graphics.DrawString('DANIEL MARTIN', $nameFont, $nameBrush, 142, 69)
$dotBrush = New-Object System.Drawing.SolidBrush $teal
$graphics.FillEllipse($dotBrush, 316, 84, 6, 6)

$headlineFont = New-Object System.Drawing.Font 'Segoe UI Black', 91, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$headlineBrush = New-Object System.Drawing.SolidBrush $ink
$graphics.DrawString('Klartexten.', $headlineFont, $headlineBrush, 66, 176)

$outlinePath = New-Object System.Drawing.Drawing2D.GraphicsPath
$outlinePath.AddString('Vordenken.', (New-Object System.Drawing.FontFamily 'Segoe UI Black'), [int][System.Drawing.FontStyle]::Bold, 91, (New-Object System.Drawing.PointF 68, 285), [System.Drawing.StringFormat]::GenericDefault)
$outlinePen = New-Object System.Drawing.Pen $teal, 3.2
$outlinePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$graphics.DrawPath($outlinePen, $outlinePath)

$roleFont = New-Object System.Drawing.Font 'Segoe UI Semibold', 27, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$roleBrush = New-Object System.Drawing.SolidBrush $ink
$graphics.DrawString('Content und AI Strategist', $roleFont, $roleBrush, 72, 478)

$metaFont = New-Object System.Drawing.Font 'Segoe UI', 18, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$metaBrush = New-Object System.Drawing.SolidBrush $muted
$separator = [char]0x00B7
$graphics.DrawString("CONTENT-STRATEGIE $separator KI $separator CHANGE", $metaFont, $metaBrush, 72, 530)
$domainBrush = New-Object System.Drawing.SolidBrush $teal
$domainFormat = New-Object System.Drawing.StringFormat
$domainFormat.Alignment = [System.Drawing.StringAlignment]::Far
$graphics.DrawString('danielmartin.fyi', $metaFont, $domainBrush, (New-Object System.Drawing.RectangleF 760, 544, 365, 36), $domainFormat)

$outlinePath.Dispose()
$outlinePen.Dispose()
$markBrush.Dispose()
$markFont.Dispose()
$markTextBrush.Dispose()
$nameFont.Dispose()
$nameBrush.Dispose()
$dotBrush.Dispose()
$headlineFont.Dispose()
$headlineBrush.Dispose()
$roleFont.Dispose()
$roleBrush.Dispose()
$metaFont.Dispose()
$metaBrush.Dispose()
$domainBrush.Dispose()
$domainFormat.Dispose()
$graphics.Dispose()

$bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Move-Item -LiteralPath $tempPath -Destination $targetPath -Force
