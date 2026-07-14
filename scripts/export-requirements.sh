#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

for pyproject in "$repo_root"/lambda_function/*/pyproject.toml; do
    dir="$(dirname "$pyproject")"
    echo "Exporting requirements for $dir"
    uv export --no-dev --no-editable --no-emit-project --project "$dir" -o "$dir/requirements.txt"
done
