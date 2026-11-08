import type {ReactNode,MouseEvent} from "react";
import type {SectionId,SectionCount} from "./section-completion";

type Props={
 id:SectionId;title:string;count:SectionCount;
 open:boolean;onToggle:(id:SectionId,open:boolean)=>void;
 children:ReactNode;className?:string;number?:string;description?:string;
};
export default function SectionAccordion({id,title,count,open,onToggle,children,className="",number,description}:Props){
 const toggle=(event:MouseEvent<HTMLElement>)=>{
  event.preventDefault();
  onToggle(id,!open);
 };
 return <details className={"rb-property-accordion "+className} data-section={id} open={open}>
  <summary onClick={toggle} aria-label={title+" — "+count.filled+" champs sur "+count.total+" renseignés"}>
   <span className="rb-property-section-heading">
    {number&&<span className="rb-property-step">{number}</span>}
    <strong>{title}</strong>
    {description&&<small>{description}</small>}
   </span>
   <span className="rb-property-section-aside">
    <small aria-label={count.filled+" sur "+count.total+" champs renseignés"} className="rb-section-count">{count.filled} / {count.total}</small>
    <span aria-hidden="true" className="rb-accordion-chevron">⌄</span>
   </span>
  </summary>
  <div className="rb-property-accordion-body">{children}</div>
 </details>;
}
