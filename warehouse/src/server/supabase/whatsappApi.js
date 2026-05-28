// whatsappApi.js
// Utility to send WhatsApp messages using WhatsApp Business Cloud API

export async function sendWhatsAppInvoice({ phoneNumberId, to, template, accessToken, components, languageCode }) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: template,
      language: { code: languageCode || "en" },
      components: components || []
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
  return res.json();
}
