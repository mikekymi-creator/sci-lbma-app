import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"tests/preview",workers:1,use:{baseURL:"http://127.0.0.1:4173/sci-lbma-app/",launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??"/usr/bin/chromium",args:["--no-sandbox"]}},webServer:{command:"npm run preview:serve",url:"http://127.0.0.1:4173/sci-lbma-app/",reuseExistingServer:false}});
