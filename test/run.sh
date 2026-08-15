#!/bin/zsh
# 回帰テスト。ビルド不要・依存なしを保つため、macOS 同梱の JavaScriptCore で走らせる。
#   zsh test/run.sh
set -e
cd "$(dirname "$0")/.."

JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
[[ -x "$JSC" ]] || { echo "jsc が見つかりません: $JSC"; exit 1; }

"$JSC" test/harness.js app.js test/test.js
