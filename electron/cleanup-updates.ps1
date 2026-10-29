param([Parameter(Mandatory=$true)][string]$Destination,[switch]$Apply)
$ErrorActionPreference='Stop'
# Run off the Electron thread. Only completed installer work is disposable;
# a live helper, an interrupted rollback or an unknown folder is never removed.
$root=[IO.Path]::GetFullPath($Destination).TrimEnd('\')
$updates=Join-Path $root '.updates'
function NoLinks([string]$target){
 $item=Get-Item -LiteralPath $target -Force
 while($item){if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected update path.'};$item=$item.Parent}
}
# Match github-releases.cjs: numeric core, dev < preview < stable, then the
# numeric prerelease revision. System.Version cannot read development builds.
function ReleaseVersion([string]$value){
 if($value -cnotmatch '^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-(dev|preview)(?:\.([0-9]+))?)?$'){throw 'Unsupported release version.'}
 $parts=[long[]]@(0,0,0,2,0)
 foreach($index in @(0,1,2,4)){
  $text=$Matches[($index+1)]
  if($index -eq 4 -and -not $text){continue}
  $number=0L
  if(-not [long]::TryParse($text,[ref]$number) -or $number -gt 9007199254740991){throw 'Unsupported release version.'}
  $parts[$index]=$number
 }
 if($Matches[4] -eq 'dev'){$parts[3]=0}elseif($Matches[4] -eq 'preview'){$parts[3]=1}
 return [pscustomobject]@{parts=$parts}
}
function CompareReleaseVersions($a,$b){
 for($i=0;$i -lt 5;$i++){if($a.parts[$i] -lt $b.parts[$i]){return -1};if($a.parts[$i] -gt $b.parts[$i]){return 1}}
 return 0
}
NoLinks $root
if(-not(Test-Path -LiteralPath (Join-Path $root 'portable.flag'))){throw 'Not a portable installation.'}
$version=ReleaseVersion (Get-Content -LiteralPath (Join-Path $root 'resources/app/package.json') -Raw|ConvertFrom-Json).version
if(-not(Test-Path -LiteralPath $updates)){@{removed=@();kept=@();bytes=0}|ConvertTo-Json;exit}
NoLinks $updates
function ReadJson([string]$file){if(Test-Path -LiteralPath $file){return Get-Content -LiteralPath $file -Raw|ConvertFrom-Json};return $null}
function Alive($id,[string]$marker){
 if(-not $id){return $false}
 $process=Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue
 if(-not $process){return $false}
 # Windows reuses PIDs. A process born after this marker is not that installer.
 $started=$null
 try{$started=$process.StartTime}catch{}
 if(-not $started){
  # Protected processes can hide StartTime while CIM still exposes CreationDate.
  try{$started=(Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$id)" -ErrorAction Stop).CreationDate}catch{}
 }
 if(-not $started){return $true}
 try{return $started.ToUniversalTime() -le (Get-Item -LiteralPath $marker).LastWriteTimeUtc.AddSeconds(2)}catch{return $true}
}
function SafeTree([string]$target){
 $resolved=[IO.Path]::GetFullPath($target)
 if(-not $resolved.StartsWith($updates+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Cleanup escaped the update folder.'}
 NoLinks $resolved
 $pending=[Collections.Generic.Queue[string]]::new();$pending.Enqueue($resolved);$bytes=0L
 while($pending.Count){
  foreach($entry in Get-ChildItem -LiteralPath $pending.Dequeue() -Force){
   if($entry.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected update content.'}
   if($entry.Name -match '^(data|\.git|\.updates|\.private|cookies|library\.sqlite.*)$' -or $entry.Extension -match '^\.(jks|keystore|p12|pem)$'){throw 'Personal or unexpected update content.'}
   if($entry.PSIsContainer){$pending.Enqueue($entry.FullName)}else{$bytes+=$entry.Length}
  }
 }
 return $bytes
}
$runs=@();$kept=[Collections.Generic.List[object]]::new()
foreach($entry in Get-ChildItem -LiteralPath $updates -Force){
 if(-not $entry.PSIsContainer -or $entry.Name -notmatch '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'){continue}
 try{
  NoLinks $entry.FullName
  $ready=ReadJson (Join-Path $entry.FullName 'ready.json')
  $owner=ReadJson (Join-Path $entry.FullName 'owner.json')
  $result=ReadJson (Join-Path $entry.FullName 'result.json')
  if((Alive $ready.pid (Join-Path $entry.FullName 'ready.json')) -or (Alive $owner.pid (Join-Path $entry.FullName 'owner.json'))){$kept.Add(@{path=$entry.FullName;reason='Active installer'});continue}
  $children=@(Get-ChildItem -LiteralPath $entry.FullName -Force)
  if(@($children|Where-Object {$_.Name -notin @('backup','payload','apply-update.ps1','ready.json','result.json','owner.json')}).Count){throw 'Unrecognized update files.'}
  if($result.ok -eq $true){
   $completedVersion=ReleaseVersion $result.version
   if((CompareReleaseVersions $completedVersion $version) -gt 0){$kept.Add(@{path=$entry.FullName;reason='Newer than installed version'});continue}
   $runs+=[pscustomobject]@{path=$entry.FullName;version=$completedVersion;time=(Get-Item -LiteralPath (Join-Path $entry.FullName 'result.json')).LastWriteTimeUtc;success=$true}
  }elseif(-not $children.Count -or ($owner.phase -eq 'discarded' -and -not(Test-Path -LiteralPath (Join-Path $entry.FullName 'backup')))){
   $runs+=[pscustomobject]@{path=$entry.FullName;success=$false}
  }else{$kept.Add(@{path=$entry.FullName;reason='Pending, failed or interrupted update'})}
 }catch{$kept.Add(@{path=$entry.FullName;reason=$_.Exception.Message})}
}
$latest=$runs|Where-Object {$_.success}|Sort-Object -Property @{Expression={$_.version.parts[0]};Descending=$true},@{Expression={$_.version.parts[1]};Descending=$true},@{Expression={$_.version.parts[2]};Descending=$true},@{Expression={$_.version.parts[3]};Descending=$true},@{Expression={$_.version.parts[4]};Descending=$true},@{Expression='time';Descending=$true}|Select-Object -First 1
$removed=[Collections.Generic.List[object]]::new();$total=0L
foreach($run in $runs){
 $target=$run.path
 if($latest -and $run.path -eq $latest.path){
  $kept.Add(@{path=(Join-Path $target 'backup');reason='Latest rollback backup'})
  $target=Join-Path $target 'payload'
 }
 if(-not(Test-Path -LiteralPath $target)){continue}
 try{
  # Check liveness again immediately before walking/removing; never delete the run
  # a new helper has just claimed, even if the first inventory saw it as complete.
  $ready=ReadJson (Join-Path $run.path 'ready.json');$owner=ReadJson (Join-Path $run.path 'owner.json')
  if((Alive $ready.pid (Join-Path $run.path 'ready.json')) -or (Alive $owner.pid (Join-Path $run.path 'owner.json'))){throw 'Installer is using these files.'}
  $bytes=SafeTree $target
  if($Apply){Remove-Item -LiteralPath $target -Recurse -Force}
  $total+=$bytes;$removed.Add(@{path=$target;bytes=$bytes})
 }catch{$kept.Add(@{path=$target;reason=$_.Exception.Message})}
}
@{applied=[bool]$Apply;bytes=$total;removed=@($removed.ToArray());kept=@($kept.ToArray())}|ConvertTo-Json -Depth 5
