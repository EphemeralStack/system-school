$ErrorActionPreference = "Stop"

$dashboardPath = Join-Path `
  $PSScriptRoot `
  "app\(dashboard)\admin\dashboard\page.tsx"

$academicPath = Join-Path `
  $PSScriptRoot `
  "components\academic-matrix\AcademicMatrixDashboard.tsx"

$userAccountsPath = Join-Path `
  $PSScriptRoot `
  "components\dashboard\user-accounts\UserAccountsDesk.tsx"

$packagePath = Join-Path `
  $PSScriptRoot `
  "package.json"

$auditScriptPath = Join-Path `
  $PSScriptRoot `
  "scripts\audit-static-runtime-data.mjs"

if (-not (Test-Path $dashboardPath)) {
  throw "Admin dashboard not found: $dashboardPath"
}

if (-not (Test-Path $auditScriptPath)) {
  throw "Audit script not found. Extract database-live-mode-pack.zip again first."
}

$backupDirectory = Join-Path `
  $PSScriptRoot `
  "live-mode-backup"

New-Item `
  -ItemType Directory `
  -Path $backupDirectory `
  -Force |
  Out-Null

Copy-Item `
  $dashboardPath `
  (Join-Path $backupDirectory "admin-dashboard-page.tsx.bak") `
  -Force

if (Test-Path $academicPath) {
  Copy-Item `
    $academicPath `
    (Join-Path $backupDirectory "AcademicMatrixDashboard.tsx.bak") `
    -Force
}

if (Test-Path $userAccountsPath) {
  Copy-Item `
    $userAccountsPath `
    (Join-Path $backupDirectory "UserAccountsDesk.tsx.bak") `
    -Force
}

# ============================================================
# ADMIN DASHBOARD
# ============================================================

$content = Get-Content `
  -Path $dashboardPath `
  -Raw

# Repair an earlier missing newline after the User Accounts import.
$content = $content.Replace(
  "from '@/components/dashboard/user-accounts/UserAccountsDesk'// ============= LEFT PANEL SECTIONS =============",
  "from '@/components/dashboard/user-accounts/UserAccountsDesk'`r`n`r`n// ============= LEFT PANEL SECTIONS ============="
)

# Add live Global Configuration components.
if ($content -notmatch "GlobalConfigLiveWorkspace") {
  $importLine =
    "} from '@/components/dashboard/user-accounts/UserAccountsDesk'"

  $importIndex =
    $content.IndexOf($importLine)

  if ($importIndex -lt 0) {
    throw "Could not locate the User Accounts import."
  }

  $insertPosition =
    $importIndex +
    $importLine.Length

  $liveImport = @'


import {
  GlobalConfigLiveSidePanel,
  GlobalConfigLiveWorkspace,
} from '@/components/dashboard/global-config/GlobalConfigLive'
'@

  $content =
    $content.Insert(
      $insertPosition,
      $liveImport
    )
}

# Remove old static notification, ledger and RBAC datasets.
$staticStart =
  $content.IndexOf(
    "// ============= NOTIFICATIONS ============="
  )

$schoolFormMarker =
  "// ============= SCHOOL SETUP FORM ============="

$staticEnd =
  $content.IndexOf(
    $schoolFormMarker
  )

if (
  $staticStart -ge 0 -and
  $staticEnd -gt $staticStart
) {
  $content =
    $content.Substring(
      0,
      $staticStart
    ) +
    $content.Substring(
      $staticEnd
    )
}

# Remove the old notification badge condition that depended on
# the deleted static notifications array.
$content = [regex]::Replace(
  $content,
  "(?s)\s*\{notifications\.length\s*>\s*0\s*&&\s*\(\s*<span[^>]*bg-red-500[^>]*/>\s*\)\}",
  "",
  1
)

# Replace the entire middle switch using stable comment boundaries.
$middleStartMarker =
  "        {/* FINANCIAL_AUDIT_MIDDLE_SWITCH */}"

$rightPanelMarker =
  "      {/* ===== RIGHT PANEL ===== */}"

$middleStart =
  $content.IndexOf(
    $middleStartMarker
  )

$rightPanelStart =
  $content.IndexOf(
    $rightPanelMarker,
    [Math]::Max(
      0,
      $middleStart
    )
  )

if (
  $middleStart -lt 0 -or
  $rightPanelStart -lt 0
) {
  throw "Could not locate the admin middle-section boundaries."
}

$beforeRightPanel =
  $content.Substring(
    0,
    $rightPanelStart
  )

$middleClosingDiv =
  $beforeRightPanel.LastIndexOf(
    "      </div>"
  )

if ($middleClosingDiv -le $middleStart) {
  throw "Could not locate the admin middle-section closing div."
}

$middleReplacement = @'
        {/* FINANCIAL_AUDIT_MIDDLE_SWITCH */}
        {/* USER_ACCOUNTS_MIDDLE_SWITCH */}
        {/* DATABASE_LIVE_MIDDLE_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditDesk />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsDesk
            onAddStudent={handleAddStudent}
            onAddTeacher={handleAddTeacher}
            onAddApplicant={handleAddApplicant}
          />
        ) : (
          <GlobalConfigLiveWorkspace
            onAddStudent={handleAddStudent}
            onAddTeacher={handleAddTeacher}
            onAddApplicant={handleAddApplicant}
            onAddClass={handleAddClass}
            onViewStudents={handleViewStudents}
            onViewTeachers={handleViewTeachers}
            onViewApplicants={handleViewApplicants}
            onViewClasses={handleViewClasses}
          />
        )}

'@

$content =
  $content.Substring(
    0,
    $middleStart
  ) +
  $middleReplacement +
  $content.Substring(
    $middleClosingDiv
  )

# Replace the entire right panel body using the edit-modal boundary.
$rightSwitchMarker =
  "        {/* FINANCIAL_AUDIT_RIGHT_SWITCH */}"

$editSchoolMarker =
  "      {/* Edit School Modal */}"

$rightSwitchStart =
  $content.IndexOf(
    $rightSwitchMarker
  )

$editSchoolStart =
  $content.IndexOf(
    $editSchoolMarker,
    [Math]::Max(
      0,
      $rightSwitchStart
    )
  )

if (
  $rightSwitchStart -lt 0 -or
  $editSchoolStart -lt 0
) {
  throw "Could not locate the admin right-panel boundaries."
}

$beforeEditSchool =
  $content.Substring(
    0,
    $editSchoolStart
  )

$rightPanelClosingDiv =
  $beforeEditSchool.LastIndexOf(
    "      </div>"
  )

if (
  $rightPanelClosingDiv -le
  $rightSwitchStart
) {
  throw "Could not locate the admin right-panel closing div."
}

$rightReplacement = @'
        {/* FINANCIAL_AUDIT_RIGHT_SWITCH */}
        {/* USER_ACCOUNTS_RIGHT_SWITCH */}
        {/* DATABASE_LIVE_RIGHT_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditSidePanel />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsSidePanel />
        ) : (
          <GlobalConfigLiveSidePanel />
        )}

'@

$content =
  $content.Substring(
    0,
    $rightSwitchStart
  ) +
  $rightReplacement +
  $content.Substring(
    $rightPanelClosingDiv
  )

Set-Content `
  -Path $dashboardPath `
  -Value $content `
  -Encoding utf8

# ============================================================
# ACADEMIC MATRIX
# ============================================================

if (Test-Path $academicPath) {
  $academic =
    Get-Content `
      -Path $academicPath `
      -Raw

  $initialStartMarker =
    "const INITIAL_DATA: AcademicMatrixData = {"

  $alertToneMarker =
    "const ALERT_TONES = {"

  $initialStart =
    $academic.IndexOf(
      $initialStartMarker
    )

  $alertToneStart =
    $academic.IndexOf(
      $alertToneMarker
    )

  if (
    $initialStart -ge 0 -and
    $alertToneStart -gt $initialStart
  ) {
    $emptyInitialData = @'
const INITIAL_DATA: AcademicMatrixData = {
  allocations: [],
  departmentPerformance: [],
  gpaSeries: [0],
  attendance: [0, 0, 0],
  alerts: [],
  resources: [],
}

'@

    $academic =
      $academic.Substring(
        0,
        $initialStart
      ) +
      $emptyInitialData +
      $academic.Substring(
        $alertToneStart
      )
  }

  $notificationStartMarker =
    "const notifications: AdminWorkspaceNotification[] = ["

  $panelInterfaceMarker =
    "interface PanelHeaderAction"

  $notificationStart =
    $academic.IndexOf(
      $notificationStartMarker
    )

  $panelInterfaceStart =
    $academic.IndexOf(
      $panelInterfaceMarker
    )

  if (
    $notificationStart -ge 0 -and
    $panelInterfaceStart -gt
    $notificationStart
  ) {
    $academic =
      $academic.Substring(
        0,
        $notificationStart
      ) +
      $academic.Substring(
        $panelInterfaceStart
      )
  }

  if ($academic -notmatch "const liveNotifications") {
    $returnMarker =
      "  return ("

    $returnStart =
      $academic.LastIndexOf(
        $returnMarker
      )

    if ($returnStart -lt 0) {
      throw "Could not locate the Academic Matrix return block."
    }

    $liveNotificationCode = @'
  const liveNotifications: AdminWorkspaceNotification[] =
    data.alerts
      .filter((alert) => alert.value > 0)
      .map((alert, index) => ({
        id: `academic-alert-${index}`,
        title: alert.label,
        description: `${alert.value} live database record${
          alert.value === 1 ? '' : 's'
        } require attention.`,
        tone:
          alert.tone === 'red'
            ? 'warning'
            : alert.tone === 'green'
              ? 'success'
              : 'info',
      }))

'@

    $academic =
      $academic.Insert(
        $returnStart,
        $liveNotificationCode
      )
  }

  $academic =
    $academic.Replace(
      "notifications={notifications}",
      "notifications={liveNotifications}"
    )

  Set-Content `
    -Path $academicPath `
    -Value $academic `
    -Encoding utf8
}

# ============================================================
# USER ACCOUNTS RIGHT PANEL
# ============================================================

if (Test-Path $userAccountsPath) {
  $accounts =
    Get-Content `
      -Path $userAccountsPath `
      -Raw

  $sidePanelMarker =
    "export function UserAccountsSidePanel()"

  $sidePanelStart =
    $accounts.IndexOf(
      $sidePanelMarker
    )

  if ($sidePanelStart -ge 0) {
    $dynamicSidePanel = @'
export function UserAccountsSidePanel() {
  const [data, setData] =
    useState<UserAccountsData | null>(
      null
    )

  useEffect(() => {
    void loadUserAccountsData().then(
      setData
    )
  }, [])

  const dispatch = (
    eventName: string
  ) => {
    window.dispatchEvent(
      new CustomEvent(eventName)
    )
  }

  const accountAlerts = [
    {
      title:
        'Pending approvals',
      description:
        `${data?.pendingCount ?? 0} account${
          data?.pendingCount === 1
            ? ''
            : 's'
        } currently require approval.`,
      Icon: Clock3,
    },
    {
      title:
        'Restricted accounts',
      description:
        `${data?.lockedCount ?? 0} account${
          data?.lockedCount === 1
            ? ''
            : 's'
        } currently have restricted access.`,
      Icon: LockKeyhole,
    },
    {
      title:
        'Active accounts',
      description:
        `${data?.activeCount ?? 0} account${
          data?.activeCount === 1
            ? ''
            : 's'
        } are currently active.`,
      Icon: UserCheck,
    },
  ]

  return (
    <div className="pt-2">
      <h3 className="mb-4 mt-8 text-sm font-bold text-white">
        Account Alerts
      </h3>

      <div className="space-y-4 border-t border-white/10 pt-4">
        {accountAlerts.map(
          ({
            title,
            description,
            Icon,
          }) => (
            <article
              key={title}
              className="flex gap-2.5"
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />

              <div>
                <p className="text-[10px] font-semibold text-white">
                  {title}
                </p>

                <p className="mt-1 text-[8px] leading-relaxed text-gray-400">
                  {description}
                </p>
              </div>
            </article>
          )
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-bold text-white">
          Quick Actions
        </h3>

        <div className="mt-4 space-y-4">
          <ActionButton
            label="Add User"
            Icon={Plus}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.add
              )
            }
          />

          <ActionButton
            label="Edit Role"
            Icon={Edit3}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.role
              )
            }
          />

          <ActionButton
            label="Lock / Unlock"
            Icon={Lock}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.lock
              )
            }
          />

          <ActionButton
            label="Export Users"
            Icon={Download}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.export
              )
            }
          />

          <ActionButton
            label="Refresh Accounts"
            Icon={RefreshCw}
            onClick={() =>
              dispatch(
                USER_ACCOUNTS_EVENTS.refresh
              )
            }
          />
        </div>
      </div>
    </div>
  )
}
'@

    $accounts =
      $accounts.Substring(
        0,
        $sidePanelStart
      ) +
      $dynamicSidePanel
  }

  Set-Content `
    -Path $userAccountsPath `
    -Value $accounts `
    -Encoding utf8
}

# ============================================================
# PACKAGE SCRIPT
# ============================================================

if (-not (Test-Path $packagePath)) {
  throw "package.json not found."
}

$package =
  Get-Content `
    -Path $packagePath `
    -Raw |
  ConvertFrom-Json

if (-not $package.scripts) {
  $package |
    Add-Member `
      -MemberType NoteProperty `
      -Name scripts `
      -Value ([pscustomobject]@{})
}

$package.scripts |
  Add-Member `
    -MemberType NoteProperty `
    -Name "audit:data" `
    -Value "node scripts/audit-static-runtime-data.mjs" `
    -Force

$package |
  ConvertTo-Json `
    -Depth 30 |
  Set-Content `
    -Path $packagePath `
    -Encoding utf8

Write-Host ""
Write-Host "Live database mode repaired successfully." -ForegroundColor Green
Write-Host "Backups: live-mode-backup" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next commands:" -ForegroundColor Cyan
Write-Host "  npx tsc --noEmit"
Write-Host "  npm run audit:data"