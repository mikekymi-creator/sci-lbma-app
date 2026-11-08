import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"tests/reboot",workers:1,
 use:{baseURL:"http://127.0.0.1:4174/sci-lbma-app/reboot/",
  launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??undefined,args:["--no-sandbox"]}},
 webServer:{command:"npm run reboot:serve",url:"http://127.0.0.1:4174/sci-lbma-app/reboot/",reuseExistingServer:false}
});
