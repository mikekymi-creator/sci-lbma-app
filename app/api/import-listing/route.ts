import { NextRequest, NextResponse } from "next/server";
import { authenticate, failure, ApiError, member } from "../../../lib/server";
import { allowedUrl, respectfulFetch, extractListing } from "../../../lib/listings";
import { z } from "zod";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { db, user } = await authenticate(request);
    const parsed = z.object({ url: z.string().url().max(3000), household_id: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Lien ou SCI invalide.");
    await member(db, parsed.data.household_id, user.id);
    try {
      const url = allowedUrl(parsed.data.url).href;
      return NextResponse.json(extractListing(await respectfulFetch(url), url));
    } catch (e) { throw new ApiError(422, e instanceof Error ? e.message : "Import indisponible."); }
  } catch (e) { return failure(e); }
}
