$ErrorActionPreference = "Stop"

$target = Join-Path `
  $PSScriptRoot `
  "components\dashboard\financial-audit\FinancialAuditDesk.tsx"

if (-not (Test-Path $target)) {
  throw "FinancialAuditDesk.tsx not found: $target"
}

$content = Get-Content $target -Raw

if ($content -notmatch "const\s+visibleRows\s*=") {
  $rowsMarker = @'
  const rows = useMemo(() => {
'@

  $rowsStart = $content.IndexOf($rowsMarker)

  if ($rowsStart -lt 0) {
    throw "Could not locate the filtered rows block."
  }

  $trendMarker = @'
  const current =
'@

  $trendStart = $content.IndexOf($trendMarker, $rowsStart)

  if ($trendStart -lt 0) {
    throw "Could not locate the position after the rows block."
  }

  $visibleRowsCode = @'
  const visibleRows =
    showAll
      ? rows
      : rows.slice(0, 5)

'@

  $content = $content.Insert(
    $trendStart,
    $visibleRowsCode
  )
}

$tbodyPattern = '(?s)(<tbody[^>]*>.*?\{)\s*rows\.map\s*\('
$replacement = '$1visibleRows.map('

$updated = [regex]::Replace(
  $content,
  $tbodyPattern,
  $replacement,
  1
)

if ($updated -eq $content) {
  if ($content -match '\{visibleRows\.map\s*\(') {
    Write-Host "The ledger already maps visibleRows." -ForegroundColor Yellow
  } else {
    throw "Could not locate the ledger table map."
  }
} else {
  $content = $updated
}

Set-Content `
  -Path $target `
  -Value $content `
  -Encoding utf8

Get-Process node `
  -ErrorAction SilentlyContinue |
  Stop-Process -Force

Remove-Item `
  -Recurse `
  -Force `
  .next `
  -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Ledger limited to 5 rows by default." -ForegroundColor Green
Write-Host "Run: npm run dev -- --webpack" -ForegroundColor Cyan