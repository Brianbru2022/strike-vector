param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $ProjectRoot 'art\source\generated-audio\elevenlabs-sfx-2026-09-25'
$outputRoot = Join-Path $ProjectRoot 'public\assets\audio\elevenlabs'

$cues = @(
  @{
    Name = 'Landing gear cycle'; Source = 'landing-gear-candidate-02.wav'; Output = 'landing-gear-cycle-v1.wav'
    Hash = '381D7E00E14880DD07E891E20AD36DB668C2112AB896C224B8748BE807C8310A'
    Filter = 'atrim=start=0:end=1.18,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.006,afade=t=out:st=1.05:d=0.13,pan=mono|c0=0.5*c0+0.5*c1,volume=-4dB,aresample=22050'
  },
  @{
    Name = 'Compressor stall'; Source = 'compressor-stall-candidate-01.wav'; Output = 'compressor-stall-v1.wav'
    Hash = '77640FE43B9463A9F1ABCF7D2D34F3B022A299A933880A27E5B3468F3C098914'
    Filter = 'atrim=start=0:end=1.36,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.005,afade=t=out:st=1.25:d=0.11,pan=mono|c0=0.5*c0+0.5*c1,volume=-3dB,aresample=22050'
  },
  @{
    Name = 'ADEN cannon burst'; Source = 'aden-cannon-candidate-04.wav'; Output = 'aden-cannon-v2.wav'
    Hash = '5733D66204B306C80A235DCFAAC16F3D8BE20BD24EB41DE9A2B99C031FCD9CD8'
    Filter = 'atrim=start=0.38:end=1.56,asetpts=PTS-STARTPTS,atempo=1.3,afade=t=in:st=0:d=0.005,afade=t=out:st=0.82:d=0.088,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Sidewinder rail launch'; Source = 'sidewinder-launch-candidate-01.wav'; Output = 'sidewinder-launch-v2.wav'
    Hash = 'AFDB8D2F3196B2294B84C682DE6FFA23C26F4EBD28F5FBF5F38F62E0BA94C1C3'
    Filter = 'atrim=start=0.4:end=1.71,asetpts=PTS-STARTPTS,atempo=1.09,afade=t=in:st=0:d=0.005,afade=t=out:st=1.1:d=0.102,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  }
)

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return (($sha.ComputeHash($stream) | ForEach-Object { $_.ToString('x2') }) -join '').ToUpperInvariant() }
    finally { $sha.Dispose() }
  }
  finally { $stream.Dispose() }
}

$ffmpeg = Get-Command ffmpeg -ErrorAction Stop
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

foreach ($cue in $cues) {
  $source = Join-Path $sourceRoot $cue.Source
  $output = Join-Path $outputRoot $cue.Output
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Archived source is missing for $($cue.Name): $source" }
  if ((Get-Sha256 $source) -ne $cue.Hash) { throw "Archived source hash does not match the approved $($cue.Name) candidate." }
  & $ffmpeg.Source -hide_banner -loglevel error -y -i $source -af $cue.Filter -ac 1 -c:a pcm_s16le $output
  if ($LASTEXITCODE -ne 0) { throw "$($cue.Name) processing failed." }
  Write-Output "Prepared $output"
  Write-Output "SHA256 $(Get-Sha256 $output)"
}

$damagedSource = Join-Path $sourceRoot 'damaged-engine-candidate-02.wav'
$damagedOutput = Join-Path $outputRoot 'engine-damaged-loop-v1.wav'
$damagedHash = 'AAECCC3D7C6170F6B80111054E5270932842613917E79E2259EFB94A9C995973'
if (-not (Test-Path -LiteralPath $damagedSource -PathType Leaf)) { throw "Archived damaged-engine source is missing: $damagedSource" }
if ((Get-Sha256 $damagedSource) -ne $damagedHash) { throw 'Archived damaged-engine source does not match the approved candidate hash.' }
$damagedFilter = '[0:a]atrim=start=0.3:end=4.3,asetpts=PTS-STARTPTS[body];[0:a]atrim=start=0:end=0.3,asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=0.3:c1=tri:c2=tri,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050[out]'
& $ffmpeg.Source -hide_banner -loglevel error -y -i $damagedSource -filter_complex $damagedFilter -map '[out]' -c:a pcm_s16le $damagedOutput
if ($LASTEXITCODE -ne 0) { throw 'Damaged-engine loop processing failed.' }
Write-Output "Prepared $damagedOutput"
Write-Output "SHA256 $(Get-Sha256 $damagedOutput)"
