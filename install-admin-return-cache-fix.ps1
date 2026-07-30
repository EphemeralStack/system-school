$ErrorActionPreference = "Stop"

$dashboardPath = Join-Path `
  $PSScriptRoot `
  "app\(dashboard)\admin\dashboard\page.tsx"

if (-not (Test-Path $dashboardPath)) {
  throw "Admin dashboard file not found at: $dashboardPath"
}

$content = Get-Content `
  -Path $dashboardPath `
  -Raw

$mainMarker =
  "// ============= MAIN DASHBOARD ============="

# Keep the school record in module memory during client-side
# navigation, so returning to the dashboard does not flash
# the loading screen again.
if (
  $content -notmatch
  "let cachedAdminSchoolData"
) {
  $markerIndex =
    $content.IndexOf($mainMarker)

  if ($markerIndex -lt 0) {
    throw "Could not locate the MAIN DASHBOARD marker."
  }

  $cacheCode = @'
let cachedAdminSchoolData: any = null

'@

  $content =
    $content.Insert(
      $markerIndex,
      $cacheCode
    )
}

# Initialize the school state from the in-memory cache.
$schoolStatePattern =
  'const\s+\[schoolData,\s*setSchoolData\]\s*=\s*useState<any>\(\s*null\s*\)'

$schoolStateReplacement = @'
const [schoolData, setSchoolData] = useState<any>(
    () => cachedAdminSchoolData
  )
'@

$updatedContent =
  [regex]::Replace(
    $content,
    $schoolStatePattern,
    $schoolStateReplacement,
    1
  )

if ($updatedContent -eq $content) {
  if (
    $content -notmatch
    "cachedAdminSchoolData\s*\)"
  ) {
    throw "Could not locate the schoolData state declaration."
  }
}

$content = $updatedContent

# Only show the full loading screen when no cached record exists.
$loadingStatePattern =
  'const\s+\[loading,\s*setLoading\]\s*=\s*useState\(\s*true\s*\)'

$loadingStateReplacement = @'
const [loading, setLoading] = useState(
    () => cachedAdminSchoolData === null
  )
'@

$updatedContent =
  [regex]::Replace(
    $content,
    $loadingStatePattern,
    $loadingStateReplacement,
    1
  )

if ($updatedContent -eq $content) {
  if (
    $content -notmatch
    "cachedAdminSchoolData === null"
  ) {
    throw "Could not locate the loading state declaration."
  }
}

$content = $updatedContent

# Cache the record after the initial school lookup.
$lookupLine =
  "          setSchoolData(response.documents[0])"

if (
  $content.Contains($lookupLine) -and
  $content -notmatch
  "cachedAdminSchoolData\s*=\s*response\.documents\[0\]"
) {
  $lookupReplacement = @'
          cachedAdminSchoolData =
            response.documents[0]

          setSchoolData(
            cachedAdminSchoolData
          )
'@

  $content =
    $content.Replace(
      $lookupLine,
      $lookupReplacement
    )
}

# Cache a newly created school record.
$createLine =
  "      setSchoolData(response)"

if (
  $content.Contains($createLine) -and
  $content -notmatch
  "cachedAdminSchoolData\s*=\s*response"
) {
  $createReplacement = @'
      cachedAdminSchoolData = response
      setSchoolData(response)
'@

  $content =
    $content.Replace(
      $createLine,
      $createReplacement
    )
}

# Cache an edited school record where the existing compact
# update statement is still present.
$compactUpdatePattern =
  "setSchoolData\(\{\s*\.\.\.schoolData,\s*Name:\s*data\.Name,\s*Address:\s*data\.Address,\s*ContactEmail:\s*data\.ContactEmail,\s*ContactPhone:\s*data\.ContactPhone,\s*LogoUrl:\s*data\.LogoUrl,\s*Status:\s*data\.Status\s*\|\|\s*'active'\s*\}\)"

if (
  $content -match $compactUpdatePattern -and
  $content -notmatch
  "const updatedSchoolData"
) {
  $updateReplacement = @'
const updatedSchoolData = {
                ...schoolData,
                Name: data.Name,
                Address: data.Address,
                ContactEmail:
                  data.ContactEmail,
                ContactPhone:
                  data.ContactPhone,
                LogoUrl: data.LogoUrl,
                Status:
                  data.Status || 'active',
              }

              cachedAdminSchoolData =
                updatedSchoolData

              setSchoolData(
                updatedSchoolData
              )
'@

  $content =
    [regex]::Replace(
      $content,
      $compactUpdatePattern,
      $updateReplacement,
      1
    )
}

Set-Content `
  -Path $dashboardPath `
  -Value $content `
  -Encoding utf8

Write-Host `
  "Dashboard return cache installed successfully." `
  -ForegroundColor Green

Write-Host `
  "Returning from Academic Matrix will no longer show the full loading indicator." `
  -ForegroundColor Green