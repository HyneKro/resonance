Add-Type -AssemblyName System.Drawing
[xml]$resonanceSvg = Get-Content -Raw -LiteralPath 'public/icon.svg'
$resonancePaths = $resonanceSvg.SelectNodes("//*[local-name()='g']/*[local-name()='path']")
$resonanceSizes = @(16,24,32,48,64,128,256)
$resonanceImages = @()
foreach ($resonanceSize in $resonanceSizes) {
 $resonanceBitmap = New-Object System.Drawing.Bitmap ($resonanceSize*4),($resonanceSize*4)
 $resonanceGraphics = [System.Drawing.Graphics]::FromImage($resonanceBitmap)
 $resonanceGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $resonanceGraphics.ScaleTransform(($resonanceSize/16.0),($resonanceSize/16.0))
 $resonanceShape = New-Object System.Drawing.Drawing2D.GraphicsPath
 $resonanceShape.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding
 $resonanceShape.AddArc(0,0,34,34,180,90); $resonanceShape.AddArc(30,0,34,34,270,90)
 $resonanceShape.AddArc(30,30,34,34,0,90); $resonanceShape.AddArc(0,30,34,34,90,90); $resonanceShape.CloseFigure()
 $resonanceBack = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(17,20,27))
 $resonanceGraphics.FillPath($resonanceBack,$resonanceShape)
 $resonanceGraphics.TranslateTransform(8,8)
 foreach ($resonanceNode in $resonancePaths) {
  $resonanceAlpha=255
  if($resonanceNode.HasAttribute('opacity')){$resonanceAlpha=[int](255*[double]::Parse($resonanceNode.GetAttribute('opacity'),[System.Globalization.CultureInfo]::InvariantCulture))}
  $resonanceGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.PointF]::new(2,1)),([System.Drawing.PointF]::new(47,45)),([System.Drawing.Color]::FromArgb($resonanceAlpha,225,201,255)),([System.Drawing.Color]::FromArgb($resonanceAlpha,135,228,220))
  $resonanceShape.Reset()
  $resonanceTokens=[regex]::Matches($resonanceNode.GetAttribute('d'),'[MLCZ]|-?\d+(?:\.\d+)?')
  $resonanceIndex=0;$resonanceX=0.0;$resonanceY=0.0
  while($resonanceIndex -lt $resonanceTokens.Count){
   $resonanceCommand=$resonanceTokens[$resonanceIndex++].Value
   $resonanceCount=switch($resonanceCommand){'M'{2};'L'{2};'C'{6};'Z'{0};default{throw "Unsupported emblem path command"}}
   $resonanceNumbers=@()
   for($resonanceN=0;$resonanceN -lt $resonanceCount;$resonanceN++){$resonanceNumbers+= [single]::Parse($resonanceTokens[$resonanceIndex++].Value,[System.Globalization.CultureInfo]::InvariantCulture)}
   switch($resonanceCommand){
    'M'{$resonanceShape.StartFigure();$resonanceX=$resonanceNumbers[0];$resonanceY=$resonanceNumbers[1]}
    'L'{$resonanceShape.AddLine([single]$resonanceX,[single]$resonanceY,$resonanceNumbers[0],$resonanceNumbers[1]);$resonanceX=$resonanceNumbers[0];$resonanceY=$resonanceNumbers[1]}
    'C'{$resonanceShape.AddBezier([single]$resonanceX,[single]$resonanceY,$resonanceNumbers[0],$resonanceNumbers[1],$resonanceNumbers[2],$resonanceNumbers[3],$resonanceNumbers[4],$resonanceNumbers[5]);$resonanceX=$resonanceNumbers[4];$resonanceY=$resonanceNumbers[5]}
    'Z'{$resonanceShape.CloseFigure()}
   }
  }
  $resonanceGraphics.FillPath($resonanceGradient,$resonanceShape);$resonanceGradient.Dispose()
 }
 $resonanceSmall=New-Object System.Drawing.Bitmap $resonanceSize,$resonanceSize
 $resonanceDown=[System.Drawing.Graphics]::FromImage($resonanceSmall);$resonanceDown.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $resonanceDown.DrawImage($resonanceBitmap,0,0,$resonanceSize,$resonanceSize)
 $resonanceStream=New-Object System.IO.MemoryStream;$resonanceSmall.Save($resonanceStream,[System.Drawing.Imaging.ImageFormat]::Png)
 $resonanceImages+=,@{Size=$resonanceSize;Bytes=$resonanceStream.ToArray()}
 if($resonanceSize -eq 256){$resonanceSmall.Save((Join-Path (Get-Location) 'Resonance-Icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)}
 $resonanceDown.Dispose();$resonanceSmall.Dispose();$resonanceStream.Dispose();$resonanceGraphics.Dispose();$resonanceBitmap.Dispose();$resonanceShape.Dispose();$resonanceBack.Dispose()
}
$resonanceOutput=[System.IO.File]::Create((Join-Path (Get-Location) 'public/icon.ico'));$resonanceWriter=New-Object System.IO.BinaryWriter $resonanceOutput
$resonanceWriter.Write([UInt16]0);$resonanceWriter.Write([UInt16]1);$resonanceWriter.Write([UInt16]$resonanceImages.Count)
$resonanceOffset=6+16*$resonanceImages.Count
foreach($resonanceImage in $resonanceImages){$resonanceDimension=if($resonanceImage.Size -eq 256){0}else{$resonanceImage.Size};$resonanceWriter.Write([byte]$resonanceDimension);$resonanceWriter.Write([byte]$resonanceDimension);$resonanceWriter.Write([byte]0);$resonanceWriter.Write([byte]0);$resonanceWriter.Write([UInt16]1);$resonanceWriter.Write([UInt16]32);$resonanceWriter.Write([UInt32]$resonanceImage.Bytes.Length);$resonanceWriter.Write([UInt32]$resonanceOffset);$resonanceOffset+=$resonanceImage.Bytes.Length}
foreach($resonanceImage in $resonanceImages){$resonanceWriter.Write([byte[]]$resonanceImage.Bytes)}
$resonanceWriter.Dispose();$resonanceOutput.Dispose()
Write-Output 'Musical emblem and seven Windows icon sizes built.'
