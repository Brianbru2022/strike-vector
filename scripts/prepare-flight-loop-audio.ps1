param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $ProjectRoot 'art\source\generated-audio\elevenlabs-sfx-2026-09-25'
$outputRoot = Join-Path $ProjectRoot 'public\assets\audio\elevenlabs'

$cues = @(
  @{
    Name = 'Pegasus idle'; Source = 'pegasus-idle-candidate-03.wav'; Output = 'pegasus-idle-loop-v1.wav'
    Hash = 'B92F65CEE5799B8B2B8FA0599F011BC7386130D9D75D8A1859CA03C0ED4DD9BC'; Duration = 3.25; Crossfade = 0.25; Gain = -2.0
  },
  @{
    Name = 'Pegasus power'; Source = 'pegasus-power-candidate-02.wav'; Output = 'pegasus-power-loop-v1.wav'
    Hash = '3F358B76C17EF9F7AD4954399B567D0DF7743CAE9BCC7C254FF0FA8ED0710F98'; Duration = 1.5; Crossfade = 0.15; Gain = -2.0
  },
  @{
    Name = 'Airframe wind'; Source = 'airframe-wind-candidate-03.wav'; Output = 'airframe-wind-loop-v1.wav'
    Hash = '66EFE338A0C427D5B79D38676976C933B214205130CD3DA192DCA63EAA8BDA3A'; Duration = 3.3; Crossfade = 0.3; Gain = -4.0
  },
  @{
    Name = 'VTOL downwash'; Source = 'vtol-downwash-candidate-02.wav'; Output = 'vtol-downwash-loop-v2.wav'
    Hash = '695BB564A7517D47E3C1D12B152E4CFAE732C598263DEC50E316559E00D19B01'; Duration = 3.3; Crossfade = 0.3; Gain = -5.0
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
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Archived source is missing for $($cue.Name): $source"
  }
  if ((Get-Sha256 $source) -ne $cue.Hash) {
    throw "Archived source hash does not match the approved $($cue.Name) candidate."
  }

  $start = $cue.Crossfade
  $duration = $cue.Duration
  $crossfade = $cue.Crossfade
  $filter = "[0:a]atrim=start=$start`:end=$duration,asetpts=PTS-STARTPTS[body];" +
    "[0:a]atrim=start=0`:end=$crossfade,asetpts=PTS-STARTPTS[head];" +
    "[body][head]acrossfade=d=$crossfade`:c1=tri`:c2=tri," +
    "pan=mono|c0=0.5*c0+0.5*c1,volume=$($cue.Gain)dB,aresample=22050[out]"

  & $ffmpeg.Source -hide_banner -loglevel error -y -i $source `
    -filter_complex $filter -map '[out]' -c:a pcm_s16le $output
  if ($LASTEXITCODE -ne 0) { throw "$($cue.Name) processing failed." }
  Write-Output "Prepared $output"
  Write-Output "SHA256 $(Get-Sha256 $output)"
}
