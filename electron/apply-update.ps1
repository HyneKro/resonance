param([Parameter(Mandatory=$true)][string]$Destination,[Parameter(Mandatory=$true)][string]$Stage,[int]$WaitFor=0,[switch]$NoLaunch,[ValidateRange(1,120)][int]$LockTimeoutSeconds=30)
$ErrorActionPreference='Stop'
function FileHash([string]$file){$stream=[IO.File]::OpenRead($file);$sha=[Security.Cryptography.SHA256]::Create();try{return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$sha.Dispose();$stream.Dispose()}}
$root=[IO.Path]::GetFullPath($Destination).TrimEnd('\');$stageRoot=[IO.Path]::GetFullPath($Stage)
if(-not(Test-Path -LiteralPath (Join-Path $root 'portable.flag')) -or -not $stageRoot.StartsWith($root+'\.updates\',[StringComparison]::OrdinalIgnoreCase)){throw 'The update must target its own portable app.'}
$run=[IO.Path]::GetDirectoryName($stageRoot);$backup=Join-Path $run 'backup';$applied=[Collections.Generic.List[object]]::new()
$status=Join-Path $run 'result.json'
function Allowed([string]$name) {
 if($name -match '(^|/)\.\.?(/|$)|[:\\]' -or $name.StartsWith('/')) { return $false }
 if($name -match '^(locales/[^/]+\.pak|resources/app/(public|electron|node_modules|tools)/.+)$') { return $name -notmatch '(^|/)(data|\.updates)(/|$)' }
 return $name -match '^(Resonance\.exe|chrome_[12]00_percent\.pak|d3dcompiler_47\.dll|dxcompiler\.dll|dxil\.dll|ffmpeg\.dll|icudtl\.dat|LICENSE|LICENSES\.chromium\.html|resources\.pak|snapshot_blob\.bin|v8_context_snapshot\.bin|version|vk_swiftshader_icd\.json|vk_swiftshader\.dll|vulkan-1\.dll|portable\.flag|START HERE\.txt|resources/app/[\w.-]+\.(mjs|json))$'
}
function SafePath([string]$base,[string]$relative){
 $value=[IO.Path]::GetFullPath((Join-Path $base $relative))
 if($relative -match '(^|/)\.\.?(/|$)|[:\\]' -or $relative.StartsWith('/') -or $relative -match '(^|/)(data|\.updates)(/|$)' -or -not $value.StartsWith($base.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe update path.'}
 # Refuse directory junctions: app files must never redirect writes into personal data.
 $parent=$value
 while($parent.Length -ge $base.Length){if((Test-Path -LiteralPath $parent) -and ((Get-Item -LiteralPath $parent).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Update destination contains a redirected folder.'};$parent=[IO.Path]::GetDirectoryName($parent);if(-not $parent){break}}
 return $value
}
function Locked($errorRecord){return (($errorRecord.Exception.GetBaseException().HResult -band 0xffff) -in @(32,33))}
function RetryLocked([scriptblock]$action){
 while($true){try{return & $action}catch{
  if(-not(Locked $_)){throw}
  $script:lockRetries++
  if([DateTime]::UtcNow -ge $script:lockDeadline){$script:blocked=$true;throw 'Windows is still using an app file. Your current version is available. Wait a moment, then use Restart & update again.'}
  Start-Sleep -Milliseconds 250
 }}
}
function WaitForAppFiles {
 # Electron's GPU/audio/renderer children can outlive its main process.
 # Match the full executable path; another installation is not ours to stop.
 while($true){
  $running=@(Get-Process -Name Resonance -ErrorAction SilentlyContinue | Where-Object {try{$_.Path -eq (Join-Path $root 'Resonance.exe')}catch{$false}})
  if(-not $running.Count){return}
  $script:processWaits++
  if([DateTime]::UtcNow -ge $script:lockDeadline){$script:blocked=$true;throw 'Resonance is still closing in the background. Your current version is available. Wait a moment, then use Restart & update again.'}
  Start-Sleep -Milliseconds 250
 }
}
# Reject redirected staging/backup folders before creating files or claiming a run.
$ancestor=$stageRoot
while($ancestor.Length -ge $root.Length){if((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Update destination contains a redirected folder.'};$ancestor=[IO.Path]::GetDirectoryName($ancestor);if(-not $ancestor){break}}
$temp=SafePath $run 'replacement.tmp'
$sha=[Security.Cryptography.SHA256]::Create();try{$key=[BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))).Replace('-','')}finally{$sha.Dispose()}
$mutex=[Threading.Mutex]::new($false,('Local\ResonanceUpdate-'+$key));$ownsMutex=$false
try{$ownsMutex=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$ownsMutex=$true}
if(-not $ownsMutex){$mutex.Dispose();throw 'Another update is already finishing for this installation. Please wait for it to restart.'}
$blocked=$false;$unchanged=0;$lockRetries=0;$processWaits=0
try {
 $ready=Join-Path $run 'ready.json'
 @{pid=$PID;waitingFor=$WaitFor} | ConvertTo-Json -Compress | Set-Content -LiteralPath ($ready+'.tmp') -Encoding UTF8
 Move-Item -LiteralPath ($ready+'.tmp') -Destination $ready -Force
 if($WaitFor -gt 0){$process=Get-Process -Id $WaitFor -ErrorAction SilentlyContinue;if($process){try{if(-not $process.WaitForExit(60000)){throw 'Resonance did not finish closing. Your current version is unchanged.'}}finally{$process.Dispose()}}}
 $lockDeadline=[DateTime]::UtcNow.AddSeconds($LockTimeoutSeconds)
 WaitForAppFiles
 $manifest=Get-Content -LiteralPath (Join-Path $stageRoot 'resonance-update.json') -Raw | ConvertFrom-Json
 if($manifest.product -ne 'resonance-portable' -or $manifest.schema -ne 1){throw 'Invalid staged update.'}
 $changes=[Collections.Generic.List[object]]::new();$seen=@{}
 foreach($file in $manifest.files){
  if(-not(Allowed $file.path) -or $seen.ContainsKey($file.path)){throw 'Unsafe staged update entry.'};$seen[$file.path]=$true
  $source=SafePath $stageRoot $file.path;$target=SafePath $root $file.path
  if((FileHash $source) -ne $file.sha256){throw 'Staged update changed after verification.'}
  if($file.path -eq 'resources/app/config.json' -and (Test-Path -LiteralPath $target)){continue}
  if((Test-Path -LiteralPath $target) -and (RetryLocked {FileHash $target}) -eq $file.sha256){$unchanged++;continue}
  $changes.Add(@{path=$file.path;source=$source;target=$target})
 }
 # Include the installed manifest in the transaction, so rollback restores it too.
 $changes.Add(@{path='resonance-update.json';source=(Join-Path $stageRoot 'resonance-update.json');target=(SafePath $root 'resonance-update.json')})
 $lockDeadline=[DateTime]::UtcNow.AddSeconds($LockTimeoutSeconds)
 foreach($file in $changes){
  if(Test-Path -LiteralPath $file.target){RetryLocked {$probe=[IO.File]::Open($file.target,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None);$probe.Dispose()}}
 }
 foreach($file in $changes){
  $target=$file.target;$saved=SafePath $backup $file.path;$existed=Test-Path -LiteralPath $target
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($saved))|Out-Null
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
  [IO.File]::Copy($file.source,$temp,$true)
  # Replace atomically. A sharing violation leaves the original file intact;
  # only successful replacements belong in the rollback journal.
  RetryLocked {if($existed){[IO.File]::Replace($temp,$target,$saved,$true)}else{[IO.File]::Move($temp,$target)}}
  $applied.Add(@{path=$file.path;existed=$existed})
 }
 $installed=Get-Content -LiteralPath (Join-Path $root 'resources/app/package.json') -Raw | ConvertFrom-Json
 if($installed.version -ne $manifest.version){throw 'Installed app version does not match the update.'}
 @{ok=$true;version=$manifest.version;backup=$backup;changedFiles=$applied.Count;unchangedFiles=$unchanged;lockRetries=$lockRetries;processWaits=$processWaits} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
} catch {
 $problem=$_.Exception.Message;$restoreErrors=@()
 $lockDeadline=[DateTime]::UtcNow.AddSeconds($LockTimeoutSeconds)
 for($i=$applied.Count-1;$i -ge 0;$i--){try{
  $file=$applied[$i];$target=SafePath $root $file.path
  if($file.existed){[IO.File]::Copy((SafePath $backup $file.path),$temp,$true);RetryLocked {[IO.File]::Replace($temp,$target,[NullString]::Value,$true)}}
  else{RetryLocked {[IO.File]::Delete($target)}}
 }catch{$restoreErrors+=$_.Exception.Message}}
 @{ok=$false;error=$problem;reason=$(if($blocked){'files-in-use'}else{'install-failed'});changedFiles=$applied.Count;lockRetries=$lockRetries;processWaits=$processWaits;rollbackErrors=$restoreErrors;backup=$backup} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
} finally {
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}
 if($ownsMutex){$mutex.ReleaseMutex()};$mutex.Dispose()
}
# The helper stays hidden; the player is the interactive window the user requested.
if(-not $NoLaunch){Start-Process -FilePath (Join-Path $root 'Resonance.exe') -ArgumentList '--updated' -WorkingDirectory $root -WindowStyle Normal}
