param([Parameter(Mandatory=$true)][string]$Helper,[Parameter(Mandatory=$true)][string]$Destination,[Parameter(Mandatory=$true)][string]$Stage,[int]$WaitFor=0,[switch]$NoLaunch)
$ErrorActionPreference='Stop'
# Windows PowerShell can exit without running -File when Node starts it with
# DETACHED_PROCESS. Start-Process gives the helper its own hidden console instead.
function QuoteArgument([string]$value){if($value -match '["\r\n]'){throw 'Invalid helper argument.'};return '"'+$value+'"'}
$arguments=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',(QuoteArgument $Helper),'-Destination',(QuoteArgument $Destination),'-Stage',(QuoteArgument $Stage),'-WaitFor',"$WaitFor")
if($NoLaunch){$arguments+='-NoLaunch'}
$run=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Stage))
$ready=Join-Path $run 'ready.json'
$process=Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
$deadline=[DateTime]::UtcNow.AddSeconds(15)
while([DateTime]::UtcNow -lt $deadline){
 if(Test-Path -LiteralPath $ready){$value=Get-Content -LiteralPath $ready -Raw | ConvertFrom-Json;if($value.pid -eq $process.Id){$value | ConvertTo-Json -Compress;exit 0}}
 if($process.HasExited){throw 'The update helper stopped before it was ready. The app has not been closed.'}
 Start-Sleep -Milliseconds 100
}
# The app stays open on failure; the helper has not been given permission to copy.
Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
throw 'The update helper did not become ready. The app has not been closed.'
