Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
  Select-Object OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
