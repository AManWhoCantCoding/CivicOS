<#
.SYNOPSIS
  Tạo/kiểm tra link skill: .agents\skills (nguồn duy nhất) -> thư mục skill của từng runtime.
.DESCRIPTION
  Dùng junction (không cần quyền admin). KHÔNG dùng `ln -s` trong Git Bash.
  Không có -Apply: chỉ kiểm tra, không sửa gì. Có -Apply: tạo junction còn thiếu
  (không đụng thư mục thật đang tồn tại; xử lý tay).
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1
  powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1 -Apply
  powershell -ExecutionPolicy Bypass -File scripts/setup-agent-tools.ps1 -Apply -Agent opencode,commandcode,claude
#>
[CmdletBinding()]
param(
  [ValidateSet('opencode', 'commandcode', 'claude')]
  [string[]]$Agent = @('opencode', 'commandcode'),
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root   = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $root '.agents\skills'
$map    = @{ opencode = '.opencode\skills'; commandcode = '.commandcode\skills'; claude = '.claude\skills' }
$script:fails = 0

function Report([string]$level, [string]$msg) {
  if ($level -eq 'FAIL') { $script:fails++ }
  Write-Host ("[{0}] {1}" -f $level, $msg)
}

# 1. Nguồn skill
if (-not (Test-Path $source)) { Report 'FAIL' '.agents\skills không tồn tại'; exit 1 }
$skillDirs = @(Get-ChildItem $source -Directory | Where-Object { $_.Name -notlike '_*' })
$names = @{}
foreach ($d in $skillDirs) {
  $md = Join-Path $d.FullName 'SKILL.md'
  if (-not (Test-Path $md)) { Report 'FAIL' "$($d.Name): thiếu SKILL.md"; continue }
  $text = Get-Content $md -Raw -Encoding UTF8
  if (-not ($text -match '(?s)^\s*---\s*\r?\n(.*?)\r?\n---')) { Report 'FAIL' "$($d.Name): thiếu frontmatter"; continue }
  $fm = $Matches[1]
  if (-not ($fm -match '(?m)^name:\s*(\S+)')) { Report 'FAIL' "$($d.Name): frontmatter thiếu name"; continue }
  $n = $Matches[1].Trim('"', "'")
  if ($fm -notmatch '(?m)^description:') { Report 'FAIL' "$($d.Name): frontmatter thiếu description" }
  if ($n -ne $d.Name) { Report 'WARN' "$($d.Name): name trong frontmatter là '$n'" }
  if ($names.ContainsKey($n)) { Report 'FAIL' "trùng tên skill '$n'" } else { $names[$n] = $true }
}
Report 'OK' ("{0} skill trong .agents\skills" -f $skillDirs.Count)

# 2. Link của từng runtime
foreach ($a in $Agent) {
  $rel    = $map[$a]
  $target = Join-Path $root $rel
  $item   = Get-Item $target -Force -ErrorAction SilentlyContinue
  if (-not $item) {
    if ($Apply) {
      New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
      New-Item -ItemType Junction -Path $target -Target $source | Out-Null
      Report 'OK' "${a}: đã tạo junction $rel -> .agents\skills"
    } else {
      Report 'FAIL' "${a}: chưa có $rel (chạy lại với -Apply)"
    }
    continue
  }
  if ($item.LinkType -eq 'Junction' -or $item.LinkType -eq 'SymbolicLink') {
    $dest = $item.Target | Select-Object -First 1
    if (-not $dest) { Report 'FAIL' "${a}: $rel là link nhưng không đọc được đích"; continue }
    $same = ([IO.Path]::GetFullPath([string]$dest)).TrimEnd('\') -ieq ([IO.Path]::GetFullPath($source)).TrimEnd('\')
    if ($same) { Report 'OK' "${a}: $rel đúng link" } else { Report 'FAIL' "${a}: $rel trỏ tới '$dest' (sai)" }
  } else {
    Report 'FAIL' "${a}: $rel là thư mục thật, không phải link (nguy cơ trùng/lệch skill). Chuyển sang .agents\skills-archive rồi chạy lại -Apply"
  }
}

# 3. Điểm vào
$agentsMd = Join-Path $root 'AGENTS.md'
if (Test-Path $agentsMd) { Report 'OK' 'AGENTS.md có ở gốc repo' } else { Report 'FAIL' 'thiếu AGENTS.md ở gốc repo' }
$claudeMd = Join-Path $root 'CLAUDE.md'
if (Test-Path $claudeMd) {
  if ((Get-Content $claudeMd -Raw -Encoding UTF8) -match '@AGENTS\.md') { Report 'OK' 'CLAUDE.md import AGENTS.md' }
  else { Report 'FAIL' 'CLAUDE.md không chứa @AGENTS.md' }
}

if ($script:fails -gt 0) { Write-Host "`n$($script:fails) vấn đề."; exit 1 }
Write-Host "`nDoctor: đạt. (Chưa gồm smoke test trong phiên thật: xem docs/agents/capability-matrix.md)"
exit 0
