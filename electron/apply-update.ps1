param([Parameter(Mandatory=$true)][string]$Destination,[Parameter(Mandatory=$true)][string]$Stage,[int]$WaitFor=0,[switch]$NoLaunch)
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
try {
 $ready=Join-Path $run 'ready.json'
 @{pid=$PID;waitingFor=$WaitFor} | ConvertTo-Json -Compress | Set-Content -LiteralPath ($ready+'.tmp') -Encoding UTF8
 Move-Item -LiteralPath ($ready+'.tmp') -Destination $ready -Force
 if($WaitFor -gt 0){$process=Get-Process -Id $WaitFor -ErrorAction SilentlyContinue;if($process){Wait-Process -Id $WaitFor -Timeout 60 -ErrorAction Stop}}
 $manifest=Get-Content -LiteralPath (Join-Path $stageRoot 'resonance-update.json') -Raw | ConvertFrom-Json
 if($manifest.product -ne 'resonance-portable' -or $manifest.schema -ne 1){throw 'Invalid staged update.'}
 foreach($file in $manifest.files){
  if(-not(Allowed $file.path)){throw 'Unsafe staged update entry.'}
  $source=SafePath $stageRoot $file.path;$target=SafePath $root $file.path
  if((FileHash $source) -ne $file.sha256){throw 'Staged update changed after verification.'}
  if($file.path -eq 'resources/app/config.json' -and (Test-Path -LiteralPath $target)){continue}
  $saved=SafePath $backup $file.path;$existed=Test-Path -LiteralPath $target
  if($existed){[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($saved))|Out-Null;Copy-Item -LiteralPath $target -Destination $saved}
  $applied.Add(@{path=$file.path;existed=$existed})
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
 }
 $installed=Get-Content -LiteralPath (Join-Path $root 'resources/app/package.json') -Raw | ConvertFrom-Json
 if($installed.version -ne $manifest.version){throw 'Installed app version does not match the update.'}
 Copy-Item -LiteralPath (Join-Path $stageRoot 'resonance-update.json') -Destination (Join-Path $root 'resonance-update.json') -Force
 @{ok=$true;version=$manifest.version;backup=$backup} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
} catch {
 $problem=$_.Exception.Message;$restoreErrors=@()
 for($i=$applied.Count-1;$i -ge 0;$i--){try{$file=$applied[$i];$target=SafePath $root $file.path;if($file.existed){Copy-Item -LiteralPath (SafePath $backup $file.path) -Destination $target -Force}else{Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue}}catch{$restoreErrors+=$_.Exception.Message}}
 @{ok=$false;error=$problem;rollbackErrors=$restoreErrors;backup=$backup} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
}
# The helper stays hidden; the player is the interactive window the user requested.
if(-not $NoLaunch){Start-Process -FilePath (Join-Path $root 'Resonance.exe') -ArgumentList '--updated' -WorkingDirectory $root -WindowStyle Normal}
