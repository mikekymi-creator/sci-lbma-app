import { NextRequest, NextResponse } from "next/server";
import { authenticate, member, ApiError, failure } from "../../../lib/server";
import { propertySchema } from "../../../lib/model";
import { analyse } from "../../../lib/finance";
import { z } from "zod";
import { canonicalListingUrl } from "../../../lib/listings";
export async function POST(request:NextRequest){
 try{
  const {db,user}=await authenticate(request);
  const parsed=propertySchema.extend({id:z.string().uuid().optional(),listing_images:z.array(z.string().url().refine(s=>s.startsWith("https://"))).max(12).optional()}).safeParse(await request.json());
  if(!parsed.success)throw new ApiError(400,"Données invalides : "+parsed.error.issues.map(i=>i.path.join(".")).join(", "));
  const {id,...input}=parsed.data;await member(db,input.household_id,user.id);const a=analyse(input);
  const row={...input,listing_url:input.listing_url?canonicalListingUrl(input.listing_url):null,analysis_ready:a.complete&&Boolean(input.city.trim()&&input.description.trim()),score:a.score??0,cashflow:a.cashflow??0};
  const result=id?await db.from("properties").update(row).eq("id",id).eq("household_id",input.household_id).select().single():await db.from("properties").insert({...row,owner_id:user.id}).select().single();
  if(result.error)throw new ApiError(result.error.code==="23505"?409:400,result.error.code==="23505"?"Cette annonce existe déjà dans la SCI.":"Enregistrement refusé par la base. Vérifiez la migration et les droits.");
  return NextResponse.json(result.data);
 }catch(e){return failure(e);}
}
