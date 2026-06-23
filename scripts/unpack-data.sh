#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

for slug in hk ss; do
	src="static/data/$slug.tar.zst"
	if [ -f "$src" ]; then
		echo "unpacking $src ..."
		rm -rf "static/data/$slug"
		zstd -dq -c "$src" | tar -xf - -C static/data/
		echo "  → $(find static/data/$slug -type f | wc -l | tr -d ' ') files"
	fi
done
