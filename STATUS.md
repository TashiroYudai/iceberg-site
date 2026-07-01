# iceberg-site — STATUS

最終更新: 2026-07-01

## 概要
田代雄大さんのビジネス用ホームページ。**コンセプト＝氷山＝「課題」**。
**正しい意味（2026-07-01 ユーザー訂正）**：見えている課題は氷山の一角にすぎず、
調べて潜るほど大きく深い**本当の課題**がある。それを**解決する手段**が
スマホアプリ／ホームページ／社内システム。
※旧版は「水面下＝設計と実装」という逆の意味だった→全文を課題ベースに書き換え済み。
公式プラグイン `frontend-design` のメソッドに沿って、アニメーション込みの
革新的デザインで制作（generic な「青いテックサイト」を避けるための自己批評済み）。

## 技術 / 構成（ユーザー選択）
- **単一 `index.html`**（CSS/JS 内蔵、依存ゼロ・どこでも即デプロイ）
- **1ページ LP**：スクロール＝潜水。水面上（明）→ 水面を越える → 深海（暗）へ降りる
- 会社情報は**プレースホルダ**（屋号 "Fathom Systems（左上ロゴ＝英語表記／ファゾムシステムズ）／株式会社ファゾムシステムズ（仮）"）

## デザイン要点
- シグネチャ＝**スクロールで水面下へ潜る**演出（背景色を sky→abyss に補間）＋
  右側の**潜水深度ゲージ＝潜水艦がレールを潜航**（0m〜−420m 実数表示／スクロール連動で艦が降下・深くなるほどサーチライト＆舷窓が点灯=`--lit`、**光色は浅い=シアン→深い=黄色**に`color-mix`で連続遷移（暗い水を切り裂く暖色の差し色／船首に暖色グロー）・スクリュー回転・気泡・ゆらぎ、reduced-motion対応、モバイルは小型表示。艦は**左向き横向き**）＋**水面を越える瞬間**
- 汎用 01/02/03 ではなく**深度メーター**（−60m/−180m/−280m/−420m）で
  「深い＝より基盤的」を表現
- 型：見出し Zen Kaku Gothic New / 本文 IBM Plex Sans JP / 計器 IBM Plex Mono
- 色：sky #cfe7f3 / glacier #74b9d8 / tide #1f6f96 / deep #0c3a57 / abyss #04141f /
  アクセント lumen #7fe6ff（生物発光のシアン）
- ヒーローに**作り込んだ結晶ファセットの氷山SVG（10% / 90%）**＝水面上は雪のハイライト稜線つき主峰＋副峰の3面、水面下は多面体マス（影/ハイライトのファセット・内部稜線・シアンの生物発光エッジ）、水面の光帯＋反射、水中の光のシャフト、アンビエント発光、全体がゆっくり浮遊（reduced-motion対応）。深度セクションに巨大「90%」＋10/60/30バー、
  アプローチは地層（strata）タイムライン
- アニメ：背景の潜水補間 / ゴッドレイ / 上昇する泡 / スクロールリビール /
  見出し下線ワイプ / カード hover / 深度ゲージ。**reduced-motion 対応済み**

## 3D奥行き演出（2026-07-01 追加 / 計画書: ~/.claude/plans/d-replicated-tulip.md）
依存ゼロのまま「全体的に奥行きのある3D的な動き」を追加（ユーザー選択：CSS3D＋視差＋canvas粒子／マウス＋ジャイロ／ダイナミック）。
- **背景の視差デプスフィールド**（z-index 再採番：sea -5 / far -4 / rays -3 / snow -2 / bubbles -1）。`#far`＝遠景の氷山シルエット、`#snow`＝canvasのマリンスノー微粒子（z深度でサイズ/alpha/速度/視差・DPR≤2・粒子数 PC≤150/SP45・スプライト drawImage・visibility一時停止）。
- **視点連動視差**：PCは `pointermove`、スマホは `deviceorientation`（iOSは `#tiltcta`「傾けて操作」タップで `requestPermission`＋localStorage記憶＋フォールバック）。`:root` に `--px/--py/--p` を毎フレーム1回書き、各レイヤーが `calc()` で消費。
- **単一 rAF ループ**：旧 `onScroll` を `applyScroll()`＋常時 `tick()`＋`scrollDirty` に統合（rAF重複排除）。`--p` でスクロール、`--px/--py` で視点、`--dive` で潜水艦ノーズ傾き（スクロール速度）。
- **CSS 3D**：`.hero{perspective}`＋`.grid/.hero-copy{preserve-3d}`、`.hero-head/.berg/.hero-body` を層別 `translateZ`＋ポインタ回転（PCは大きめ rotate、SPは並進）。氷山は `--p` で `rotateY/scale`。
- **3Dリビール**：`.reveal` を「深部から浮上」（`perspective()` 関数＋`translateZ/rotateX`）に。**カードチルト**：`.cards{perspective}`＋`.cards .card:hover` で rotateX/Y（矩形キャッシュ・hover端末のみ）。
- **重要不変条件**：`body/main/固定レイヤー/.gauge` 祖先に transform/perspective/filter を付けない（fixed含有ブロック維持）。カードは `.reveal` と hover の transform 競合を**特異度**で解決（`.cards .card:hover` 0,3,0 > `.reveal.in` 0,2,0）。
- **既知の注意**：Safari の backdrop-filter＋3D／iOSジャイロ許可は実機確認推奨。canvasの漂い・視差・チルト・潜水艦傾きは静止スクショ不可。

## 状態
- v1 デザイン完成・QA 済み（desktop + mobile、surface + deep の全セクションを
  ヘッドレス Chrome で目視確認、コントラスト/レスポンシブ OK）
- 3D奥行き演出 実装・静的QA済み（JS構文OK・hero/services/カードチルトを目視確認）。**動き（視差/粒子/チルト/傾き）は実機確認推奨**。

## 次にやること（差し替え＝3か所、index.html 内に PLACEHOLDER コメントあり）
1. `<title>` と nav の brand（社名）
2. `#contact` のメール / 電話 / 会社名
3. `footer` の社名・年
- その後：実績・お客様の声セクション追加、独自ドメイン、デプロイ（Netlify/Vercel/任意の静的ホスティングに index.html を置くだけ）
- 必要なら OGP 画像・favicon・お問い合わせフォーム（現状は mailto）

## プレビュー
ブラウザで `index.html` を直接開く（`open ~/dev/iceberg-site/index.html`）。

## 公開（GitHub Pages）2026-07-01
- **公開URL：https://tashiroyudai.github.io/iceberg-site/** （スマホ可・誰でも共有可）
- リポジトリ：https://github.com/TashiroYudai/iceberg-site （public・gh CLI で作成）
- **更新方法**：`index.html` を編集 → `cd ~/dev/iceberg-site && git add -A && git commit -m "..." && git push` → 数十秒で反映
- 独自ドメインを使う場合：リポジトリ設定 or `gh api .../pages` で CNAME 設定。
