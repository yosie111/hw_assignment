#!/bin/bash
# scripts/pre-submit-cleanup.sh
#
# Run ONCE before final submission.
# Deletes dead code files, converts test-output to UTF-8,
# and stages proof screenshot.
#
# Usage: bash scripts/pre-submit-cleanup.sh

set -e
echo "=== Pre-Submission Cleanup ==="

# -- 1. Delete dead code files --
DEAD_FILES=(
  "src/api/server2.js"
  "src/automation/browser/factory.js"
  "src/automation/browser/manager.js"
  "src/automation/index.js"
  "scripts/debug_amazon_login.js"
  "scripts/debug_amazon_selectors.js"
  "scripts/debug_amazon_stealth.js"
  "scripts/debug_connection.js"
  "scripts/save_amazon_session.js"
)

echo ""
echo "-- Removing dead code files --"
for f in "${DEAD_FILES[@]}"; do
  if [ -f "$f" ]; then
    git rm -f "$f" 2>/dev/null || rm "$f"
    echo "  Deleted: $f"
  else
    echo "  Already gone: $f"
  fi
done

# -- 2. Convert test-output.txt to UTF-8 --
echo ""
echo "-- Converting test-output.txt to UTF-8 --"
if [ -f "test-output.txt" ]; then
  # Check if file is UTF-16
  if file test-output.txt | grep -qi "utf-16"; then
    iconv -f UTF-16LE -t UTF-8 test-output.txt > test-output-clean.txt 2>/dev/null
    mv test-output-clean.txt test-output.txt
    echo "  Converted to UTF-8"
  else
    echo "  Already UTF-8"
  fi
fi

# -- 3. Ensure screenshots dir has .gitkeep --
echo ""
echo "-- Setting up screenshots directory --"
mkdir -p screenshots
touch screenshots/.gitkeep

# -- 4. Stage proof screenshot if exists --
PROOF=$(find screenshots/ -name "6-order-complete*.png" -type f 2>/dev/null | head -1)
if [ -n "$PROOF" ]; then
  git add -f "$PROOF"
  echo "  Staged proof: $PROOF"
else
  echo "  WARNING: No proof screenshot found. Run E2E test first:"
  echo "    npx jest tests/e2e/fullPurchase.e2e.test.js --runInBand"
fi

echo ""
echo "=== Done. Review with 'git status', then commit. ==="
