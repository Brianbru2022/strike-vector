$ErrorActionPreference = 'Stop'
$source = Resolve-Path -LiteralPath 'dist-itch'
$manifestPath = Join-Path $source 'itch-build-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Run pnpm itch:audit before packaging.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$outputDirectory = Join-Path (Resolve-Path -LiteralPath '.') 'release-artifacts\itch-1.2.0-dev.1'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$zipPath = Join-Path $outputDirectory 'iron-kestrel-87-itch-beta.zip'
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $zipPath -CompressionLevel Optimal
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $index = $archive.Entries | Where-Object { $_.FullName -eq 'index.html' }
  if (-not $index) { throw 'Packaged ZIP does not contain index.html at its root.' }
  $unsafe = $archive.Entries | Where-Object { $_.FullName.StartsWith('/') -or $_.FullName.Contains('\\') -or $_.FullName.Split('/') -contains '..' }
  if ($unsafe) { throw "Packaged ZIP contains unsafe or non-portable paths: $($unsafe.FullName -join ', ')" }
  $forbidden = $archive.Entries | Where-Object { $_.FullName -in @('sw.js', 'registerSW.js', 'manifest.webmanifest') }
  if ($forbidden) { throw "Iframe package contains forbidden PWA files: $($forbidden.FullName -join ', ')" }
  $packagedFiles = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith('/') }).Count
  $expectedFiles = @($manifest.files).Count + 1
  if ($packagedFiles -ne $expectedFiles) { throw "Packaged ZIP file count $packagedFiles does not match audited build count $expectedFiles." }
} finally { $archive.Dispose() }
$workspace = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath '.').Path)
$hostDirectory = [System.IO.Path]::GetFullPath((Join-Path $workspace '.dist-itch-host'))
$workspacePrefix = $workspace.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $hostDirectory.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to prepare itch host outside the workspace: $hostDirectory"
}
if (Test-Path -LiteralPath $hostDirectory) { Remove-Item -LiteralPath $hostDirectory -Recurse -Force }
New-Item -ItemType Directory -Path $hostDirectory | Out-Null
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $hostDirectory)
if (-not (Test-Path -LiteralPath (Join-Path $hostDirectory 'index.html'))) {
  throw 'Extracted itch package does not contain index.html at its root.'
}
$stream = [System.IO.File]::OpenRead($zipPath)
try {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { $hash = ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
} finally { $stream.Dispose() }
$package = [ordered]@{
  schemaVersion = 1
  buildId = $manifest.buildId
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  file = [System.IO.Path]::GetFileName($zipPath)
  bytes = (Get-Item -LiteralPath $zipPath).Length
  sha256 = $hash
  indexAtArchiveRoot = $true
  auditedFileCount = @($manifest.files).Count
  packagedFileCount = $packagedFiles
  serviceWorkerEnabled = $false
  browserTestRoot = '.dist-itch-host'
}
$package | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputDirectory 'package-manifest.json') -Encoding utf8
Write-Host "Itch package: $zipPath"
Write-Host "SHA-256: $hash"
