import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return {name:'SCI LBMA — Base Camp',short_name:'LBMA',description:'Le camp immobilier de la SCI familiale.',start_url:'/',scope:'/',display:'standalone',background_color:'#f4f6f5',theme_color:'#12292b',lang:'fr',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/logo.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
}
