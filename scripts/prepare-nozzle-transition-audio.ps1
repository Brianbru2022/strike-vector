param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$source = Join-Path $ProjectRoot 'art\source\generated-audio\elevenlabs-sfx-2026-09-25\nozzle-transition-candidate-03.wav'
$outputDirectory = Join-Path $ProjectRoot 'public\assets\audio\elevenlabs'
$output = Join-Path $outputDirectory 'nozzle-transition-v1.wav'
$expectedSourceHash = 'E6B0DDD4C83B75ED33A523CF23C401EB4C8D0B07062DD1D8B8DD904A1B430024'

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return (($sha.ComputeHash($stream) | ForEach-Object { $_.ToString('x2') }) -join '').ToUpperInvariant() }
    finally { $sha.Dispose() }
  }
  finally { $stream.Dispose() }
}

if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
  throw "Archived nozzle-transition source is missing: $source"
}
if ((Get-Sha256 $source) -ne $expectedSourceHash) {
  throw 'Archived nozzle-transition source does not match the approved candidate hash.'
}
$ffmpeg = Get-Command ffmpeg -ErrorAction Stop
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

& $ffmpeg.Source -hide_banner -loglevel error -y -i $source `
  -af 'atempo=1.425,apad,atrim=0:1.2,afade=t=in:st=0:d=0.012,afade=t=out:st=1.11:d=0.09,volume=-2dB,aresample=22050' `
  -ac 1 -c:a pcm_s16le $output
if ($LASTEXITCODE -ne 0) { throw 'Nozzle-transition processing failed.' }

$hash = Get-Sha256 $output
Write-Output "Prepared $output"
Write-Output "SHA256 $hash"
