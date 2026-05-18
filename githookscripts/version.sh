#!/usr/bin/env bash

# ============================================================
# Author      : Amit Kumar Giri (email: allyamit@gmail.com)
# File        : Auto Version Manager Script
# Description :
# This script automatically manages project versioning during
# Git commits by analyzing staged code changes.
#
# Features:
# - Reads current and fixed versions from PROJECT.md
# - Validates semantic version format (X.Y.Z)
# - Counts staged insertions and deletions from Git
# - Automatically increments:
#     Patch version   -> Small changes
#     Minor version   -> Medium changes
#     Major version   -> Large changes
# - Updates PROJECT.md with the new version
# - Adds updated file back to Git staging
#
# Purpose:
# Maintain automatic version control during Git commits
# without manual version updates.
# ============================================================

# set -euo pipefail -- uncomment for only windows


filename="PROJECT.md"

is_valid_version() {
  # Accepts exactly: digits.digits.digits (e.g., 1.2.3)
  [[ "${1:-}" =~ ^[0-9]+(\.[0-9]+){2}$ ]]
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ ! -f "$filename" ]]; then
  fail "Version file '$filename' does not exist."
fi

# Read first and second lines safely
first_line="$(sed -n '1p' "$filename")"
second_line="$(sed -n '2p' "$filename")"
third_line="$(sed -n '3p' "$filename")"

echo "The first line of the file '$filename' is:"
echo "$first_line"
echo "The second line of the file '$filename' is:"
echo "$second_line"

# Extract version values after '=' and trim spaces
version_value="$(printf '%s' "$first_line"  | cut -d'=' -f2- | tr -d '[:space:]')"
fixed_version_value="$(printf '%s' "$second_line" | cut -d'=' -f2- | tr -d '[:space:]')"
useversion=$(echo "$third_line" | cut -d'=' -f2)
echo "$useversion"

if (( useversion == 1 )); then
  echo "Commit with no version chage: $version_value"
fi

# Validate format before splitting
if ! is_valid_version "$version_value"; then
  fail "Invalid version format in line 1. Expected 'version=X.Y.Z' but got: '$first_line'"
fi

if ! is_valid_version "$fixed_version_value"; then
  fail "Invalid fixed version format in line 2. Expected 'version=X.Y.Z' but got: '$second_line'"
fi

# Parse versions into arrays (major.minor.patch)
IFS='.' read -r -a version_array <<< "$version_value"
IFS='.' read -r -a fixed_version_array <<< "$fixed_version_value"

echo "Parsed version: ${version_array[0]}.${version_array[1]}.${version_array[2]}"
echo "Parsed fixed version: ${fixed_version_array[0]}.${fixed_version_array[1]}.${fixed_version_array[2]}"

# Ensure version is at least the fixed version (major/minor/patch compare)
executeFlag=0
if (( fixed_version_array[0] > version_array[0] )); then
  executeFlag=1
elif (( fixed_version_array[0] == version_array[0] && fixed_version_array[1] > version_array[1] )); then
  executeFlag=1
elif (( fixed_version_array[0] == version_array[0] && fixed_version_array[1] == version_array[1] && fixed_version_array[2] > version_array[2] )); then
  executeFlag=1
fi

# Get total changed lines in staged changes: insertions + deletions
shortstat="$(git diff --cached --shortstat || true)"

insertions="$(printf '%s\n' "$shortstat" | sed -n 's/.* \([0-9]\+\) insertion.*/\1/p' | head -n1)"
deletions="$(printf '%s\n' "$shortstat" | sed -n 's/.* \([0-9]\+\) deletion.*/\1/p' | head -n1)"

insertions="${insertions:-0}"
deletions="${deletions:-0}"
modified_lines=$(( insertions + deletions ))

echo "Staged diff: $shortstat"
echo "Total modification lines in code (insertions+deletions): $modified_lines"

# If there are no staged changes, fail
if (( modified_lines == 0 )); then
  exit 1
fi

# Bump version based on thresholds
if ((executeFlag == 1 )); then
    version_array[0]="${fixed_version_array[0]}"
    version_array[1]="${fixed_version_array[1]}"
    version_array[2]="${fixed_version_array[2]}"
elif (( modified_lines < 300 )); then
  version_array[2]=$(( version_array[2] + 1 ))
elif (( modified_lines >= 300 && modified_lines < 3000 )); then
  version_array[1]=$(( version_array[1] + 1 ))
  version_array[2]=0
else
  version_array[0]=$(( version_array[0] + 1 ))
  version_array[1]=0
  version_array[2]=0
fi

new_version="version=${version_array[0]}.${version_array[1]}.${version_array[2]}"
echo "New $new_version"

# Update the first line
# NOTE:
# - GNU sed (Linux/Git Bash): sed -i works
# - macOS/BSD sed needs: sed -i '' ...
sed -i "1s/.*/$new_version/" "$filename"

git add "$filename"
exit 0