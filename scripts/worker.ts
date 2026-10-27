import { runJobs } from "../lib/jobs";
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.cwd());
let stopping=false;
process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
async function main(){
 do{
  try{console.log(JSON.stringify({time:new Date().toISOString(),...await runJobs()}));}
  catch(e){console.error(e instanceof Error?e.message:"Échec worker");if(process.argv.includes("--once")){process.exitCode=1;return;}}
  if(process.argv.includes("--once"))return;
  // Short waits permit clean shutdown without interrupting an in-flight database operation.
  for(let i=0;i<60&&!stopping;i++)await new Promise(r=>setTimeout(r,1000));
 }while(!stopping);
}
void main();
