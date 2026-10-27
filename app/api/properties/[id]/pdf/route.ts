import { NextRequest } from "next/server";
import { authenticate, ApiError, failure } from "../../../../../lib/server";
import { propertyPdf } from "../../../../../lib/pdf";
import type { Property } from "../../../../../lib/model";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {db}=await authenticate(request);
  const {id}=await params;
  const {data,error}=await db.from("properties").select("*").eq("id",id).single();
  if(error||!data)throw new ApiError(404,"Fiche introuvable.");
  return new Response(Buffer.from(await propertyPdf(data as Property)),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="dossier-lbma.pdf"',"Cache-Control":"no-store"}});
 }catch(e){return failure(e);}
}
