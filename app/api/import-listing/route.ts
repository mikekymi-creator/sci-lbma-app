import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function meta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp('<meta[^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]+content=["\\']([^"\\']*)["\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\']([^"\\']*)["\\'][^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]*>', "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return "";
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function jsonLd(html: string): any[] {
  const results: any[] = [];
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const add = (item: any) => {
        if (!item || typeof item !== "object") return;
        if (Array.isArray(item)) item.forEach(add);
        else {
          results.push(item);
          if (Array.isArray(item["@graph"])) item["@graph"].forEach(add);
        }
      };
      add(parsed);
    } catch { /* Ignore malformed structured metadata. */ }
  }
  return results;
}

function findNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.,]/g, "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const rawUrl = body.url?.trim();
  if (!rawUrl) return NextResponse.json({ error: "Collez le lien d'une annonce." }, { status: 400 });

  let url: URL;
  try { url = new URL(rawUrl); }
  catch { return NextResponse.json({ error: "Le lien fourni n'est pas une URL valide." }, { status: 400 }); }

  const host = url.hostname.toLowerCase();
  const allowed = host === "leboncoin.fr" || host.endsWith(".leboncoin.fr")
    || host === "seloger.com" || host.endsWith(".seloger.com")
    || host === "bienici.com" || host.endsWith(".bienici.com")
    || host === "logic-immo.com" || host.endsWith(".logic-immo.com");
  if (url.protocol !== "https:" || !allowed) {
    return NextResponse.json({ error: "Pour le moment, utilisez un lien HTTPS Leboncoin, SeLoger, Bien’ici ou Logic-Immo." }, { status: 400 });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LBMAPropertyImporter/1.0)", "Accept-Language": "fr-FR,fr;q=0.9" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow"
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Le site de l'annonce a refusé l'accès automatique (HTTP " + response.status + "). Vous pouvez saisir les informations manuellement." }, { status: 422 });
    }
    const html = (await response.text()).slice(0, 3_000_000);
    const structured = jsonLd(html);
    const product = structured.find((item) => /Product|RealEstateListing|Offer|Apartment|House/i.test(String(item["@type"] ?? ""))) ?? structured[0] ?? {};
    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    const address = product.address;
    const city = typeof address === "object" && address ? (address.addressLocality ?? "") : "";
    const title = String(product.name ?? meta(html, "og:title") ?? "").trim();
    const description = String(product.description ?? meta(html, "og:description") ?? "").trim();
    const image = typeof product.image === "string" ? product.image : Array.isArray(product.image) ? product.image[0] : meta(html, "og:image");
    const price = findNumber(offers?.price ?? product.price ?? meta(html, "product:price:amount"));
    const text = (title + " " + description + " " + html.slice(0, 500000)).replace(/<[^>]+>/g, " ");
    const surfaceMatch = text.match(/(?:surface(?:s+habitable)?|superficie)[^\d]{0,20}(\d{1,4}(?:[,.]\d{1,2})?)\s*m(?:²|2)/i)
      ?? text.match(/(\d{1,4}(?:[,.]\d{1,2})?)\s*m(?:²|2)\b/i);
    const surface = surfaceMatch ? Number(surfaceMatch[1].replace(",", ".")) : null;
    const dpeMatch = text.match(/(?:DPE|classe énergétique)[^A-G]{0,20}([A-G])\b/i);
    const dpe = dpeMatch?.[1] ?? "";
    const rentMatch = text.match(/(?:loyer(?:s+mensuel)?|loués+à)[^\d]{0,20}(\d[\d\s.,]*)\s*€/i);
    const rent = rentMatch ? findNumber(rentMatch[1]) : null;
    const success = Boolean(title || price || surface || description);
    if (!success) {
      return NextResponse.json({ error: "Le site n'a pas fourni de données lisibles. Cela arrive notamment lorsque Leboncoin bloque l'accès automatique. Vous pouvez conserver le lien et compléter la fiche manuellement." }, { status: 422 });
    }
    return NextResponse.json({
      title: title.replace(/\s*[|–-]\s*(Leboncoin|SeLoger|Bien'ici|Logic-Immo).*$/i, "").trim(),
      city: String(city),
      price,
      surface,
      rent,
      dpe,
      description: description.slice(0, 4000),
      image: image || "",
      url: url.toString(),
      source: host
    });
  } catch {
    return NextResponse.json({ error: "Impossible de lire cette annonce automatiquement. Le site peut bloquer les robots ou être temporairement indisponible ; vous pouvez compléter la fiche manuellement." }, { status: 422 });
  }
}
