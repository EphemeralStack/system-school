$ErrorActionPreference = "Stop"

$dashboardPath = Join-Path `
  $PSScriptRoot `
  "app\(dashboard)\admin\dashboard\page.tsx"

$authPath = Join-Path `
  $PSScriptRoot `
  "contexts\auth-context.tsx"

if (-not (Test-Path $dashboardPath)) {
  throw "Admin dashboard file not found at: $dashboardPath"
}

$content = Get-Content `
  -Path $dashboardPath `
  -Raw

# ------------------------------------------------------------
# 1. Add User Accounts component import
# ------------------------------------------------------------
if (
  $content -notmatch
  "UserAccountsSidePanel"
) {
  $financeImportEnd =
    "} from '@/components/dashboard/financial-audit/FinancialAuditDesk'"

  $importIndex =
    $content.IndexOf(
      $financeImportEnd
    )

  if ($importIndex -lt 0) {
    throw "Could not locate the Financial Audit import."
  }

  $lineEnd =
    $content.IndexOf(
      "`n",
      $importIndex
    )

  if ($lineEnd -lt 0) {
    $lineEnd =
      $content.Length
  }

  $userAccountsImport = @'

import UserAccountsDesk, {
  UserAccountsSidePanel,
} from '@/components/dashboard/user-accounts/UserAccountsDesk'
'@

  $content =
    $content.Insert(
      $lineEnd + 1,
      $userAccountsImport
    )
}

# ------------------------------------------------------------
# 2. Add User Accounts to the middle workspace switch
# ------------------------------------------------------------
if (
  $content -notmatch
  "USER_ACCOUNTS_MIDDLE_SWITCH"
) {
  $financeBranch = @'
        {activeSection === 'financial-audit' ? (
          <FinancialAuditDesk
            schoolId={schoolData?.$id}
          />
        ) : (
'@

  if (
    -not $content.Contains(
      $financeBranch
    )
  ) {
    throw "Could not locate the Financial Audit middle switch."
  }

  $replacement = @'
        {/* USER_ACCOUNTS_MIDDLE_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditDesk
            schoolId={schoolData?.$id}
          />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsDesk
            schoolId={schoolData?.$id}
            onAddStudent={handleAddStudent}
            onAddTeacher={handleAddTeacher}
            onAddApplicant={handleAddApplicant}
          />
        ) : (
'@

  $content =
    $content.Replace(
      $financeBranch,
      $replacement
    )
}

# ------------------------------------------------------------
# 3. Add User Accounts to the right-side switch
# ------------------------------------------------------------
if (
  $content -notmatch
  "USER_ACCOUNTS_RIGHT_SWITCH"
) {
  $rightBranch = @'
        {activeSection === 'financial-audit' ? (
          <FinancialAuditSidePanel />
        ) : (
'@

  if (
    -not $content.Contains(
      $rightBranch
    )
  ) {
    throw "Could not locate the Financial Audit right-panel switch."
  }

  $rightReplacement = @'
        {/* USER_ACCOUNTS_RIGHT_SWITCH */}
        {activeSection === 'financial-audit' ? (
          <FinancialAuditSidePanel />
        ) : activeSection === 'user-accounts' ? (
          <UserAccountsSidePanel />
        ) : (
'@

  $content =
    $content.Replace(
      $rightBranch,
      $rightReplacement
    )
}

Set-Content `
  -Path $dashboardPath `
  -Value $content `
  -Encoding utf8

# ------------------------------------------------------------
# 4. Make role-specific locked statuses block login
# ------------------------------------------------------------
if (Test-Path $authPath) {
  $authContent = Get-Content `
    -Path $authPath `
    -Raw

  if (
    $authContent -match
    "const BLOCKED_STATUSES = new Set\(\["
  ) {
    foreach (
      $status in @(
        "'on_leave'",
        "'retired'",
        "'rejected'"
      )
    ) {
      if (
        $authContent -notmatch
        [regex]::Escape($status)
      ) {
        $authContent =
          $authContent.Replace(
            "  'resigned',",
            "  'resigned',`r`n  $status,"
          )
      }
    }

    Set-Content `
      -Path $authPath `
      -Value $authContent `
      -Encoding utf8
  }
}

Write-Host `
  "User Accounts desk connected successfully." `
  -ForegroundColor Green

Write-Host `
  "Route: /admin/dashboard?section=user-accounts" `
  -ForegroundColor Green
