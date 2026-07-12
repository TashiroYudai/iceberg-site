# Cloudflare 移行手順（fathom-systems.jp）

GitHub Pages → **Cloudflare Pages** へ載せ替え、問い合わせフォームを直接受信にする手順。
コード側（`functions/api/contact.js` と `contact.html`）は対応済み。以下はダッシュボード作業。

> **最重要**：メール（iCloudカスタムドメイン）を壊さないこと。下記の保全レコードを必ず引き継ぐ。
> 途中まではいつでもネームサーバーを戻せば元に戻せる（ロールバック可）。

---

## 現状（移行前スナップショット）
- DNS 管理：お名前.com 系（`01〜04.dnsv.jp`）
- サイト：GitHub Pages（apex A = `185.199.108–111.153`、`www` → `tashiroyudai.github.io`）
- メール：iCloud カスタムメールドメイン（info@fathom-systems.jp が受信できている）

## 絶対に引き継ぐレコード（メール保全）
| Type | Name | Value | Proxy |
|---|---|---|---|
| MX | `@` | `mx01.mail.icloud.com`（優先度 10） | DNS only |
| MX | `@` | `mx02.mail.icloud.com`（優先度 10） | DNS only |
| TXT | `@` | `v=spf1 include:icloud.com ~all` | — |
| TXT | `@` | `apple-domain=Ksa0nfGUAauRb6zl` | — |
| CNAME | `sig1._domainkey` | `sig1.dkim.fathom-systems.jp.at.icloudmailadmin.com` | **DNS only（グレー雲）** |

※ MX / TXT はそもそもプロキシ不可。DKIM の CNAME は必ず「DNS only（グレー雲）」にする（オレンジ雲にすると DKIM が壊れる）。

---

## Phase 1 — Cloudflare にドメイン追加（まだ切り替わらない）
1. Cloudflare 無料アカウント作成 → **Add a site** → `fathom-systems.jp` → Free プラン。
2. 既存 DNS が自動インポートされる。上の「保全レコード」5件が入っているか確認し、無ければ手動追加。DKIM CNAME はグレー雲に。

## Phase 2 — ネームサーバー切り替え（ここが切り替え点）
3. Cloudflare が提示する 2 つのネームサーバー（例：`xxx.ns.cloudflare.com`）を控える。
4. **お名前.com** → 該当ドメイン → ネームサーバーを Cloudflare の 2 つに変更（`dnsv.jp` は削除）。
5. Cloudflare が **Active** になるまで待つ（通常 10 分〜数時間）。
6. **info@fathom-systems.jp 宛に自分でテストメールを送り、受信できるか確認**（保全レコードが効いていれば届く）。

## Phase 3 — Cloudflare Pages でサイトを配信
7. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → `TashiroYudai/iceberg-site`、ブランチ `main`。
   - Framework preset：**None** ／ Build command：**空** ／ Output directory：`/`
   - Save & Deploy → `xxxx.pages.dev` が発行される。まず **Phase 4 の設定を入れてから** `pages.dev` でフォームをテストすると安全。
8. Pages プロジェクト → **Custom domains** → `fathom-systems.jp` と `www.fathom-systems.jp` を追加。
   Cloudflare が Web 用レコードを自動で張り替える（GitHub Pages 向けの A/CNAME を置換）。→ この時点で公開サイトが Cloudflare Pages 配信になる。

## Phase 4 — フォーム受信の設定（Secrets）
9. 受信方法を決める（どちらか／両方）：
   - **Slack / Discord Webhook（推奨・最も簡単）**：チャンネルで Incoming Webhook を作成し URL を取得。スマホアプリに通知が届く。
   - **メール（任意・Resend）**：Resend アカウント作成＋送信ドメイン検証（DNS 追加）＋ API キー取得。
10. Pages → **Settings → Variables and secrets**（Production）に追加：
    - `NOTIFY_WEBHOOK` = Slack/Discord の Webhook URL ← **これだけで動く**
    - （任意）`RESEND_API_KEY` ／ `CONTACT_TO=info@fathom-systems.jp` ／ `CONTACT_FROM=no-reply@notify.fathom-systems.jp`
    - （任意）`TURNSTILE_SECRET`（Phase 5）
11. 再デプロイ後、フォームを送信 → Webhook 通知／メールが届き、画面に「送信完了」が出れば成功。

## Phase 5 —（任意）Turnstile でスパム対策強化
12. Cloudflare → **Turnstile** → `fathom-systems.jp` のウィジェット作成 → **Site key** と **Secret key** を取得。
13. `TURNSTILE_SECRET` を Pages に設定。フォーム HTML へのウィジェット埋め込み（Site key が必要）は担当に依頼すれば対応可。

## Phase 6 — 後片付け
14. GitHub → Settings → Pages のカスタムドメインは外してよい（残しても無害）。`CNAME` / `.nojekyll` は Cloudflare Pages では無視されるので残置可。
15. 以後も `main` に push すれば Cloudflare Pages が自動デプロイ（今までと同じ運用）。

---

## 注意・補足
- **SPF 競合**：将来 Resend でメール送信する場合、apex の SPF は iCloud 用なので、送信は専用サブドメイン（例 `notify.fathom-systems.jp`）から行うのが安全。
- **Resend 送信元**：`CONTACT_FROM` は Resend で検証済みのアドレスにする（未検証だと送れない）。
- **ロールバック**：Phase 3 前なら、お名前.com のネームサーバーを `dnsv.jp` に戻せば現状復帰。
- コード仕様：`/api/contact` が無い/失敗する環境では、フォームは自動的に mailto 送信へフォールバックする（移行中もサイトは機能）。
