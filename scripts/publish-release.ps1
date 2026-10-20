param(
 [Parameter(Mandatory=$true)][ValidateSet('pc','android')][string]$Platform,
 [Parameter(Mandatory=$true)][string]$File,
 [Parameter(Mandatory=$true)][string]$Notes,
 [ValidateSet('release','development')][string]$Channel='release',
 [switch]$Publish,
 [switch]$ValidateOnly
)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
if(!$ValidateOnly){
 # A prerelease flag alone does not isolate Android. Development uses a
 # separate tag namespace, checked again after reading the artifact version.
 $branch=& git -C $project symbolic-ref --quiet --short HEAD
 $requiredBranch=if($Channel -eq 'development'){'development'}else{'main'}
 if($LASTEXITCODE -ne 0 -or $branch -ne $requiredBranch){
  throw "The $Channel channel requires source on $requiredBranch. Use -ValidateOnly to check without uploading."
 }
 if(& git -C $project status --porcelain){throw 'Commit the reviewed changes before uploading.'}
 & git -C $project diff --quiet HEAD "origin/$requiredBranch"
 if($LASTEXITCODE -ne 0){throw 'Push the reviewed commit before uploading.'}
}
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
if($Channel -eq 'development'){
 if($version -notmatch '^\d+\.\d+\.\d+-dev\.\d+$'){throw 'Development uploads require an explicit -dev.N version.'}
}elseif($version -match '-dev' -or ($Platform -eq 'pc' -and $version -match '-')){
 throw 'Development builds cannot be published to the release channel.'
}
$expectedName=if($Platform -eq 'pc'){"Resonance-PC-$version-portable.zip"}else{"Resonance-Android-$version.apk"}
if($archive.Name -ne $expectedName){throw "Expected artifact name: $expectedName"}
if($Platform -eq 'pc'){
 # Exercise the installed 1.22.0 updater against the actual archive, including
 # its path allowlist, extraction, lengths and every SHA-256, before any upload.
 $compatibility = & node (Join-Path $PSScriptRoot 'verify-portable-update.mjs') $archive.FullName
 if($LASTEXITCODE -ne 0){throw 'This portable ZIP cannot be installed by existing apps. No release was uploaded.'}
}
$tag=$(if($Channel -eq 'development'){'development-'}else{''})+"$Platform-v$version"
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $archive.FullName).Hash.ToLowerInvariant()
if($ValidateOnly){@{platform=$Platform;version=$version;tag=$tag;file=$archive.Name;bytes=$archive.Length;sha256=$hash} | ConvertTo-Json;return}
$gh=Join-Path $project '.local-tools/github-cli/runtime/bin/gh.exe'
if(!(Test-Path -LiteralPath $gh)){$gh=(Get-Command gh -ErrorAction Stop).Source}
$repoInfo=& $gh repo view $repository --json nameWithOwner,isPrivate | ConvertFrom-Json
if($LASTEXITCODE -ne 0 -or $repoInfo.nameWithOwner -ne $repository){throw 'The Resonance release repository could not be verified.'}
$output=Join-Path $project ('releases/publish-'+$tag)
New-Item -ItemType Directory -Force -Path $output | Out-Null
$hashFile=Join-Path $output 'SHA256SUMS.txt'
[IO.File]::WriteAllText($hashFile,($hash+'  '+$archive.Name+"`n"),[Text.UTF8Encoding]::new($false))
$head=(& git -C $project rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){throw 'Commit the reviewed source first.'}
$arguments=@('release','create',$tag,'--repo',$repository,'--target',$head,'--title',"Resonance $Platform $version",'--notes-file',$notesFile.FullName,'--draft','--latest=false',$archive.FullName,$hashFile)
if($Platform -eq 'android' -or $Channel -eq 'development'){$arguments+='--prerelease'}
& $gh @arguments
if($LASTEXITCODE -ne 0){throw 'Release upload did not finish. Check GitHub for a partial draft before retrying; no assets are overwritten automatically.'}
# GitHub's server-side digest and length must agree before a draft can go live.
# A new draft has no Git tag yet; GitHub's /tags endpoint returns 404.
# Resolve it through gh's authenticated draft lookup, then inspect its ID.
$draft=& $gh release view $tag --repo $repository --json databaseId,isDraft,tagName | ConvertFrom-Json
if($LASTEXITCODE -ne 0 -or !$draft.isDraft -or $draft.tagName -ne $tag -or !$draft.databaseId){throw 'Could not resolve the uploaded draft; nothing was published.'}
$uploaded=& $gh api "repos/$repository/releases/$($draft.databaseId)" | ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Could not inspect the draft; nothing was published.'}
$asset=@($uploaded.assets | Where-Object {$_.name -eq $archive.Name})
if($asset.Count -ne 1 -or $asset[0].state -ne 'uploaded' -or $asset[0].size -ne $archive.Length -or $asset[0].digest -ne "sha256:$hash"){
 throw 'The uploaded asset does not match the local artifact. The release remains a draft.'
}
if($Publish){& $gh release edit $tag --repo $repository --draft=false --latest=false;if($LASTEXITCODE -ne 0){throw 'Upload succeeded but publication failed; inspect the draft before retrying.'}}
& $gh release view $tag --repo $repository --json url,isDraft,tagName,assets
if($LASTEXITCODE -ne 0){throw 'Could not verify the uploaded release.'}
