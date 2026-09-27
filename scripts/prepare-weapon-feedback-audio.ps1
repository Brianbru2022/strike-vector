param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $ProjectRoot 'art\source\generated-audio\elevenlabs-sfx-2026-09-25'
$outputRoot = Join-Path $ProjectRoot 'public\assets\audio\elevenlabs'

$cues = @(
  @{
    Name = 'Sidewinder flyby'; Source = 'sidewinder-flyby-candidate-02.wav'; Output = 'sidewinder-flyby-v1.wav'
    Hash = '909F10571A631FF60F6D593356BF3C8E98CDF7F954345D0059D9411B7C9A4405'
    Filter = 'atrim=start=0.02:end=1.12,asetpts=PTS-STARTPTS,atempo=1.1,afade=t=in:st=0:d=0.006,afade=t=out:st=0.91:d=0.09,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Rocket-pod salvo'; Source = 'rocket-salvo-candidate-03.wav'; Output = 'rocket-pod-salvo-v1.wav'
    Hash = 'FB4CD39F535BAB6400626C21B26826C8F46D8BB37B7B41439C398E9DE7FAC71D'
    Filter = 'atrim=start=0.02:end=1.18,asetpts=PTS-STARTPTS,atempo=1.16,afade=t=in:st=0:d=0.005,afade=t=out:st=0.91:d=0.09,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Bomb-rack release'; Source = 'bomb-release-candidate-04.wav'; Output = 'bomb-release-v2.wav'
    Hash = 'E6B5CC7E5FA233FFF5757D09BE9DAA2683DC93730342964C3EA9B1043FFBF629'
    Filter = 'atrim=start=0:end=0.7,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=0.61:d=0.09,pan=mono|c0=0.5*c0+0.5*c1,volume=-2dB,aresample=22050'
  },
  @{
    Name = 'Countermeasure flare ejection'; Source = 'flare-eject-candidate-03.wav'; Output = 'flare-eject-v2.wav'
    Hash = '5ACB7DF2814D8B3220EC79EBF79DD8A59D2CA45F9C34E593972C8BDA6E510503'
    Filter = 'atrim=start=0.02:end=0.72,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=0.61:d=0.09,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Aircraft cannon hit'; Source = 'aircraft-gun-hit-candidate-01.wav'; Output = 'aircraft-gun-hit-v1.wav'
    Hash = '533DDD18C62733EB68A9AEF8A84A9968E521DB8A34C2E2DD0ECBEE3735C8BE95'
    Filter = 'atrim=start=0:end=0.5,asetpts=PTS-STARTPTS,atempo=1.1,afade=t=in:st=0:d=0.003,afade=t=out:st=0.38:d=0.075,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Ground armour hit'; Source = 'ground-armour-hit-candidate-02.wav'; Output = 'ground-armour-hit-v1.wav'
    Hash = 'F89AAE8EA43B3557471C043AA8CAE94683A9E206E41EF9E4A51E45798E619035'
    Filter = 'atrim=start=0:end=0.62,asetpts=PTS-STARTPTS,atempo=1.12,afade=t=in:st=0:d=0.003,afade=t=out:st=0.48:d=0.07,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Rock and concrete hit'; Source = 'ground-soft-hit-candidate-03.wav'; Output = 'ground-soft-hit-v1.wav'
    Hash = '0EDBE4EF3377913A20567D83D355895DC9547EC02E8B17C6A4046FFFF08BCDE7'
    Filter = 'atrim=start=0.02:end=0.68,asetpts=PTS-STARTPTS,atempo=1.1,afade=t=in:st=0:d=0.003,afade=t=out:st=0.52:d=0.08,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Open-sea projectile impact'; Source = 'water-impact-candidate-02.wav'; Output = 'water-impact-v1.wav'
    Hash = 'BB8E9459DA4D886A79B11F74D7A00C1FE01D5301097330EB041C8FB304177678'
    Filter = 'atrim=start=0:end=0.9,asetpts=PTS-STARTPTS,atempo=1.125,afade=t=in:st=0:d=0.003,afade=t=out:st=0.69:d=0.11,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Small combat explosion'; Source = 'explosion-small-candidate-01.wav'; Output = 'explosion-small-v1.wav'
    Hash = '02CE26B19416844321795926ABC56E74C465D1973F27D43E15449A506A7300D7'
    Filter = 'atrim=start=0:end=1,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=0.88:d=0.12,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Medium combat explosion'; Source = 'explosion-medium-candidate-04.wav'; Output = 'explosion-medium-v1.wav'
    Hash = '38D22914B4487BF0D4C42FD7666A6F92F10B03558C6F32B06E8B31B3115C0BD0'
    Filter = 'atrim=start=0.02:end=1.88,asetpts=PTS-STARTPTS,atempo=1.033333,afade=t=in:st=0:d=0.003,afade=t=out:st=1.62:d=0.18,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Large structure or ship explosion'; Source = 'explosion-large-candidate-02.wav'; Output = 'explosion-large-v1.wav'
    Hash = '07F6BE3D536A4F69F38966049C1E947082E8D8A369BAF30B2C624CB86C423CEB'
    Filter = 'atrim=start=0.02:end=2.88,asetpts=PTS-STARTPTS,atempo=1.021429,afade=t=in:st=0:d=0.003,afade=t=out:st=2.54:d=0.26,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Fuel-storage cook-off'; Source = 'fuel-cookoff-candidate-01.wav'; Output = 'fuel-cookoff-v1.wav'
    Hash = '7EBB76E0FB3274E307AC3CF7A7C268871396217A5D7D5E190385FB4E4401F52C'
    Filter = 'atrim=start=0.02:end=4.86,asetpts=PTS-STARTPTS,atempo=1.075556,afade=t=in:st=0:d=0.003,afade=t=out:st=4.16:d=0.34,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Aircraft structural breakup'; Source = 'aircraft-breakup-candidate-04.wav'; Output = 'aircraft-breakup-v1.wav'
    Hash = '567EDCBCFAA514E75951B1983BB7B028F3B8C1962837BC913F29A35A52C53B68'
    Filter = 'atrim=start=0.02:end=2.4,asetpts=PTS-STARTPTS,atempo=1.081818,afade=t=in:st=0:d=0.003,afade=t=out:st=2:d=0.2,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Aircraft ground crash'; Source = 'ground-crash-candidate-01.wav'; Output = 'aircraft-ground-crash-v1.wav'
    Hash = '8136F61E0BAFFC3620FF985A1278D0FA8585BC2D3B2FF89003EEA169E9A9D158'
    Filter = 'atrim=start=0:end=2.4,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=2.15:d=0.25,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Aircraft sea crash'; Source = 'sea-crash-candidate-01.wav'; Output = 'aircraft-sea-crash-v1.wav'
    Hash = '04E982742AAF372BBEBC78527A8D7C2A0F4E496C286A529C0F45DEEA793C97CB'
    Filter = 'atrim=start=0.02:end=2.76,asetpts=PTS-STARTPTS,atempo=1.053846,afade=t=in:st=0:d=0.003,afade=t=out:st=2.35:d=0.25,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Ejection-seat launch'; Source = 'ejection-seat-candidate-03.wav'; Output = 'ejection-seat-v1.wav'
    Hash = '26ADF5FB5D1DA5E88DE9255F75695A299F920FDF51966A48BC742A666C0286C8'
    Filter = 'atrim=start=0.015:end=1.2,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=1.05:d=0.12,pan=mono|c0=0.5*c0+0.5*c1,volume=-8dB,aresample=22050'
  },
  @{
    Name = 'Naval autocannon burst'; Source = 'naval-gun-candidate-01.wav'; Output = 'naval-gun-v2.wav'
    Hash = '94186FA809A082926991B56943963C5406884E2DFEA80761089E028107171667'
    Filter = 'atrim=start=0:end=1.36,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=1.19:d=0.14,pan=mono|c0=0.5*c0+0.5*c1,volume=-3dB,aresample=22050'
  },
  @{
    Name = 'Anti-ship missile launch'; Source = 'antiship-missile-candidate-02.wav'; Output = 'antiship-missile-launch-v1.wav'
    Hash = 'D0885EFEE8053136CF2E9D9443FC4744A8D391DC3AB9FBFCEF646738E895A345'
    Filter = 'atrim=start=0.02:end=2.24,asetpts=PTS-STARTPTS,atempo=1.11,afade=t=in:st=0:d=0.003,afade=t=out:st=1.78:d=0.2,pan=mono|c0=0.5*c0+0.5*c1,volume=-9dB,aresample=22050'
  },
  @{
    Name = 'Carrier touchdown'; Source = 'carrier-touchdown-candidate-02.wav'; Output = 'carrier-touchdown-v2.wav'
    Hash = '311B7F84F2159F738823698909FFA457A00980211C7698AE931E37526D839568'
    Filter = 'atrim=start=0:end=1.6,asetpts=PTS-STARTPTS,atempo=1.066667,afade=t=in:st=0:d=0.003,afade=t=out:st=1.32:d=0.16,pan=mono|c0=0.5*c0+0.5*c1,volume=1dB,aresample=22050'
  },
  @{
    Name = 'Carrier-deck ambience'; Source = 'carrier-deck-ambience-candidate-02.wav'; Output = 'carrier-deck-ambience-v1.wav'
    Hash = 'F67F2DD86D3A0B86CB626A6D13C3B9E76AE764BCE2DB45EB142D1741EF23A6F4'
    FilterComplex = '[0:a]atrim=start=0.5:end=13.5,asetpts=PTS-STARTPTS,asplit=3[headsrc][middlesrc][tailsrc];[headsrc]atrim=start=0:end=1,asetpts=PTS-STARTPTS[head];[middlesrc]atrim=start=1:end=12,asetpts=PTS-STARTPTS[middle];[tailsrc]atrim=start=12:end=13,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=1:c1=tri:c2=tri[seam];[middle][seam]concat=n=2:v=0:a=1,pan=mono|c0=0.5*c0+0.5*c1,volume=5dB,aresample=22050[out]'
  },
  @{
    Name = 'FARP servicing ambience'; Source = 'farp-ambience-candidate-02.wav'; Output = 'farp-ambience-v1.wav'
    Hash = 'EA9473C244021F85F9AC0C5D872DA35096BBC7510D0F0535081F3D884088CD67'
    FilterComplex = '[0:a]atrim=start=0.25:end=11.91,asetpts=PTS-STARTPTS,asplit=3[headsrc][middlesrc][tailsrc];[headsrc]atrim=start=0:end=0.5,asetpts=PTS-STARTPTS[head];[middlesrc]atrim=start=0.5:end=11.16,asetpts=PTS-STARTPTS[middle];[tailsrc]atrim=start=11.16:end=11.66,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=0.5:c1=tri:c2=tri[seam];[middle][seam]concat=n=2:v=0:a=1,pan=mono|c0=0.5*c0+0.5*c1,volume=7dB,aresample=22050[out]'
  },
  @{
    Name = 'Maritime storm and rain'; Source = 'storm-rain-candidate-03.wav'; Output = 'storm-rain-loop-v1.wav'
    Hash = '4091134BA74638780D6BF6739CFB7A44ED84F0616AC8F38B462C7CC74CFD6B1B'
    FilterComplex = '[0:a]atrim=start=0.25:end=11.91,asetpts=PTS-STARTPTS,asplit=3[headsrc][middlesrc][tailsrc];[headsrc]atrim=start=0:end=0.5,asetpts=PTS-STARTPTS[head];[middlesrc]atrim=start=0.5:end=11.16,asetpts=PTS-STARTPTS[middle];[tailsrc]atrim=start=11.16:end=11.66,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=0.5:c1=tri:c2=tri[seam];[middle][seam]concat=n=2:v=0:a=1,pan=mono|c0=0.5*c0+0.5*c1,volume=-6dB,aresample=22050[out]'
  },
  @{
    Name = 'Distant thunder'; Source = 'thunder-distant-candidate-02.wav'; Output = 'thunder-distant-v1.wav'
    Hash = '75491A73B8AAD6D99F736B4A8EAA95A0769B3525BCBF7DE3D45D290B3FE8C5C4'
    Filter = 'atrim=start=0.02:end=5.12,asetpts=PTS-STARTPTS,atempo=1.133333,afade=t=in:st=0:d=0.01,afade=t=out:st=4.15:d=0.35,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Radar search cue'; Source = 'radar-search-candidate-04.wav'; Output = 'radar-search-v1.wav'
    Hash = '67E834F9E2E2A6AFA7BA710DD100329E202D5DF9967EC8D6B6A5016CE0448DE5'
    Filter = 'atrim=start=0.54:end=1.27,asetpts=PTS-STARTPTS,atempo=2,afade=t=in:st=0:d=0.003,afade=t=out:st=0.31:d=0.05,pan=mono|c0=0.5*c0+0.5*c1,volume=-3dB,aresample=22050'
  },
  @{
    Name = 'Rocky coastal surf'; Source = 'coastal-surf-candidate-04.wav'; Output = 'coastal-surf-loop-v1.wav'
    Hash = '6E6BC24AF632840353C935379A03D98F0B3959E1A6A34DE059A0FF0D89406C1F'
    FilterComplex = '[0:a]atrim=start=0.5:end=13.5,asetpts=PTS-STARTPTS,asplit=3[headsrc][middlesrc][tailsrc];[headsrc]atrim=start=0:end=1,asetpts=PTS-STARTPTS[head];[middlesrc]atrim=start=1:end=12,asetpts=PTS-STARTPTS[middle];[tailsrc]atrim=start=12:end=13,asetpts=PTS-STARTPTS[tail];[tail][head]acrossfade=d=1:c1=tri:c2=tri[seam];[middle][seam]concat=n=2:v=0:a=1,pan=mono|c0=0.5*c0+0.5*c1,volume=-1dB,aresample=22050[out]'
  },
  @{
    Name = 'Radar tracking warning'; Source = 'radar-track-candidate-01.wav'; Output = 'radar-track-loop-v1.wav'
    Hash = 'B346D33544987ED321D4680E2E5075147B90401FD822A654C9595DB180032472'
    Filter = 'atrim=start=0.82:end=1.82,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.012,afade=t=out:st=0.988:d=0.012,pan=mono|c0=0.5*c0+0.5*c1,volume=-4dB,aresample=22050'
  },
  @{
    Name = 'Incoming missile warning'; Source = 'missile-warning-candidate-04.wav'; Output = 'missile-warning-loop-v1.wav'
    Hash = 'D27F228FF681F272CB60713311229998E5987375AA3256B518D839B0971A4E89'
    Filter = 'atrim=start=0.8:end=1.8,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.01,afade=t=out:st=0.99:d=0.01,pan=mono|c0=0.5*c0+0.5*c1,volume=-5dB,aresample=22050'
  },
  @{
    Name = 'Target-lock confirmation'; Source = 'target-lock-candidate-01.wav'; Output = 'target-lock-v1.wav'
    Hash = 'D38F5D0DD52C2E1D9818D7962B71C19624D4967ABFF66371CA822678A3EBCF10'
    Filter = 'atrim=start=0:end=0.75,asetpts=PTS-STARTPTS,atempo=1.666667,afade=t=in:st=0:d=0.003,afade=t=out:st=0.4:d=0.05,pan=mono|c0=0.5*c0+0.5*c1,volume=-7dB,aresample=22050'
  },
  @{
    Name = 'Low-fuel caution'; Source = 'low-fuel-candidate-03.wav'; Output = 'low-fuel-warning-v1.wav'
    Hash = '1E4F16B779692006C75FF22C4EF1448B4BA19D1BC873050C909721CDFC62E3F0'
    Filter = 'atrim=start=0:end=0.65,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.003,afade=t=out:st=0.6:d=0.05,pan=mono|c0=0.5*c0+0.5*c1,volume=-4dB,aresample=22050'
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
  if ($cue.FilterComplex) {
    & $ffmpeg.Source -hide_banner -loglevel error -y -i $source -filter_complex $cue.FilterComplex -map '[out]' -ac 1 -c:a pcm_s16le $output
  }
  else {
    & $ffmpeg.Source -hide_banner -loglevel error -y -i $source -af $cue.Filter -ac 1 -c:a pcm_s16le $output
  }
  if ($LASTEXITCODE -ne 0) { throw "$($cue.Name) processing failed." }
  Write-Output "Prepared $output"
  Write-Output "SHA256 $(Get-Sha256 $output)"
}
