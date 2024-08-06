import puppeteer, { Page } from "puppeteer";

import { sleepFor } from "./utils";

const authenticate = async (page: Page) => {
  // $x(`//input[@name="username"]`)
  try {
    await page.waitForSelector(
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
    );
    await page
      .locator("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll")
      .click();

    console.log(process.env.AUTH_USERNAME);
    await page.locator("#username").click();
    await page.locator("#username").fill(br_username);

    await page.locator("#password").setTimeout(sleepFor(300, 600)).click();
    await page.locator("#password").fill(br_password);

    await page
      .locator('form button[type="submit"]')
      .setTimeout(sleepFor(500, 1500))
      .click();
    const navigationPromise = page.waitForNavigation();
    await navigationPromise;
    // const hlidaciPesURL =
    //   "https://www.bezrealitky.cz/moje-bezrealitky/hlidaci-pes";
  } catch (error) {
    console.log("auth error", error);
  }
};

const actual_main = async () => {
  const loginURL = "https://www.bezrealitky.cz/login";
  const filterURL = "https://www.bezrealitky.cz/vyhledat?watchdog=670830";
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1950, height: 1591, deviceScaleFactor: 1 });
    await page.goto(loginURL, { waitUntil: "networkidle2" });

    // authenification
    await authenticate(page);

    // close modal
    await page.locator("#path2").setTimeout(3000).click();
    const xButton = page.locator("button span::-p-text(Nepovolit)");
    await xButton.click();

    // Zobrazit nabídky
    await page.locator("a ::-p-text(Zobrazit nabídky)").click();
    await page.goto(filterURL);
    await page.waitForNavigation();
  } catch (error) {
    console.log(error);
  }
};

const main = async () => {
  await actual_main();
};

main(); // bootstrap

function waitForXpath(p0: string, p1: number) {
  throw new Error("Function not implemented.");
}
