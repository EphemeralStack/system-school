import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const EXCLUDED = new Set([
  'node_modules',
  '.next',
  '.git',
  'appwrite-seed-output',
])

const RULES = [
  {
    name: 'Fallback dataset',
    pattern: /\b(?:FALLBACK|MOCK|SAMPLE)_[A-Z0-9_]+\b/g,
  },
  {
    name: 'Known static financial ledger',
    pattern: /\bfinancialLedgerData\b/g,
  },
  {
    name: 'Known static RBAC matrix',
    pattern: /\brbacMatrixData\b/g,
  },
  {
    name: 'Known placeholder person',
    pattern: /\b(?:John Doe|James Rodriguez|Emily Watson|Sarah Mitchell)\b/g,
  },
  {
    name: 'Static notification array',
    pattern: /const\s+notifications\s*=\s*\[/g,
  },
]

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue

    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

const findings = []
const files = await walk(ROOT)

for (const file of files) {
  const relative = path.relative(ROOT, file).replaceAll('\\', '/')

  if (
    relative.startsWith('scripts/') ||
    relative.includes('.test.') ||
    relative.includes('.spec.')
  ) {
    continue
  }

  const content = await fs.readFile(file, 'utf8')

  for (const rule of RULES) {
    const matches = [...content.matchAll(rule.pattern)]

    for (const match of matches) {
      const line =
        content.slice(0, match.index ?? 0).split(/\r?\n/).length

      findings.push({
        rule: rule.name,
        file: relative,
        line,
        match: match[0],
      })
    }
  }
}

console.log('')
console.log('Runtime static-data audit')
console.log('=========================')

if (findings.length === 0) {
  console.log('No known mock/fallback runtime datasets were found.')
  process.exit(0)
}

for (const finding of findings) {
  console.log(
    `${finding.file}:${finding.line} — ${finding.rule}: ${finding.match}`
  )
}

console.log('')
console.log(`${findings.length} suspicious runtime-data occurrence(s) found.`)
process.exitCode = 1
