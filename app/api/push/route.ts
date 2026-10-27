import { NextRequest, NextResponse } from "next/server";
import { authenticate, ApiError, failure } from "../../../lib/server";
import { validPushEndpoint } from "../../../lib/push";
import { z } from "zod";
export async function POST(request: NextRequest) {
 try {
  const { db, user } = await authenticate(request);
  const parsed = z.object({ endpoint: z.string().url().max(4000), keys: z.object({ p256dh: z.string().min(16).max(300), auth: z.string().min(8).max(100) }) }).safeParse(await request.json());
  if (!parsed.success || !validPushEndpoint(parsed.data.endpoint)) throw new ApiError(400, "Abonnement push invalide ou fournisseur non pris en charge.");
  const { error } = await db.from("push_subscriptions").upsert({ user_id: user.id, endpoint: parsed.data.endpoint, ...parsed.data.keys }, { onConflict: "endpoint" });
  if (error) throw new ApiError(400, "Impossible d’enregistrer cet appareil. Désactivez les notifications de l’ancien compte avant de changer de compte.");
  return NextResponse.json({ ok: true });
 } catch (e) { return failure(e); }
}
export async function DELETE(request: NextRequest) {
 try {
  const { db, user } = await authenticate(request);
  const { endpoint } = await request.json();
  const { error } = await db.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) throw new ApiError(400, "Désactivation impossible.");
  return NextResponse.json({ ok: true });
 } catch (e) { return failure(e); }
}
