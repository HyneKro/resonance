param([switch]$DeviceTests)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $env:JAVA_HOME) { throw 'Set JAVA_HOME to JDK 17 or 21 first.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'local.properties'))) {
    throw 'Run tools/setup-sdk.ps1 first, or configure local.properties with your Android SDK directory.'
}
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.toolchain/gradle-home'
Push-Location $projectRoot
try {
    & './gradlew.bat' --no-daemon --console=plain :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug
    if ($LASTEXITCODE -ne 0) { throw 'Android build or checks failed.' }
    if ($DeviceTests) {
        & './gradlew.bat' --no-daemon --console=plain :app:connectedDebugAndroidTest
        if ($LASTEXITCODE -ne 0) { throw 'Device checks failed.' }
    }
    New-Item -ItemType Directory -Force -Path releases | Out-Null
    Copy-Item -LiteralPath app/build/outputs/apk/debug/app-arm64-v8a-debug.apk -Destination releases/Resonance-Android-0.26.0-dev.18.apk
    Get-FileHash -Algorithm SHA256 -LiteralPath releases/Resonance-Android-0.26.0-dev.18.apk
} finally { Pop-Location }
