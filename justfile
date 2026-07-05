_default:
    @just --list

# regenerate all data (index + scenes + content)
index:
	cargo run --release --quiet --manifest-path indexer/Cargo.toml
	just pack-data

# pack static/data/<slug>/ → static/data/<slug>.tar.zst (solid archive, for git)
pack-data:
	#!/usr/bin/env bash
	set -euo pipefail
	for slug in hk ss; do
		if [ -d "static/data/$slug" ]; then
			start=$(date +%s)
			(cd static/data && tar -cf - "$slug" | zstd --ultra -22 -q -o "$slug.tar.zst" -f)
			echo "packed $slug → $(du -h static/data/$slug.tar.zst | cut -f1) in $(($(date +%s) - start))s"
		fi
	done

# unpack committed data archives (for CI or fresh checkout)
unpack-data:
	bash scripts/unzip-data.sh

# render the OpenGraph social card: assets/og-image.svg → static/og-image.png (needs rsvg-convert)
og-image:
	rsvg-convert assets/og-image.svg -o static/og-image.png
	@echo "wrote static/og-image.png ($(du -h static/og-image.png | cut -f1))"

# dump all FSMs to pseudocode text files (requires unpacked data: just unpack-data)
dump-pseudo *args:
	cargo run --release --quiet --manifest-path indexer/Cargo.toml --bin dump-pseudo -- {{args}}

clean:
	rm -rf static/data
