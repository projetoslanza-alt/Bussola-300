$ErrorActionPreference = "Stop"
$pg = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"
& $pg -D E:\Bussola300\data status | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $pg -D E:\Bussola300\data -o "-p 5433" -l E:\Bussola300\logs\postgres.log start
}
Set-Location "E:\Lanza\Projetos\300 bussola"
node src/index.js
