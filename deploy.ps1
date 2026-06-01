$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

Write-Host "Dang push code len Vercel..." -ForegroundColor Yellow

git add .
git commit -m "Update $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
git push origin main

Write-Host ""
Write-Host "Xong! Vercel dang build lai (~1 phut)" -ForegroundColor Green
Write-Host "Vao Vercel dashboard de theo doi tien trinh." -ForegroundColor Cyan
