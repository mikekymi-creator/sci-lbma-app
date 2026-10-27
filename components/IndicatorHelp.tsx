"use client";
import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {indicatorHelp,type IndicatorKey} from "../lib/indicators";

/** Mouse, keyboard and touch help; the bubble remains readable when hovered. */
export default function IndicatorHelp({name}:{name:IndicatorKey}){
 const id=useId(),button=useRef<HTMLButtonElement>(null),bubble=useRef<HTMLSpanElement>(null),pinned=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12}),info=indicatorHelp[name];
 function cancel(){if(timer.current)clearTimeout(timer.current);}
 function show(){cancel();setOpen(true);}
 function hide(){cancel();if(!pinned.current)timer.current=setTimeout(()=>setOpen(false),180);}
 useEffect(()=>()=>cancel(),[]);
 useEffect(()=>{
  if(!open)return;
  function place(){const r=button.current?.getBoundingClientRect(),b=bubble.current;if(!r||!b)return;const width=b.offsetWidth,height=b.offsetHeight;setPosition({left:Math.max(12,Math.min(r.left,innerWidth-width-12)),top:Math.max(12,r.bottom+height+20<innerHeight?r.bottom+8:r.top-height-8)});}
  place();
  function outside(e:PointerEvent){if(!button.current?.contains(e.target as Node)&&!bubble.current?.contains(e.target as Node)){pinned.current=false;setOpen(false);}}
  function escape(e:KeyboardEvent){if(e.key==="Escape"){e.stopPropagation();pinned.current=false;setOpen(false);}}
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape,true);window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape,true);window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
 },[open]);
 return <><button type="button" className="indicator-help" ref={button} aria-label={`À propos : ${info.title}`} aria-describedby={open?id:undefined} onPointerEnter={e=>{if(e.pointerType==="mouse")show();}} onPointerLeave={hide} onFocus={show} onBlur={hide} onClick={e=>{e.preventDefault();e.stopPropagation();cancel();pinned.current=!pinned.current;setOpen(pinned.current);}}>?</button>{open&&createPortal(<span role="tooltip" id={id} ref={bubble} className="indicator-tooltip" style={position} onPointerEnter={cancel} onPointerLeave={hide}><strong>{info.title}</strong><span>{info.text}</span><small>Fermer : retoucher le ? ou toucher ailleurs · Échap au clavier.</small></span>,document.body)}</>;
}
