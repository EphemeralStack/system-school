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

# ------------------------------------------------------------
# 1. Add the Financial Audit component import
# ------------------------------------------------------------
if ($content -notmatch "FinancialAuditSidePanel") {
  $financeImport = @'
import FinancialAuditDesk, {
  FinancialAuditSidePanel,
} from '@/components/dashboard/financial-audit/FinancialAuditDesk'
'@

  $importPattern =
    "(?m)^(import\s+\{\s*AddApplicantModal\s*\}\s+from\s+'@/components/dashboard/AddApplicantModal'\s*\r?\n)"

  $updated = [regex]::Replace(
    $content,
    $importPattern,
    "`$1$financeImport`r`n",
    1
  )

  if ($updated -eq $content) {
    $sectionMarker =
      "// ============= LEFT PANEL SECTIONS ============="

    $markerIndex =
      $content.IndexOf($sectionMarker)

    if ($markerIndex -lt 0) {
      throw "Could not locate the dashboard import area."
    }

    $content =
      $content.Insert(
        $markerIndex,
        "$financeImport`r`n"
      )
  } else {
    $content = $updated
  }
}

# ------------------------------------------------------------
# 2. Synchronize activeSection with ?section=
# ------------------------------------------------------------
if ($content -notmatch "FINANCIAL_SECTION_URL_SYNC") {
  $activeStatePattern =
    "const\s+\[activeSection,\s*setActiveSection\]\s*=\s*useState\(\s*'global-config'\s*\)"

  $activeStateReplacement = @'
const [activeSection, setActiveSection] = useState('global-config')

  // FINANCIAL_SECTION_URL_SYNC
  useEffect(() => {
    const syncSectionFromUrl = () => {
      const requestedSection =
        new URLSearchParams(
          window.location.search
        ).get('section')

      if (
        requestedSection === 'global-config' ||
        requestedSection === 'financial-audit' ||
        requestedSection === 'user-accounts'
      ) {
        setActiveSection(
          requestedSection
        )
      }
    }

    syncSectionFromUrl()

    window.addEventListener(
      'popstate',
      syncSectionFromUrl
    )

    return () => {
      window.removeEventListener(
        'popstate',
        syncSectionFromUrl
      )
    }
  }, [])
'@

  $updated = [regex]::Replace(
    $content,
    $activeStatePattern,
    $activeStateReplacement,
    1
  )

  if ($updated -eq $content) {
    throw "Could not locate activeSection state."
  }

  $content = $updated
}

# ------------------------------------------------------------
# 3. Keep section navigation and URL synchronized
# ------------------------------------------------------------
if ($content -notmatch "section=\$\{section\.id\}") {
  $navigationPattern =
    "setActiveSection\(section\.id\)\s*\r?\n\s*setIsLeftPanelOpen\(false\)"

  $navigationReplacement = @'
setActiveSection(section.id)
                  setIsLeftPanelOpen(false)

                  router.replace(
                    `/admin/dashboard?section=${section.id}`,
                    {
                      scroll: false,
                    }
                  )
'@

  $updated = [regex]::Replace(
    $content,
    $navigationPattern,
    $navigationReplacement,
    1
  )

  if ($updated -eq $content) {
    throw "Could not locate the sidebar section navigation handler."
  }

  $content = $updated
}

# ------------------------------------------------------------
# 4. Switch the middle workspace by section
#    Uses major comment boundaries instead of matching RBAC JSX.
# ------------------------------------------------------------
if ($content -notmatch "FINANCIAL_AUDIT_MIDDLE_SWITCH") {
  $metricsMarker =
    "        {/* ===== KEY METRICS - 2 Rows x 2 Columns ===== */}"

  $rightPanelMarker =
    "      {/* ===== RIGHT PANEL ===== */}"

  $metricsIndex =
    $content.IndexOf($metricsMarker)

  $rightPanelIndex =
    $content.IndexOf(
      $rightPanelMarker,
      $metricsIndex
    )

  if (
    $metricsIndex -lt 0 -or
    $rightPanelIndex -lt 0
  ) {
    throw "Could not locate the middle-section boundary markers."
  }

  $beforeRightPanel =
    $content.Substring(
      0,
      $rightPanelIndex
    )

  $middleClosingIndex =
    $beforeRightPanel.LastIndexOf(
      "      </div>"
    )

  if (
    $middleClosingIndex -lt
    $metricsIndex
  ) {
    throw "Could not locate the middle-section closing element."
  }

  $existingGlobalWorkspace =
    $content.Substring(
      $metricsIndex,
      $middleClosingIndex -
      $metricsIndex
    )

  $middleSwitch = @"
        {/* FINANCIAL_AUDIT_MIDDLE_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditDesk
            schoolId={schoolData?.`$id}
          />
        ) : (
          <>
$existingGlobalWorkspace
          </>
        )}

"@

  $content =
    $content.Substring(
      0,
      $metricsIndex
    ) +
    $middleSwitch +
    $content.Substring(
      $middleClosingIndex
    )
}

# ------------------------------------------------------------
# 5. Switch the right-side panel for Financial Auditing
# ------------------------------------------------------------
if ($content -notmatch "FINANCIAL_AUDIT_RIGHT_SWITCH") {
  $rightHeadingText =
    "Notifications & Alerts"

  $headingTextIndex =
    $content.IndexOf(
      $rightHeadingText
    )

  if ($headingTextIndex -lt 0) {
    throw "Could not locate the Notifications & Alerts heading."
  }

  $rightBodyStart =
    $content.LastIndexOf(
      "        <h3",
      $headingTextIndex
    )

  $editSchoolMarker =
    "      {/* Edit School Modal */}"

  $editSchoolIndex =
    $content.IndexOf(
      $editSchoolMarker,
      $headingTextIndex
    )

  if (
    $rightBodyStart -lt 0 -or
    $editSchoolIndex -lt 0
  ) {
    throw "Could not locate the right-panel boundaries."
  }

  $beforeEditSchool =
    $content.Substring(
      0,
      $editSchoolIndex
    )

  $rightPanelClosingIndex =
    $beforeEditSchool.LastIndexOf(
      "      </div>"
    )

  if (
    $rightPanelClosingIndex -lt
    $rightBodyStart
  ) {
    throw "Could not locate the right-panel closing element."
  }

  $existingRightBody =
    $content.Substring(
      $rightBodyStart,
      $rightPanelClosingIndex -
      $rightBodyStart
    )

  $rightSwitch = @"
        {/* FINANCIAL_AUDIT_RIGHT_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditSidePanel />
        ) : (
          <>
$existingRightBody
          </>
        )}

"@

  $content =
    $content.Substring(
      0,
      $rightBodyStart
    ) +
    $rightSwitch +
    $content.Substring(
      $rightPanelClosingIndex
    )
}

Set-Content `
  -Path $dashboardPath `
  -Value $content `
  -Encoding utf8

Write-Host `
  "Financial Auditing Desk connected successfully." `
  -ForegroundColor Green

Write-Host `
  "Route: /admin/dashboard?section=financial-audit" `
  -ForegroundColor Green