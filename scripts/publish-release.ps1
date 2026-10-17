param(
 [Parameter(Mandatory=$true)][ValidateSet('pc','android')][string]$Platform,
 [Parameter(Mandatory=$true)][string]$File,
 [Parameter(Mandatory=$true)][string]$Notes,
 [switch]$Publish,
 [switch]$ValidateOnly
)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$archive=Get-Item -LiteralPath $File
$notesFile=Get-Item -LiteralPath $Notes
$repository='HyneKro/resonance'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($archive.FullName)
try{
 $entries=@{};foreach($item in $zip.Entries){$entries[$item.FullName.Replace('\','/')]=$item}
 if($Platform -eq 'pc'){
  if($archive.Extension -ne '.zip'){throw 'Choose a clean Windows portable ZIP.'}
  $entry=@($zip.Entries | Where-Object { $_.FullName.Replace('\','/') -match '(^|/)resonance-update.json$' })
  if($entry.Count -ne 1){throw 'Portable update manifest missing or ambiguous.'}
  $reader=[IO.StreamReader]::new($entry[0].Open());try{$manifest=$reader.ReadToEnd() | ConvertFrom-Json}finally{$reader.Dispose()}
  $version=$manifest.version
  if($manifest.product -ne 'resonance-portable' -or $manifest.schema -ne 1){throw 'Unsupported portable update.'}
  $prefix=$entry[0].FullName.Replace('\','/').Substring(0,$entry[0].FullName.Length-'resonance-update.json'.Length)
  $configEntry=$entries[$prefix+'resources/app/config.json']
  if(!$configEntry){throw 'Clean source configuration missing.'}
  $reader=[IO.StreamReader]::new($configEntry.Open());try{$config=$reader.ReadToEnd() | ConvertFrom-Json}finally{$reader.Dispose()}
  if(@($config.sources).Count -ne 0 -or @($config.psobject.Properties.Name | Where-Object {$_ -notin @('sources','downloadFormat','autoEnrich','autoGenres')}).Count){throw 'This archive contains personalized configuration.'}
  foreach($name in $entries.Keys){if($name -match '(^|/)(data|\.updates|\.git)(/|$)|cookies|\.(sqlite|db|jks|keystore|pem|key)$'){throw 'Personal data or credentials found in portable archive.'}}
 }else{
  if($archive.Name -notmatch '^Resonance-Android-(\d+\.\d+\.\d+(?:-[\w.]+)?)\.apk$'){throw 'Choose a versioned Resonance Android APK.'}
  $version=$Matches[1]
  if(!$zip.GetEntry('AndroidManifest.xml')){throw 'Not an Android package.'}
 }
}finally{$zip.Dispose()}
if($version -notmatch '^\d+\.\d+\.\d+(?:-[\w.]+)?$'){throw 'Invalid release version.'}
$tag="$Platform-v$version"
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $archive.FullName).Hash.ToLowerInvariant()
if($ValidateOnly){@{platform=$Platform;version=$version;tag=$tag;file=$archive.Name;bytes=$archive.Length;sha256=$hash} | ConvertTo-Json;return}
$gh=Join-Path $project '.local-tools/github-cli/runtime/bin/gh.exe'
if(!(Test-Path -LiteralPath $gh)){$gh=(Get-Command gh -ErrorAction Stop).Source}
$repoInfo=& $gh repo view $repository --json nameWithOwner,isPrivate | ConvertFrom-Json
if($LASTEXITCODE -ne 0 -or !$repoInfo.isPrivate -or $repoInfo.nameWithOwner -ne $repository){throw 'The private Resonance repository could not be verified.'}
$output=Join-Path $project ('releases/publish-'+$tag)
New-Item -ItemType Directory -Force -Path $output | Out-Null
$hashFile=Join-Path $output 'SHA256SUMS.txt'
[IO.File]::WriteAllText($hashFile,($hash+'  '+$archive.Name+"`n"),[Text.UTF8Encoding]::new($false))
$head=(& git -C $project rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){throw 'Commit the reviewed source first.'}
$arguments=@('release','create',$tag,'--repo',$repository,'--target',$head,'--title',"Resonance $Platform $version",'--notes-file',$notesFile.FullName,'--draft','--latest=false',$archive.FullName,$hashFile)
if($Platform -eq 'android'){$arguments+='--prerelease'}
& $gh @arguments
if($LASTEXITCODE -ne 0){throw 'Release upload did not finish. Check GitHub for a partial draft before retrying; no assets are overwritten automatically.'}
if($Publish){& $gh release edit $tag --repo $repository --draft=false --latest=false;if($LASTEXITCODE -ne 0){throw 'Upload succeeded but publication failed; the release remains a draft.'}}
& $gh release view $tag --repo $repository --json url,isDraft,tagName,assets
if($LASTEXITCODE -ne 0){throw 'Could not verify the uploaded release.'}
