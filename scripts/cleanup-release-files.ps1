param([Parameter(Mandatory=$true)][string]$Plan)
$ErrorActionPreference='Stop'
# Use this shell's built-in modules even when launched from PowerShell 7/Node.
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility') -Force
Import-Module (Join-Path $PSHOME 'Modules\CimCmdlets') -Force
$root=(Get-Item -LiteralPath (Split-Path $PSScriptRoot -Parent)).FullName.TrimEnd('\')
$report=Join-Path $root '.private\release-cleanup'
$planPath=[IO.Path]::GetFullPath($Plan)
if($planPath -ne (Join-Path $report 'plan.json')){throw 'Use the verified release cleanup plan.'}
$state=Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json
if($state.schema -ne 1 -or $state.root.TrimEnd('\','/') -ne $root){throw 'Cleanup plan does not belong to this workspace.'}
$age=[DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($state.createdAt)
if($age.TotalMinutes -lt -1 -or $age.TotalMinutes -gt 60){throw 'Cleanup plan expired. Verify the releases again.'}

function Resolve-WorkspacePath([string]$relative){
 if([IO.Path]::IsPathRooted($relative)){throw "Expected a workspace-relative path: $relative"}
 $full=[IO.Path]::GetFullPath((Join-Path $root $relative))
 if(!$full.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Outside workspace: $relative"}
 # Check each ancestor, not only the final directory, before any recursive scan/removal.
 $cursor=$full
 while($cursor -ne $root){
  if(Test-Path -LiteralPath $cursor){if((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked path: $relative"}}
  $cursor=Split-Path $cursor -Parent
 }
 if((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked workspace root.'}
 return $full
}
function Overlaps([string]$a,[string]$b){return $a -eq $b -or $a.StartsWith($b+'\',[StringComparison]::OrdinalIgnoreCase) -or $b.StartsWith($a+'\',[StringComparison]::OrdinalIgnoreCase)}
$protected=@('.git','data','checkpoints','desktop-build','skybox','.private','public','electron','scripts','tests','node_modules','tools','.local-tools','android\app\src','android\shared','android\web','android\.toolchain','config.json','CHECKPOINT.json','Launch Resonance.cmd','Resonance.lnk') | ForEach-Object {Join-Path $root $_}
$checkpoint=Join-Path $root 'CHECKPOINT.json'
if(Test-Path -LiteralPath $checkpoint){
 $saved=Get-Content -LiteralPath $checkpoint -Raw | ConvertFrom-Json
 foreach($key in @('directory','source','portable','manifest','restoreNotes')){if($saved.$key){$protected+=Resolve-WorkspacePath $saved.$key}}
}
foreach($p in $state.preserved){$protected+=Resolve-WorkspacePath $p}
$tracked=@(& git -C $root ls-files)
if($LASTEXITCODE -ne 0){throw 'Cannot verify tracked source files; no cleanup.'}
$protected+=@($tracked | ForEach-Object {Join-Path $root $_})
foreach($platform in @('pc','android')){
 $kept=@($state.keep | Where-Object {$_.tag -like "$platform-v*"})
 if($kept.Count -lt 1 -or $kept.Count -gt 2){throw 'Expected one or two retained releases per platform.'}
 foreach($release in $kept){
  $file=Resolve-WorkspacePath $release.path
  $protected+=$file
  # A missing previous archive is allowed (e.g. the one-time cleanup preceded this policy).
  # Never remove the only remaining extracted copy of that version in the planner.
  if(!(Test-Path -LiteralPath $file)){if($release -eq $kept[0]){throw 'Latest download is missing.'};continue}
  if((Get-Item -LiteralPath $file).Length -ne $release.bytes -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $release.sha256){throw "Retained download changed: $($release.path)"}
 }
}
$processes=@(Get-CimInstance Win32_Process)
$result=[Collections.Generic.List[object]]::new()
$approved=[Collections.Generic.List[object]]::new()
$v='\d+\.\d+\.\d+(?:-preview(?:\.\d+)?)?'
$fixtures='identity|atmosphere|companion-api|constellation|archive|api|display-api|fresh-checkout|frontend-assets|genre-test|github-update|genre-remix|genre-outage|genre-credit|history|catalogue|level-library|metadata-review|lyrics|discovery|refinement-api|order|portable-update|song-analysis|normalized-audio|profile-cache|sources|spotify-source|spotify-api|storage|storage-api|sync-api|desktop-next-data|refinement-111-data|portable-smoke-data'
foreach($relative in $state.targets){
 $allowed=$relative -match '^(desktop-staging|android/app/build|android/build|test-output/release-work)$' -or
  $relative -match "^releases/Resonance-PC-$v-portable\.zip$" -or $relative -match "^android/releases/Resonance-Android-$v\.apk$" -or
  $relative -match "^releases/publish-(pc|android)-v$v$" -or $relative -match '^releases/Resonance-Portable-\d{4}-\d{2}-\d{2}T[\d-]+Z(?:\.zip)?$' -or
  $relative -match "^test-output/(?:$fixtures)-[A-Za-z0-9]{6}$" -or
  $relative -match '^test-output/(?:(?:constellation|ux|mobile-repair)[\w-]*-release(?:-[\w-]+)?|(?:verify-|startup-artifacts-)[\w-]+|portable-full-install|portable-online-update-[a-f0-9-]{36}|(?:android-mobile-ux|android-shuffle|android-visual-update|camera-zoom|desktop-next|kaleidoscope|refinement-111|sona-emblem|window-check)-profile)$'
 if(!$allowed){throw "Unrecognized cleanup target: $relative"}
 $full=Resolve-WorkspacePath $relative
 foreach($p in $protected){if(Overlaps $full $p){throw "Protected path: $relative"}}
 if(!(Test-Path -LiteralPath $full)){continue}
 $reason=$null
 foreach($process in $processes){
  $command=([string]$process.CommandLine).Replace('/','\')
  if(($process.ExecutablePath -and (Overlaps $full $process.ExecutablePath)) -or $command.IndexOf($full,[StringComparison]::OrdinalIgnoreCase) -ge 0){$reason='In use by a running process';break}
 }
 $item=Get-Item -LiteralPath $full -Force
 $contents=@($item)
 if($item.PSIsContainer){$contents+=@(Get-ChildItem -LiteralPath $full -Force -Recurse)}
 if(@($contents | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}).Count){$reason='Contains a filesystem link'}
 if(@($contents | Where-Object {$_.Name -match '\.(jks|keystore|p12|pfx|key|pem)$|^cookies'}).Count){$reason='Contains private credentials or signing material'}
 if($relative -match '^(releases/Resonance-Portable-|desktop-staging$)'){
  if(@($contents | Where-Object {$_.Name -in @('data','.updates') -or $_.Name -match '\.(sqlite|db)(-|$)'}).Count){$reason='Used portable installation; personal data retained'}
  foreach($config in @($contents | Where-Object {$_.Name -eq 'config.json'})){
   try{$value=Get-Content -LiteralPath $config.FullName -Raw | ConvertFrom-Json;if(@($value.sources).Count -gt 0){$reason='Personal music sources in portable installation'}}catch{$reason='Unrecognized portable configuration'}
  }
 }
 if($reason){$result.Add(@{path=$relative;status='kept';reason=$reason});continue}
 $bytes=($contents | Where-Object {!$_.PSIsContainer} | Measure-Object -Property Length -Sum).Sum
 $approved.Add(@{path=$relative;full=$full;bytes=[long]$bytes})
}
# All targets are validated before any removal; latest.json must keep pointing to a retained ZIP.
if($state.latest){
 $folder=[IO.Path]::GetFullPath($state.latest.folder);$zip=[IO.Path]::GetFullPath($state.latest.zip)
 if($folder -notin $protected -or $zip -notin $protected -or !(Test-Path -LiteralPath $folder) -or !(Test-Path -LiteralPath $zip)){throw 'Invalid retained portable paths.'}
 [IO.File]::WriteAllText((Join-Path $root 'releases\latest.json'),($state.latest | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
foreach($target in $approved){
 try{
  # Re-resolve immediately before deletion. No commands are constructed from paths.
  $full=Resolve-WorkspacePath $target.path
  Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction Stop
  $result.Add(@{path=$target.path;status='removed';bytes=$target.bytes})
 }catch{$result.Add(@{path=$target.path;status='kept';reason=$_.Exception.Message})}
}
$freed=0L
foreach($entry in $result){if($entry.status -eq 'removed'){$freed+=$entry.bytes}}
$summary=@{at=[DateTimeOffset]::UtcNow.ToString('o');keep=$state.keep;results=@($result);freedBytes=$freed}
[IO.File]::WriteAllText((Join-Path $report 'result.json'),($summary | ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false))
Write-Output ("Release cleanup: {0:N2} GB removed. Latest two platform releases and checkpoint protected." -f ($summary.freedBytes/1e9))
$skipped=@($result | Where-Object {$_.status -eq 'kept'})
if($skipped.Count){$skipped | ForEach-Object {Write-Warning ("Kept {0}: {1}" -f $_.path,$_.reason)};exit 2}
