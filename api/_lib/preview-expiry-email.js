const { copy } = require("./locale-copy");

const APP_ORIGIN = "https://www.luxeflexia.com";

function buildPreviewExpiryEmail(locale, firstName) {
  const name = firstName?.trim() || "";
  const greeting = name
    ? copy(locale, `Salut ${name},`, `Hi ${name},`)
    : copy(locale, "Salut,", "Hi,");

  const subject = copy(
    locale,
    "Ta photo LuxeFlexIA a expiré — recrée-la en 1 clic",
    "Your LuxeFlexIA photo expired — recreate it in one tap",
  );

  const body = copy(
    locale,
    "Le délai de ton aperçu verrouillé est passé. Ta création n'est plus disponible, mais tu peux relancer une transformation en quelques secondes.",
    "Your locked preview window has ended. Your creation is no longer available, but you can start a new transformation in seconds.",
  );

  const cta = copy(locale, "Recréer ma photo", "Create my photo again");
  const ctaUrl = `${APP_ORIGIN}/create?fresh=1&lang=${locale === "en" ? "en" : "fr"}`;

  const html = `<!DOCTYPE html>
<html lang="${locale === "en" ? "en" : "fr"}">
<body style="font-family:system-ui,sans-serif;background:#f5f0e8;padding:24px;color:#1a1408">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid rgba(201,162,39,0.25)">
    <p style="margin:0 0 12px;font-size:15px">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a4438">${body}</p>
    <a href="${ctaUrl}" style="display:inline-block;background:#c9a227;color:#1a1408;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${cta}</a>
    <p style="margin:24px 0 0;font-size:11px;color:#8a8275">LuxeFlexIA — ${copy(locale, "support.luxeflexia@gmail.com", "support.luxeflexia@gmail.com")}</p>
  </div>
</body>
</html>`;

  return { subject, html };
}

async function sendPreviewExpiryEmail({ to, locale, firstName }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_resend_key" };
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    "LuxeFlexIA <noreply@luxeflexia.com>";
  const uiLocale = locale === "en" ? "en" : "fr";
  const { subject, html } = buildPreviewExpiryEmail(uiLocale, firstName);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }

  return { sent: true };
}

module.exports = {
  buildPreviewExpiryEmail,
  sendPreviewExpiryEmail,
};
