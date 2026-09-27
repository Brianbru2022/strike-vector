param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$elevenLabsRoot = Join-Path $ProjectRoot 'art\source\generated-audio\elevenlabs-sfx-2026-09-25'
$elevenLabsOutput = Join-Path $ProjectRoot 'public\assets\audio\elevenlabs'

$cues = @(
  @{
    Name = 'Ship sinking'; Root = $elevenLabsRoot; Source = 'ship-sinking-candidate-01.wav'; OutputRoot = $elevenLabsOutput; Output = 'ship-sinking-v1.wav'
    Hash = '3E61FF615A97DC319FDD9E47C623753F86EBC698C049EB8CE8AF4E34C090E446'
    Filter = 'atrim=start=0:end=5.6,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.01,afade=t=out:st=5.15:d=0.45,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Master damage warning'; Root = $elevenLabsRoot; Source = 'master-damage-candidate-02.wav'; OutputRoot = $elevenLabsOutput; Output = 'master-damage-warning-v1.wav'
    Hash = 'BFFDC4AD907414CE388D55E87684F09E97E6D967A4D776BC7C4D0C213244658E'
    Filter = 'atrim=start=0:end=0.7,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=0.65:d=0.05,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Radio squelch opening'; Root = $elevenLabsRoot; Source = 'radio-squelch-in-candidate-02.wav'; OutputRoot = $elevenLabsOutput; Output = 'radio-squelch-in-v1.wav'
    Hash = '1BEDD1B0C9C148D426FCDDE1E6C02E1B4998944AB127CAA6CECA77CF88007CE5'
    Filter = 'atrim=start=0:end=0.43,asetpts=PTS-STARTPTS,atempo=2,atempo=1.194444,afade=t=in:st=0:d=0.002,afade=t=out:st=0.16:d=0.02,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Radio squelch closing'; Root = $elevenLabsRoot; Source = 'radio-squelch-out-candidate-04.wav'; OutputRoot = $elevenLabsOutput; Output = 'radio-squelch-out-v1.wav'
    Hash = 'BEA4421B75CD8E5235B3551B023D23800011EBF853BEE0BAD57FD6F38F5201E3'
    Filter = 'atrim=start=0:end=0.327,asetpts=PTS-STARTPTS,atempo=1.635,afade=t=in:st=0:d=0.002,afade=t=out:st=0.18:d=0.02,pan=mono|c0=0.5*c0+0.5*c1,volume=-6dB,aresample=22050'
  },
  @{
    Name = 'UI confirmation'; Root = $elevenLabsRoot; Source = 'ui-confirm-candidate-03.wav'; OutputRoot = $elevenLabsOutput; Output = 'ui-confirm-v1.wav'
    Hash = 'EE135641937A02953B57144E915880B034E019B7CAADD059101D1DF7D21DFCAE'
    Filter = 'atrim=start=0:end=0.6,asetpts=PTS-STARTPTS,atempo=2,atempo=1.875,afade=t=in:st=0:d=0.002,afade=t=out:st=0.14:d=0.02,pan=mono|c0=0.5*c0+0.5*c1,volume=-2dB,aresample=22050'
  },
  @{
    Name = 'UI cancel'; Root = $elevenLabsRoot; Source = 'ui-cancel-candidate-03.wav'; OutputRoot = $elevenLabsOutput; Output = 'ui-cancel-v1.wav'
    Hash = '62B33D2C9672DC67B2305AD25006BFFDE6339BD703B02948F0AA14D1B3774232'
    Filter = 'atrim=start=0:end=0.334,asetpts=PTS-STARTPTS,atempo=1.855556,afade=t=in:st=0:d=0.002,afade=t=out:st=0.16:d=0.02,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Objective complete'; Root = $elevenLabsRoot; Source = 'objective-complete-candidate-02.wav'; OutputRoot = $elevenLabsOutput; Output = 'objective-complete-v1.wav'
    Hash = '790D0E928D435D8718F67BAA0BFBD09180F74174019548150DC111981A127380'
    Filter = 'atrim=start=0:end=0.716,asetpts=PTS-STARTPTS,atempo=0.9,afade=t=in:st=0:d=0.003,afade=t=out:st=0.745:d=0.05,pan=mono|c0=0.5*c0+0.5*c1,volume=-3dB,aresample=22050'
  },
  @{
    Name = 'Ejection canopy separation'; Root = $elevenLabsRoot; Source = 'ejection-canopy-elevenlabs-candidate-01.wav'; OutputRoot = $elevenLabsOutput; Output = 'ejection-canopy-v2.wav'
    Hash = '60FB71782A24FDE2F6BA46BCCDD16A6E335203BC09D3FD6AA6271FCA1C9CC713'
    Filter = 'atrim=start=0:end=0.65,asetpts=PTS-STARTPTS,highpass=f=70,afade=t=in:st=0:d=0.003,afade=t=out:st=0.57:d=0.08,pan=mono|c0=0.5*c0+0.5*c1,volume=-6dB,aresample=22050'
  },
  @{
    Name = 'Parachute opening'; Root = $elevenLabsRoot; Source = 'parachute-open-elevenlabs-candidate-03.wav'; OutputRoot = $elevenLabsOutput; Output = 'parachute-open-v2.wav'
    Hash = '2D5A082A4729891293E04D239E6CCD4B48CB1ADDB02DADC0C2FD46D70ADE4C9E'
    Filter = 'atrim=start=0:end=0.9,asetpts=PTS-STARTPTS,highpass=f=55,afade=t=in:st=0:d=0.003,afade=t=out:st=0.79:d=0.11,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
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
New-Item -ItemType Directory -Force -Path $elevenLabsOutput | Out-Null

foreach ($cue in $cues) {
  $source = Join-Path $cue.Root $cue.Source
  $output = Join-Path $cue.OutputRoot $cue.Output
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Archived source is missing for $($cue.Name): $source" }
  if ((Get-Sha256 $source) -ne $cue.Hash) { throw "Archived source hash does not match the approved $($cue.Name) candidate." }
  & $ffmpeg.Source -hide_banner -loglevel error -y -i $source -af $cue.Filter -ac 1 -c:a pcm_s16le $output
  if ($LASTEXITCODE -ne 0) { throw "$($cue.Name) processing failed." }
  Write-Output "Prepared $output"
  Write-Output "SHA256 $(Get-Sha256 $output)"
}
