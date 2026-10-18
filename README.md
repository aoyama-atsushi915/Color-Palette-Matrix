# Material Matrix（Color Palette Matrix）

> **開発は unitcell tools に移りました（2026-10-18）。**
> 最新版は **https://tools.unitcell.design/color/** で使えます。旧 URL（color.unitcell.design）は自動で転送されます。
> このリポジトリは移す前の版のまま残しています。今後の更新はここには入りません。
>
> **Development has moved to unitcell tools (2026-10-18).**
> The latest version is at **https://tools.unitcell.design/color/**. The old URL (color.unitcell.design) redirects there automatically.
> This repository is kept as the pre-move snapshot and will not receive further updates.

1つの基準色から、調和のとれた19色相×14トーン（計266色）のマテリアルデザインのパレットを生成する単体の HTML です。CSS 変数・Tailwind・SCSS・CSV・JSON で書き出せます。

## 使い方

`index.html` をブラウザで開くだけで動きます（ビルド不要・依存なし）。

## テスト

```
zsh test/run.sh
```

macOS 同梱の JavaScriptCore で走らせます。
