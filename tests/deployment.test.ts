import test from 'node:test';import assert from 'node:assert/strict';
import {deploymentConfig} from '../preview/deployment-config.mjs';
test('connected publication never falls back to demo or exposes a server key',()=>{
 assert.equal(deploymentConfig({}).connected,false);
 assert.throws(()=>deploymentConfig({LBMA_DEPLOYMENT_MODE:'connected'}),/requises/);
 const env={LBMA_DEPLOYMENT_MODE:'connected',NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
 assert.equal(deploymentConfig(env).connected,true);
 assert.throws(()=>deploymentConfig({...env,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_test'}),/jamais une clé serveur/);
 const jwt=(role:string)=>'header.'+btoa(JSON.stringify({role}))+'.signature';
 assert.throws(()=>deploymentConfig({...env,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('service_role')}),/jamais une clé serveur/);
 assert.equal(deploymentConfig({...env,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).connected,true);
 assert.throws(()=>deploymentConfig({...env,NEXT_PUBLIC_SUPABASE_URL:'http://project.supabase.co'}),/HTTPS/);
});
