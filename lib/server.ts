import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function authenticate(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, "Supabase n’est pas configuré.");
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError(401, "Connexion requise.");
  const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Session expirée.");
  return { db, user: data.user };
}
export function adminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Worker: configuration Supabase serveur manquante.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function failure(e: unknown) {
  return NextResponse.json({ error: e instanceof ApiError ? e.message : "Opération impossible. Vérifiez les données et la configuration du serveur." }, { status: e instanceof ApiError ? e.status : 500 });
}
export async function member(db: SupabaseClient, household: string, user: string) {
  const { data, error } = await db.from("household_members").select("role").eq("household_id", household).eq("user_id", user).single();
  if (error || !data) throw new ApiError(403, "Vous n’êtes pas membre de cette SCI.");
  return data.role as string;
}
