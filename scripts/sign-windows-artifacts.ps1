$ErrorActionPreference = 'Stop'
$certificate = $env:IRON_KESTREL_SIGNING_CERT_SHA1
if ([string]::IsNullOrWhiteSpace($certificate)) {
  throw 'IRON_KESTREL_SIGNING_CERT_SHA1 is required. It identifies the Windows code-signing certificate without exposing private key material.'
}
$signTool = Get-Command signtool.exe -ErrorAction Stop
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseSource = Get-Content -LiteralPath (Join-Path $projectRoot 'src\game\Release.ts') -Raw
if ($releaseSource -notmatch "version:\s*'([^']+)'") { throw 'Unable to read the current release version.' }
$artifactRoot = Join-Path $projectRoot "release-artifacts\windows-$($Matches[1])"
$manifestPath = Join-Path $artifactRoot 'release-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'The current Windows release manifest is missing.' }
$artifacts = Get-ChildItem -LiteralPath $artifactRoot -Recurse -File | Where-Object { $_.Extension -in '.exe', '.msi' }
if (-not $artifacts) { throw 'No installer or portable executable artefacts were found.' }
foreach ($artifact in $artifacts) {
  & $signTool.Source sign /sha1 $certificate /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $artifact.FullName
  if ($LASTEXITCODE -ne 0) { throw "Signing failed for $($artifact.Name)." }
  & $signTool.Source verify /pa /v $artifact.FullName
  if ($LASTEXITCODE -ne 0) { throw "Signature verification failed for $($artifact.Name)." }
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach ($entry in $manifest.artefacts) {
  $file = Join-Path $artifactRoot ($entry.file -replace '/', '\')
  if (-not (Test-Path -LiteralPath $file)) { throw "Manifest artefact is missing: $($entry.file)" }
  $entry.bytes = (Get-Item -LiteralPath $file).Length
  $entry.sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest.signed = $true
$manifest | Add-Member -NotePropertyName signedAt -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
$manifest | Add-Member -NotePropertyName certificateReference -NotePropertyValue $certificate -Force
$manifest | Add-Member -NotePropertyName timestampServer -NotePropertyValue 'http://timestamp.digicert.com' -Force
$manifest.signingNote = 'Authenticode signatures and SHA-256 checksums verified after signing.'
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Host "Signed and verified $($artifacts.Count) Windows artefact(s); release manifest updated."
