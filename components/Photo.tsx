"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
export default function Photo({path,alt}:{path?:string;alt:string}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;setUrl("");if(path)void supabase!.storage.from("property-photos").createSignedUrl(path,3600).then(({data})=>{if(active)setUrl(data?.signedUrl??"");});return()=>{active=false;};},[path]);
 return url?<img className="property-photo" src={url} alt={alt}/>:<span className="building-symbol" aria-hidden="true">⌂</span>;
}
