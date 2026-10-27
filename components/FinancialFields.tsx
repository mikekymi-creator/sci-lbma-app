"use client";
import {useId} from "react";
import type {Finance} from "../lib/finance";
import IndicatorHelp from "./IndicatorHelp";
import {fieldSourcing} from "../lib/data-sourcing";
import {evidenceOrigin,type EvidenceKey} from "../lib/evidence";
export const financialFields=[
 ['contribution','Apport (€)',0,1e8],['years','Durée (ans)',1,40],['rate','Taux nominal (%)',0,25],
 ['works','Travaux (€)',0,1e8],['notary_pct','Notaire (%)',0,30],['property_tax','Taxe foncière / an (€)',0,1e6],
 ['annual_charges','Copropriété / an (€)',0,1e6],['management_pct','Gestion / vacance (%)',0,100],
 ['cashflow_target','Objectif cash-flow / mois (€)',0,1e6],['market_price_m2','Prix de marché estimé / m² (€)',0,1e6],
 ['security_note','Note sécurité secteur (/10)',0,10],['social_pct','Logements sociaux secteur (%)',0,100],
] as const;
export default function FinancialFields({finance,onChange}:{finance:Finance;onChange:(f:Finance)=>void}){
 const prefix=useId();
 return <><div className="field-heading"><label className="check-label"><input type="checkbox" checked={finance.credit} onChange={e=>onChange({...finance,credit:e.target.checked})}/> Crédit porté par la SCI</label><IndicatorHelp name="credit"/></div><div className="form-grid">{financialFields.map(([key,label,min,max])=><div className="financial-field" key={key}><div className="field-heading"><label htmlFor={`${prefix}-${key}`}>{label}</label><IndicatorHelp name={key}/></div><input id={`${prefix}-${key}`} type="number" min={min} max={max} step={key==='years'?1:'any'} required={!['market_price_m2','security_note','social_pct'].includes(key)} value={finance[key]??""} onChange={e=>onChange({...finance,[key]:e.target.value===""?null:Number(e.target.value)})}/>{fieldSourcing[key as EvidenceKey]&&<small className="field-sourcing">{fieldSourcing[key as EvidenceKey]?.label}</small>}{finance.evidence?.[key as EvidenceKey]?.kind&&<small className="field-sourcing">Origine déclarée : {evidenceOrigin(finance.evidence[key as EvidenceKey])}</small>}</div>)}</div></>;
}
