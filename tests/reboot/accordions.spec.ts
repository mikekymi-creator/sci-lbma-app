import {test,expect} from "@playwright/test";

const section=(page:any,id:string)=>page.locator('[data-section="'+id+'"]');
test("V0.4.1 dossier: accordions, live completion counters and explicit zero persist",async({page})=>{
 await page.setViewportSize({width:1440,height:960});
 await page.goto("./");
 await expect(page.getByRole("heading",{name:"Tableau de bord"})).toBeVisible();
 await page.getByRole("navigation",{name:"Navigation principale"}).getByRole("button",{name:"Mes biens"}).click();
 await page.getByRole("button",{name:"+ Ajouter un bien"}).click();
 await expect(section(page,"main")).toHaveAttribute("open","");
 await expect(section(page,"project")).toHaveAttribute("open","");
 for(const id of ["financing","operation","sci","risks","contact"])await expect(section(page,id)).not.toHaveAttribute("open","");
 await expect(section(page,"project").locator(".rb-section-count")).toHaveText("1 / 6");
 await expect(section(page,"main").locator(".rb-section-count")).toHaveText("1 / 7");
 await page.getByLabel("Nom du bien").fill("DÉMO · Accordéons");
 await expect(section(page,"main").locator(".rb-section-count")).toHaveText("2 / 7");
 await page.getByLabel("Prix d'achat").fill("102000");
 await expect(section(page,"project").locator(".rb-section-count")).toHaveText("2 / 6");
 await page.getByLabel("Frais d'agence").fill("50");
 await page.getByLabel("Frais d'agence").fill("0");
 await expect(section(page,"project").locator(".rb-section-count")).toHaveText("3 / 6");
 await page.getByRole("button",{name:"Tout ouvrir"}).click();
 for(const id of ["main","project","financing","operation","sci","risks","contact"]){
  await expect(section(page,id)).toHaveAttribute("open","");
 }
 await page.getByLabel("Loyer mensuel hors charges").fill("900");
 await expect(section(page,"operation").locator(".rb-section-count")).toHaveText("1 / 7");
 await page.getByLabel("Notes familiales").fill("Visite à organiser.");
 await expect(section(page,"contact").locator(".rb-section-count")).toHaveText("1 / 4");
 await page.getByRole("combobox",{name:"Niveau de risque — État du bâtiment"}).selectOption("moderate");
 await expect(section(page,"risks").locator(".rb-section-count")).toHaveText("1 / 6");
 await page.getByLabel("Part de terrain non amortissable").fill("0");
 await expect(section(page,"sci").locator(".rb-section-count")).toHaveText("1 / 11");
 await page.getByRole("button",{name:"Tout fermer"}).click();
 for(const id of ["main","project","financing","operation","sci","risks","contact"]){
  await expect(section(page,id)).not.toHaveAttribute("open","");
 }
 await expect(page.locator(".rb-results-column")).toBeVisible();
 await page.getByRole("button",{name:"Enregistrer le dossier"}).click();
 await expect(page.getByText("Dossier enregistré.")).toBeVisible();
 await expect(section(page,"collaboration")).not.toHaveAttribute("open","");
 await expect(section(page,"collaboration").locator(".rb-section-count")).toHaveText("0 / 3");
 await page.reload();
 await page.getByRole("navigation",{name:"Navigation principale"}).getByRole("button",{name:"Mes biens"}).click();
 await page.getByRole("button",{name:/DÉMO · Accordéons/}).click();
 await expect(section(page,"project").locator(".rb-section-count")).toHaveText("3 / 6");
 await expect(section(page,"contact").locator(".rb-section-count")).toHaveText("1 / 4");
 await expect(section(page,"risks").locator(".rb-section-count")).toHaveText("1 / 6");
 await expect(section(page,"sci").locator(".rb-section-count")).toHaveText("1 / 11");
 await section(page,"project").locator("summary").click();
 await expect(page.getByLabel("Frais d'agence")).toHaveValue("0");
});
test("V0.4.1 smartphone: all subsection controls remain usable without horizontal overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("./");
 await page.getByRole("button",{name:"Ouvrir le menu"}).click();
 await page.getByRole("navigation",{name:"Navigation mobile"}).getByRole("button",{name:"Mes biens"}).click();
 await page.getByRole("button",{name:/DÉMO · Appartement Beauvais/}).click();
 await expect(section(page,"project")).toHaveAttribute("open","");
 await expect(section(page,"contact")).not.toHaveAttribute("open","");
 await page.getByRole("button",{name:"Tout ouvrir"}).click();
 await expect(section(page,"contact")).toHaveAttribute("open","");
 await expect(section(page,"collaboration")).toHaveAttribute("open","");
 await page.getByLabel("Notes familiales").fill("Compte-rendu depuis mobile");
 await expect(section(page,"contact").locator(".rb-section-count")).toContainText("1 / 4");
 await page.getByRole("button",{name:"Tout fermer"}).click();
 await expect(section(page,"collaboration")).not.toHaveAttribute("open","");
 await expect(page.locator(".rb-results-column")).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
