// Cloudflare Pages Function — POST /api/contact
// お問い合わせフォームの直接受信。任意で Turnstile（スパム対策）を検証し、
// チャット Webhook（Slack / Discord）や Resend メールに送信内容を届ける。
//
// Pages → Settings → Environment variables（Production / Preview）で設定:
//   NOTIFY_WEBHOOK   … Slack か Discord の Incoming Webhook URL（推奨・これだけで動く）
//   RESEND_API_KEY   … （任意）Resend の API キー。設定すると CONTACT_TO 宛にメールも送る
//   CONTACT_TO       … （任意）宛先。例 info@fathom-systems.jp
//   CONTACT_FROM     … （任意）Resend で検証済みの送信元。例 no-reply@notify.fathom-systems.jp
//   TURNSTILE_SECRET … （任意）Cloudflare Turnstile のシークレットキー
//
// 秘匿値はすべて環境変数。コードには何も埋め込まない（公開リポジトリでも安全）。

const HDRS = { 'content-type': 'application/json; charset=utf-8' };
const ok  = (data = {}) => new Response(JSON.stringify({ ok: true, ...data }), { headers: HDRS });
const bad = (status, error) => new Response(JSON.stringify({ ok: false, error }), { status, headers: HDRS });

const clip = (s) => String(s == null ? '' : s).slice(0, 5000);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function onRequestPost({ request, env }) {
  // --- parse body (JSON or form-encoded) ---
  let body;
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) body = await request.json();
    else body = Object.fromEntries(await request.formData());
  } catch {
    return bad(400, 'リクエストの形式が不正です。');
  }

  // --- honeypot: bots fill the hidden field → silently drop, pretend success ---
  if (clip(body.company_url).trim()) return ok({ dropped: true });

  // --- validate ---
  const name = clip(body.name).trim();
  const email = clip(body.email).trim();
  const message = clip(body.message).trim();
  if (!name || !email) return bad(422, '必須項目（お名前・メール）が未入力です。');
  if (!isEmail(email)) return bad(422, 'メールアドレスの形式をご確認ください。');

  // --- optional Turnstile verification ---
  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', clip(body['cf-turnstile-response']));
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);
    const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const vj = await vr.json().catch(() => ({}));
    if (!vj.success) return bad(403, 'スパム判定のため送信できませんでした。少し時間をおいて再度お試しください。');
  }

  // --- compose message ---
  const company = clip(body.company).trim();
  const tel = clip(body.tel).trim();
  const referrer = clip(body.referrer).trim();
  const topic = clip(body.topic).trim() || '未選択';
  const text = [
    '📩 新しいお問い合わせ',
    '────────────',
    `お名前：${name}`,
    `会社名・屋号：${company || '（未記入）'}`,
    `メール：${email}`,
    `電話：${tel || '（未記入）'}`,
    `ご紹介者：${referrer || '（未記入）'}`,
    `種類：${topic}`,
    '',
    'ご相談内容：',
    message || '（未記入）',
    '────────────',
  ].join('\n');

  let delivered = false;
  const errors = [];

  // --- deliver: chat webhook (Slack / Discord) ---
  if (env.NOTIFY_WEBHOOK) {
    try {
      // {content} は Discord、{text} は Slack が読む（互いに未知キーは無視される）
      const r = await fetch(env.NOTIFY_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text, text }),
      });
      if (r.ok) delivered = true; else errors.push(`webhook:${r.status}`);
    } catch (e) { errors.push(`webhook:${e}`); }
  }

  // --- deliver: email via Resend ---
  if (env.RESEND_API_KEY && env.CONTACT_TO) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env.CONTACT_FROM || 'onboarding@resend.dev',
          to: [env.CONTACT_TO],
          reply_to: email,
          subject: `【お問い合わせ】${topic}／${name}`,
          text,
        }),
      });
      if (r.ok) delivered = true; else errors.push(`email:${r.status}`);
    } catch (e) { errors.push(`email:${e}`); }
  }

  if (!delivered) {
    return bad(502, '送信先が未設定か、送信に失敗しました。' + (errors.length ? ` (${errors.join('; ')})` : '（環境変数 NOTIFY_WEBHOOK 等を設定してください）'));
  }
  return ok();
}

// POST 以外は 405
export const onRequestGet = () => bad(405, 'Method Not Allowed');

// 本番設定済み(2026-07-12)：RESEND_API_KEY / CONTACT_TO=info@fathom-systems.jp /
// CONTACT_FROM=noreply@fathom-systems.jp を Cloudflare Pages(Production) に登録。
// フォーム送信は Resend 経由で info@（iCloud）に届く。
