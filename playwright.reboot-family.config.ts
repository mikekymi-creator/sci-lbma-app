import {defineConfig} from "@playwright/test";
const url="http://127.0.0.1:4174/sci-lbma-app/famille/";
export default defineConfig({
 testDir:"tests/reboot-family",workers:1,timeout:60000,
 use:{baseURL:url,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??undefined,args:["--no-sandbox"]}},
 webServer:{command:"npm run reboot:build && npm run reboot:serve",url,timeout:120000,reuseExistingServer:false,
 env:{LBMA_DEPLOYMENT_MODE:"connected",LBMA_REBOOT_BASE:"/sci-lbma-app/famille/",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"test-public-identifier"}}
});