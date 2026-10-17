param([Parameter(Mandatory=$true)][string]$Archive,[Parameter(Mandatory=$true)][string]$Stage)
$ErrorActionPreference='Stop'
function FileHash([string]$file){$stream=[IO.File]::OpenRead($file);$sha=[Security.Cryptography.SHA256]::Create();try{return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$sha.Dispose();$stream.Dispose()}}
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Allowed([string]$name) {
 if($name -match '(^|/)\.\.?(/|$)|[:\\]' -or $name.StartsWith('/')) { return $false }
 if($name -match '^(locales/[^/]+\.pak|resources/app/(public|electron|node_modules|tools)/.+)$') { return $name -notmatch '(^|/)(data|\.updates)(/|$)' }
 return $name -match '^(Resonance\.exe|chrome_[12]00_percent\.pak|d3dcompiler_47\.dll|dxcompiler\.dll|dxil\.dll|ffmpeg\.dll|icudtl\.dat|LICENSE|LICENSES\.chromium\.html|resources\.pak|snapshot_blob\.bin|v8_context_snapshot\.bin|version|vk_swiftshader_icd\.json|vk_swiftshader\.dll|vulkan-1\.dll|portable\.flag|START HERE\.txt|resources/app/[\w.-]+\.(mjs|json))$'
}
$stageRoot=[IO.Path]::GetFullPath($Stage)
if(Test-Path -LiteralPath $stageRoot){throw 'Update staging directory already exists.'}
$zip=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($Archive))
try {
 $entries=@{}
 foreach($entry in $zip.Entries){$name=$entry.FullName.Replace('\','/');if($name.EndsWith('/')){continue};if($entries.ContainsKey($name)){throw 'Duplicate ZIP entry.'};$entries[$name]=$entry}
 $manifests=@($entries.Values | Where-Object {$_.FullName.Replace('\','/') -match '(^|/)resonance-update\.json$'})
 if($manifests.Count -ne 1 -or $manifests[0].Length -gt 6000000){throw 'Choose a Resonance portable update ZIP.'}
 $manifestEntry=$manifests[0];$manifestName=$manifestEntry.FullName.Replace('\','/');$prefix=$manifestName.Substring(0,$manifestName.Length-'resonance-update.json'.Length)
 $reader=[IO.StreamReader]::new($manifestEntry.Open());try{$manifest=$reader.ReadToEnd() | ConvertFrom-Json}finally{$reader.Dispose()}
 if($manifest.product -ne 'resonance-portable' -or $manifest.schema -ne 1 -or $manifest.version -notmatch '^\d+\.\d+\.\d+([-.][\w.]+)?$'){throw 'This is not a supported Resonance update.'}
 $files=@($manifest.files);if($files.Count -lt 10 -or $files.Count -gt 50000){throw 'Invalid update contents.'}
 $seen=@{};$total=0L
 foreach($file in $files){
  if(-not(Allowed $file.path) -or $seen.ContainsKey($file.path) -or $file.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or $file.bytes -lt 0 -or $file.bytes -gt 1000000000){throw 'Unsafe or invalid update entry.'}
  $seen[$file.path]=$true;$total+=$file.bytes
  $entry=$entries[$prefix+$file.path]
  if($null -eq $entry -or $entry.Length -ne $file.bytes -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw "Incomplete update: $($file.path)"}
 }
 if($total -gt 4000000000 -or -not $seen.ContainsKey('Resonance.exe') -or -not $seen.ContainsKey('resources/app/package.json') -or -not $seen.ContainsKey('portable.flag')){throw 'Incomplete or oversized update.'}
 # Every regular entry must belong to the integrity manifest; no hidden payload.
 foreach($name in $entries.Keys){
  if($name -eq $manifestName){continue}
  if(-not $name.StartsWith($prefix,[StringComparison]::Ordinal) -or -not $seen.ContainsKey($name.Substring($prefix.Length))){throw 'Unexpected file in update ZIP.'}
 }
 $drive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($stageRoot));if($drive.AvailableFreeSpace -lt $total*2+200000000){throw 'More free disk space is needed to stage and back up this update.'}
 [IO.Directory]::CreateDirectory($stageRoot) | Out-Null
 foreach($file in $files){
  $target=[IO.Path]::GetFullPath((Join-Path $stageRoot $file.path))
  if(-not $target.StartsWith($stageRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid update destination.'}
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
  $source=$entries[$prefix+$file.path].Open();$output=[IO.File]::Create($target)
  try{$source.CopyTo($output)}finally{$source.Dispose();$output.Dispose()}
  if((FileHash $target) -ne $file.sha256){throw "Update checksum mismatch: $($file.path)"}
 }
 $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $stageRoot 'resonance-update.json') -Encoding UTF8
 @{version=$manifest.version;files=$files.Count;bytes=$total} | ConvertTo-Json -Compress
} finally {$zip.Dispose()}
