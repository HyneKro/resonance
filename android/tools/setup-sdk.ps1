param([switch]$AcceptLicenses)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$sdkRoot = Join-Path $projectRoot '.toolchain/sdk'
$archive = Join-Path $projectRoot '.toolchain/commandlinetools.zip'
New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null
if (-not (Test-Path (Join-Path $sdkRoot 'cmdline-tools/latest/bin/sdkmanager.bat'))) {
    & curl.exe --fail --location --retry 2 --output $archive 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK tools download failed' }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') { throw 'Android SDK tools checksum mismatch' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $unpacked = Join-Path $projectRoot '.toolchain/unpacked'
    [System.IO.Compression.ZipFile]::ExtractToDirectory($archive,$unpacked)
    New-Item -ItemType Directory -Force -Path (Join-Path $sdkRoot 'cmdline-tools') | Out-Null
    Copy-Item -LiteralPath (Join-Path $unpacked 'cmdline-tools') -Destination (Join-Path $sdkRoot 'cmdline-tools/latest') -Recurse
}
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to a JDK 17 or 21 installation first.' }
$manager = Join-Path $sdkRoot 'cmdline-tools/latest/bin/sdkmanager.bat'
if ($AcceptLicenses) {
    1..40 | ForEach-Object { 'y' } | & $manager "--sdk_root=$sdkRoot" --licenses
} else {
    & $manager "--sdk_root=$sdkRoot" --licenses
}
& $manager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;35.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK package installation failed' }
$property = 'sdk.dir=' + $sdkRoot.Replace('\','/').Replace(':','\:')
Set-Content -LiteralPath (Join-Path $projectRoot 'local.properties') -Value $property -Encoding ascii
Write-Output 'Android SDK is ready in this project.'
