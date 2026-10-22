$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$python = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (!(Test-Path -LiteralPath $python)) { $python = (Get-Command python -ErrorAction Stop).Source }
$port = 8772
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$port)
try { $listener.Start() } catch { throw 'Port 8772 is busy. Close the previous web launcher and try again.' } finally { $listener.Stop() }
Start-Process "http://127.0.0.1:$port/"
& $python -m http.server $port --bind 127.0.0.1 --directory $PSScriptRoot
