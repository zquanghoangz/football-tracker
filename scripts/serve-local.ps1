$ErrorActionPreference = 'Stop'
Set-Location -Path 'C:\ws\Playground\Football'

npm run scrape
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Scrape failed (exit $LASTEXITCODE) - continuing with last-known-good data."
}

npm run build | Out-Null
npm run preview -- --port 4173
