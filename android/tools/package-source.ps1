$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $projectRoot 'releases/Resonance-Android-0.1.11-source.zip'
$files = @('.gitignore','README.md','build.gradle','gradle.properties','settings.gradle','gradlew','gradlew.bat','tools/build.ps1','tools/setup-sdk.ps1','tools/package-source.ps1') | ForEach-Object { Get-Item -LiteralPath (Join-Path $projectRoot $_) }
foreach ($directory in @('app/src','web','shared','gradle')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File
}
$files += Get-Item -LiteralPath (Join-Path $projectRoot 'app/build.gradle')
New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
# FileMode.Create replaces only this named generated source archive.
$stream = [IO.File]::Open($destination,[IO.FileMode]::Create)
$zip = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relative = [IO.Path]::GetRelativePath($projectRoot,$file.FullName).Replace('\','/')
        if ($relative.StartsWith('../')) { throw 'Source file is outside the Android project.' }
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,'Resonance-Android/'+$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Get-Item -LiteralPath $destination | Select-Object Name,Length
