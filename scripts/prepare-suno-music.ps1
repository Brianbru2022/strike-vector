param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $ProjectRoot 'art\source\generated-audio\suno-music-2026-09-26'
$outputRoot = Join-Path $ProjectRoot 'public\assets\audio\music'

$tracks = @(
  @{ Name='Briefing Room Alpha'; Source='briefing-room-alpha.mp3'; Output='briefing-intelligence-v1.ogg'; Hash='DFD9A55839E43867FB13BB1FBB817DEB9F0021DD6266767E6A0624CB9313A496'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Dawn Departure'; Source='dawn-departure.mp3'; Output='carrier-launch-v1.ogg'; Hash='8AACB09028419371F1C0FC156B6D67196F501FA1FCC9960E5C57052CF243899D'; Filter='[0:a]atrim=start=0:end=75,asetpts=PTS-STARTPTS,afade=t=out:st=73.5:d=1.5,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Carrier Approach'; Source='carrier-approach.mp3'; Output='north-atlantic-patrol-v1.ogg'; Hash='04266E408C396CEC6FC7A67031ABA738D976F14CED2A9146F114CB3E47644A04'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Air Defense Arp'; Source='air-defence-arp.mp3'; Output='air-combat-intercept-v1.ogg'; Hash='CACF5A5EA4146962C9DA6DC808EFB335FF5E0B9D3CCD60494AB6CA4DE23DD0DB'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Low-Level Acquisition'; Source='low-level-acquisition.mp3'; Output='ground-strike-v1.ogg'; Hash='52E83824106A858F89A1C7A91219000D43331B587F19623A99BF2F92BF3EFCD8'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Defensive Phrase'; Source='defensive-phrase.mp3'; Output='storm-fleet-defence-v1.ogg'; Hash='0CE1E1E6AF16C6F8AB8C04648E7035BD3A866E0AB96E94387C348FDF57B7B3AB'; Filter='[0:a]atrim=start=4:end=74,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Basalt Command'; Source='basalt-command.mp3'; Output='bastion-assault-v1.ogg'; Hash='7E3681AF1088BDCBA7C49745DB54B47F765C40C0B58558F2E20A27774098697F'; Filter='[0:a]atrim=start=4:end=74,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Narrow Margins'; Source='narrow-margins.mp3'; Output='recovery-approach-v1.ogg'; Hash='6C243C1582EFFECF6AF95AA73E31957F7EDC4D84FD75DB676633DE1BC19868D8'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Mission Accomplished'; Source='mission-accomplished.mp3'; Output='debrief-victory-v1.ogg'; Hash='67FE4C61C917601B5B7F2F980CD4E3538A4A9F38A3E3E79549C1917F2FFED3D1'; Filter='[0:a]atrim=start=0:end=88.88,asetpts=PTS-STARTPTS,afade=t=out:st=87.8:d=1.08,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Mission Debrief'; Source='mission-debrief.mp3'; Output='debrief-loss-v1.ogg'; Hash='312095F6D66B62127B155C58701C6118344A7F865C3C07675C2D9A2979D49ACA'; Filter='[0:a]atrim=start=0:end=89,asetpts=PTS-STARTPTS,afade=t=out:st=87.9:d=1.1,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' },
  @{ Name='Preparation for Sortie'; Source='preparation-for-sortie.mp3'; Output='servicing-turnaround-v1.ogg'; Hash='9FC8EAF9DCB45508B43D782A103A5E1E75446AA22F8B0579B8C1F113041A20CA'; Filter='[0:a]atrim=start=4:end=64,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=0:end=4,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=4:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[out]' }
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

foreach ($track in $tracks) {
  $source = Join-Path $sourceRoot $track.Source
  $output = Join-Path $outputRoot $track.Output
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Archived source is missing for $($track.Name): $source" }
  if ((Get-Sha256 $source) -ne $track.Hash) { throw "Archived source hash does not match $($track.Name)." }
  & $ffmpeg.Source -hide_banner -loglevel error -y -i $source -filter_complex $track.Filter -map '[out]' -c:a libopus -b:a 56k -vbr on -compression_level 10 -application audio $output
  if ($LASTEXITCODE -ne 0) { throw "$($track.Name) processing failed." }
  Write-Output "Prepared $output"
  Write-Output "SHA256 $(Get-Sha256 $output)"
}
