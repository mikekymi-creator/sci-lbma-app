export function validPushEndpoint(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(u.hostname);
  } catch { return false; }
}
export function notificationBody(a: { score: number | null; upside?: number | null; cashflow?: number | null }) {
  const cashflow=a.cashflow??null;
  return `Score indicatif : ${a.score??"à compléter"}/100 · Cash-flow SCI estimé : ${cashflow===null?"à renseigner":Math.round(cashflow).toLocaleString("fr-FR")+" €/mois"}. Informations à vérifier avant décision.`;
}
