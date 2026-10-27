import {metricSignal,type IndicatorKey} from "../lib/indicators";
import IndicatorHelp from "./IndicatorHelp";
export default function Metric({name,title,value,formatted,target=0,testId}:{name:IndicatorKey;title:string;value:number|string|null;formatted:string;target?:number;testId?:string}){
 const signal=metricSignal(name,value,target);
 return <div className={`metric metric-${signal.tone}`}><div className="field-heading"><small>{title}</small><IndicatorHelp name={name}/></div><strong data-testid={testId}>{formatted}</strong><span className={`signal signal-${signal.tone}`}>{signal.label}</span></div>;
}
