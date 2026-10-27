import { z } from "zod";
export const defaultCriteria={
 centers:[{name:"Valenciennes",latitude:50.357,longitude:3.523},{name:"Beauvais",latitude:49.43,longitude:2.083}],
 radius_km:25,apartment_max_price:80000,apartment_min_surface:40,house_max_price:150000,
};
export const criteriaSchema=z.object({
 centers:z.array(z.object({name:z.string().min(1),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)})).min(1).max(20),
 radius_km:z.number().positive().max(200),apartment_max_price:z.number().positive(),apartment_min_surface:z.number().positive(),house_max_price:z.number().positive(),
});
export function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){
 const rad=(n:number)=>n*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function matchesCriteria(p:{city:string;price:number|null;surface:number|null;title:string;description:string;latitude?:number|null;longitude?:number|null;property_type?:string},criteria:unknown){
 const c=criteriaSchema.parse(criteria),norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const inArea=typeof p.latitude==="number"&&typeof p.longitude==="number"
  ?c.centers.some(center=>distanceKm(center,{latitude:p.latitude!,longitude:p.longitude!})<=c.radius_km)
  :c.centers.some(center=>norm(center.name)===norm(p.city));
 if(!inArea||p.price===null)return false;
 const type=norm(p.property_type??""),title=norm(p.title),description=norm(p.description);
 const apartment=type==="apartment"||(!type&&/appartement|\bt[1-9]\b|\bf[1-9]\b/.test(title));
 if(apartment)return p.price<=c.apartment_max_price&&p.surface!==null&&p.surface>=c.apartment_min_surface;
 const house=type==="house"||/maison|immeuble/.test(title);
 const multiple=/plusieurs (?:lots|logements|appartements)|(?:[2-9]|deux|trois|quatre) (?:lots|logements|appartements)|divis(?:ion|er|ible)|cre(?:er|ation) (?:de |des )?(?:plusieurs )?logements|immeuble de rapport/.test(title+" "+description);
 return house&&multiple&&p.price<=c.house_max_price;
}
