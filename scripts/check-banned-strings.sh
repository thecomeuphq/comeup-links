#!/usr/bin/env bash
# Banned-string check for the Pages-published surface of comeup-links.
#
# Fails the build when a known-bad pattern would ship on thecomeuphq.com:
#   1. Gumroad checkout hosts (the retired, unpublished shop).
#   2. Personal privacy identifiers (employer, city, job-role phrases,
#      personal mailbox). These are stored ONLY as SHA-256 hashes of the
#      lowercased word or phrase, so this public script does not repeat
#      them. To add one: printf '%s' 'the phrase' | sha256sum
# Warns (does not fail) on the stale thecomeuphq.github.io origin, which
# still 301s to the custom domain from many existing pages.
#
# audit/, dev/, and gen/ are excluded from Pages by _config.yml and are not
# scanned here (gitleaks covers secrets everywhere).
set -euo pipefail

root="${1:-.}"
cd "$root"

fail=0

# ripgrep: when several globs match, the LAST one wins, so the exclusions
# must come after the file-type includes.
RG_SCOPE=(
  -g '*.html' -g '*.css' -g '*.js' -g '*.xml' -g '*.webmanifest'
  -g '!audit/**' -g '!dev/**' -g '!gen/**' -g '!node_modules/**' -g '!.git/**'
)

check_pattern () {
  local label="$1" pattern="$2" hint="$3" hits
  hits="$(rg -n -i -S "${RG_SCOPE[@]}" -e "$pattern" . || true)"
  if [[ -n "$hits" ]]; then
    echo "::error::BANNED: ${label}"
    echo "$hits" | cut -c1-300
    echo
    echo "Fix the root cause: ${hint}"
    echo
    fail=1
  fi
}

warn_pattern () {
  local label="$1" pattern="$2" hint="$3" hits count
  hits="$(rg -n -i -S "${RG_SCOPE[@]}" -e "$pattern" . || true)"
  if [[ -n "$hits" ]]; then
    count="$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
    echo "::warning::STALE: ${label} (${count} lines)"
    { printf '%s\n' "$hits" | head -n 20 | cut -c1-200; } || true
    echo "Fix when cleaning, not as a drive-by: ${hint}"
    echo
  fi
}

# 1. Dead / unpublished checkout paths must not return to live pages.
# Do not "fix" a hit by commenting the string out in HTML; remove the
# checkout CTA, or point at a real, tested destination Leroy approved.
check_pattern \
  "bradley57.gumroad.com in a published file" \
  'bradley57\.gumroad\.com' \
  "Gumroad checkout links were removed from live pages because the shop is not a shipped destination. Do not add them back. If a generator reintroduced this, stop and do not merge a rebuild."

check_pattern \
  "gumroad.com in a published file" \
  'gumroad\.com' \
  "No Gumroad URL (or Gumroad click tracker) should appear in Pages-published files. Do not run a generator rebuild onto main."

# 2. Privacy identifiers (hashed). Public branding is The Come Up HQ only.
python3 - <<'PY' || fail=1
import hashlib, os, re, sys

# sha256 of lowercased words / phrases (1-4 words). Never store plain text here.
BANNED = {
    "452ddac3092b5a859873096c3e55f0dbffc26c72f7cc9a50a75651ea3f13636a",
    "34acc78373b55bb185c82742dfece0006feb437107fd3076dadababbfef25dd0",
    "6cd37d7248fe4dd6ab8889a5682c1d45e2a88104e40fdb73b970f442d745df7b",
    "018f9f28a26c721820adbb48ff2c60c8e4a240e67995e413b80cb97217b58bbe",
    "e01c71aa6e125a711a298b35967d7c87e641d70a68d69286d8a9642949ad6c05",
    "cdacfe05b28c662be2ce66a9b67c6f31b207d212e3ab2c4eb5551341276aee6c",
    "fd176184663c0c24a8e35273b55b3141d4a351252feb90a0e3c99ab25bcb3e7d",
    "7cf56312526edd4be62ba664e509d6e4936aa30b2989d9c7ede8b1d7f6d6a193",
}
EXT = (".html", ".css", ".js", ".xml", ".webmanifest")
SKIP = {".git", "audit", "dev", "gen", "node_modules"}
TOKEN = re.compile(r"[a-z0-9][a-z0-9@._'\u2019-]*[a-z0-9]|[a-z0-9]")

hits = 0
for dirpath, dirnames, filenames in os.walk("."):
    dirnames[:] = [d for d in dirnames if not (dirpath == "." and d in SKIP) and d != ".git"]
    for fn in filenames:
        if not fn.endswith(EXT):
            continue
        path = os.path.join(dirpath, fn)[2:]
        try:
            lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
        except OSError:
            continue
        for ln, line in enumerate(lines, 1):
            toks = [t.replace("\u2019", "'") for t in TOKEN.findall(line.lower())]
            seen = set()
            for n in range(1, 5):
                for i in range(len(toks) - n + 1):
                    h = hashlib.sha256(" ".join(toks[i:i + n]).encode()).hexdigest()
                    if h in BANNED and h not in seen:
                        seen.add(h)
                        hits += 1
                        print(f"{path}:{ln}: privacy identifier (hash {h[:12]})")
if hits:
    print("::error::BANNED: personal privacy identifier in a published file "
          f"({hits} hit(s)). Public branding is The Come Up HQ only: remove "
          "employer, workplace, city, job-role and personal-mailbox details "
          "and reword the copy. Do not work around this check.")
    sys.exit(1)
PY

# 3. Stale origin: warn only. Promote to check_pattern once cleaned up.
warn_pattern \
  "thecomeuphq.github.io used in published files" \
  'thecomeuphq\.github\.io' \
  "Use https://thecomeuphq.com/... or a relative path. gen/ SITE constants already point at thecomeuphq.com."

if [[ "$fail" -ne 0 ]]; then
  echo "Banned-string check failed. Do not merge until the published files are clean."
  exit 1
fi

echo "Banned-string check passed on the published surface."
