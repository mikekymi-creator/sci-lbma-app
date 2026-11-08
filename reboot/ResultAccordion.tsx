import type {ReactNode,MouseEvent} from "react";
import type {SectionCount,SectionId} from "./section-completion";

type ResultId=Extract<SectionId,"operation-results"|"is-results">;
type Props={
 id:ResultId;
 title:string;
 subtitle:string;
 count:SectionCount;
 open:boolean;
 onToggle:(id:ResultId,open:boolean)=>void;
 children:ReactNode;
 className?:string;
};

/** Right-hand read-only calculations, not editable "fields completed". */
export default function ResultAccordion({
 id,title,subtitle,count,open,onToggle,children,className=""
}:Props){
 const toggle=(event:MouseEvent<HTMLElement>)=>{
  event.preventDefault();
  onToggle(id,!open);
 };
 return <details className={"rb-result-card rb-result-accordion "+className}
  data-result-section={id} open={open}>
  <summary onClick={toggle}
   aria-label={title+" — "+count.filled+" indicateurs calculés sur "+count.total}>
   <span className="rb-result-accordion-title">
    <strong>{title}</strong>
    <small>{subtitle}</small>
   </span>
   <span className="rb-result-accordion-meta">
    <small className="rb-section-count"
     aria-label={count.filled+" sur "+count.total+" indicateurs calculés"}>
     {count.filled} / {count.total}
    </small>
    <span className="rb-accordion-chevron" aria-hidden="true">⌄</span>
   </span>
  </summary>
  <div className="rb-result-accordion-body">{children}</div>
 </details>;
}
