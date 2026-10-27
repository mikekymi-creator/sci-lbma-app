export function validPushEndpoint(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(u.hostname);
  } catch { return false; }
}
export function notificationBody(a: { score: number | null; upside: number | null }) {
  return `Score : ${a.score ?? "à compléter"}/100 · Potentiel net estimé avant revente : ${a.upside === null ? "à renseigner" : Math.round(a.upside).toLocaleString("fr-FR") + " €"}.`;
}
