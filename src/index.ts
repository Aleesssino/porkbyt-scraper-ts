import { promises as fsPromises } from "fs";
import puppeteer, { Browser, Page } from "puppeteer";

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
  } catch (error) {
    console.log("auth error", error);
  }
};

const scrapeNewOffers = async () => {
  const loginURL = "https://www.bezrealitky.cz/login";
  const filterURL = "https://www.bezrealitky.cz/vyhledat?watchdog=670830";
  try {
    const browser: Browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1950, height: 1591, deviceScaleFactor: 1 });
    await page.goto(loginURL, { waitUntil: "networkidle2" });

    // authenification
    await authenticate(page);

    // close modal
    await page.locator("#path2").setTimeout(sleepFor(2500, 3400)).click();
    const xButton = page.locator("button span::-p-text(Nepovolit)");
    await xButton.click();

    // Zobrazit nabídky
    await page.locator("a ::-p-text(Zobrazit nabídky)").click();
    await page.goto(filterURL);

    // (`/html/body/div[1]/main/section/div/div[2]/div/div[7]/section/article/div[2]`)    const articleData = await page.evaluate(() => {
    const articleData = await page.evaluate(() => {
      const data: { title: string; link: string; seen: boolean }[] = [];

      const articles = document.querySelectorAll(
        ".PropertyCard_propertyCardContent__osPAM",
      );

      // Iterate over each article
      articles.forEach((article) => {
        // Safely check for the existence of the title element
        const titleElement = article.querySelector("h2");
        const title = titleElement
          ? titleElement.textContent?.trim() || "No title found"
          : "No title found";

        // check for the existence of the anchor element
        const anchorElement = article.querySelector("a");
        const link = anchorElement
          ? anchorElement.getAttribute("href") || "No link found"
          : "No link found";

        const seen =
          document
            .querySelector(".PropertyCard_propertyCardTags__ocixT")
            ?.textContent?.includes("Zobrazeno") || false;

        // Add article data to array
        data.push({ title, link, seen });
      });
      return data;
    });

    console.log("Article Data:", articleData);

    await browser.close();

    // Create JSON
    async function saveArticleData() {
      try {
        await fsPromises.writeFile(
          "data.json",
          JSON.stringify(articleData, null, 2),
        );
        console.log("Successfully saved JSON");
      } catch (err) {
        console.error("Error saving JSON:", err);
      }
    }

    saveArticleData();
  } catch (error) {
    console.log(error);
  }
};

const main = async () => {
  await scrapeNewOffers();
};

main(); // bootstrap
