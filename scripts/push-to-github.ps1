# Push IT Asset Platform to your personal GitHub account (not an organization).
# Prerequisites: GitHub CLI installed and logged in with your PERSONAL account.
#   gh auth login -h github.com -p https -w

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is not installed. Install from https://cli.github.com/"
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged into GitHub. Run this first (choose your PERSONAL account, not an org):"
  Write-Host "  gh auth login -h github.com -p https -w"
  exit 1
}

$username = gh api user -q .login
Write-Host "Logged in as: $username (personal account)"

$repoName = "it-asset-platform"
if ($args.Count -gt 0) { $repoName = $args[0] }

$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
  Write-Host "Remote 'origin' already exists: $existingRemote"
} else {
  gh repo create "$username/$repoName" --public --source=. --remote=origin --description "IT Asset & Remote Management Platform demo"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create repo. If it already exists, run: git remote add origin https://github.com/$username/$repoName.git"
  }
}

git branch -M main
git push -u origin main

Write-Host ""
Write-Host "Done! Repository: https://github.com/$username/$repoName"
