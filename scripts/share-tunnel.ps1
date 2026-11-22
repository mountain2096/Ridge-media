param([switch]$UseDefaultDb)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host 'Chưa cài cloudflared. Cài bằng lệnh: winget install Cloudflare.cloudflared'
  exit 1
}

if (-not $UseDefaultDb -and -not $env:FRIENDS_MONGO_URI) {
  Write-Host 'Thiếu FRIENDS_MONGO_URI. Hãy đặt biến này trỏ tới một database thử nghiệm riêng.'
  exit 1
}

if ($UseDefaultDb) {
  Write-Warning 'Bạn đang chọn dùng database mặc định; dữ liệu thật có thể bị lộ cho người truy cập.'
  if ((Read-Host 'Gõ YES để tiếp tục') -cne 'YES') { exit 1 }
}

$logDir = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
$apiOut = Join-Path $logDir 'api.out.log'
$apiErr = Join-Path $logDir 'api.err.log'
$webOut = Join-Path $logDir 'web.out.log'
$webErr = Join-Path $logDir 'web.err.log'
$apiTunnel = $null
$webTunnel = $null

try {
  New-Item -ItemType Directory -Path $logDir | Out-Null
  $apiTunnel = Start-Process cloudflared -ArgumentList @('tunnel', '--url', 'http://localhost:5000') -PassThru -NoNewWindow -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr
  $webTunnel = Start-Process cloudflared -ArgumentList @('tunnel', '--url', 'http://localhost:5173') -PassThru -NoNewWindow -RedirectStandardOutput $webOut -RedirectStandardError $webErr

  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  $apiUrl = $null
  $webUrl = $null
  while ([DateTime]::UtcNow -lt $deadline -and (-not $apiUrl -or -not $webUrl)) {
    foreach ($path in @($apiOut, $apiErr)) {
      if (Test-Path $path) {
        $match = [regex]::Match([IO.File]::ReadAllText($path), 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $apiUrl = $match.Value; break }
      }
    }
    foreach ($path in @($webOut, $webErr)) {
      if (Test-Path $path) {
        $match = [regex]::Match([IO.File]::ReadAllText($path), 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $webUrl = $match.Value; break }
      }
    }
    if (-not $apiUrl -or -not $webUrl) { Start-Sleep -Milliseconds 500 }
  }

  if (-not $apiUrl -or -not $webUrl) { throw 'Không lấy được URL tunnel trong 45 giây. Hãy thử lại.' }

  $env:VITE_API_URL = $apiUrl
  $env:CLIENT_URL = $webUrl
  if (-not $UseDefaultDb) { $env:MONGO_URI = $env:FRIENDS_MONGO_URI }

  Write-Host "`n============================================`n  CHIA SẺ RIDGE VỚI BẠN BÈ`n`n  Link: $webUrl`n`n  Nhấn Ctrl+C để dừng ứng dụng và tunnel.`n============================================`n" -ForegroundColor Cyan
  & npm.cmd run dev:all
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
  if ($apiTunnel) { Stop-Process -Id $apiTunnel.Id -Force -ErrorAction SilentlyContinue }
  if ($webTunnel) { Stop-Process -Id $webTunnel.Id -Force -ErrorAction SilentlyContinue }
  if (Test-Path $logDir) { Remove-Item -LiteralPath $logDir -Recurse -Force }
}
