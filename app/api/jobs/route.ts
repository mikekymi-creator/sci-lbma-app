import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runJobs } from "../../../lib/jobs";
export const runtime="nodejs";
export const maxDuration=300;
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from("Bearer "+secret);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Accès refusé"},{status:401});
 try{return NextResponse.json(await runJobs());}catch{return NextResponse.json({error:"Worker indisponible ; vérifier la configuration serveur."},{status:503});}
}
