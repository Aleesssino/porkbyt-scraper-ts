import puppeteer, { Browser, Page } from "puppeteer";
import { promises as fsPromises } from "fs";
import TelegramBot from "node-telegram-bot-api";
import { sleepFor } from "./utils";

const token = process.env.TELEGRAM_TOKEN as string;
const chatId = process.env.TELEGRAM_CHAT_ID as string;
const jsonFilePath = "data.json";

interface Article {
  title: string;
  link: string;
  sent: boolean;
}

// authenticate and log in to website
const authenticate = async (page: Page) => {
  // $x(`//input[@name="username"]`)
  try {
    await page.waitForSelector(
      "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
    );
    await page
      .locator("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll")
      .click();

    await page.locator("#username").click();
    await page.locator("#username").fill(br_username);

    await page.locator("#password").setTimeout(sleepFor(300, 1600)).click();
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

// Function to read JSON data from file
const readJsonFile = async (filePath: string): Promise<Article[]> => {
  try {
    const data = await fsPromises.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return [];
  }
};

// Function to write JSON data to file
const writeJsonFile = async (
  filePath: string,
  data: Article[],
): Promise<void> => {
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log("Successfully saved JSON");
  } catch (error) {
    console.error("Error saving JSON file:", error);
  }
};

// scrape data
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
    await page.locator("button span::-p-text(Nepovolit)").click();

    // filter
    await page
      .locator("a ::-p-text(Zobrazit nabídky)")
      .setTimeout(sleepFor(1000, 1345))
      .click();
    await page.goto(filterURL);

    // (`/html/body/div[1]/main/section/div/div[2]/div/div[7]/section/article/div[2]`)    const articleData = await page.evaluate(() => {
    const articleData = await page.evaluate(() => {
      const data: Article[] = [];
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

        data.push({ title, link, sent: false });
      });
      console.log(data);
      return data;
    });

    console.log("Article Data:", articleData);

    await browser.close();

    return articleData;
  } catch (error) {
    console.log(error);
    return [];
  }
};

// Function to send JSON data
const sendJsonData = async (
  bot: TelegramBot,
  data: Article[],
): Promise<void> => {
  try {
    const message = `Here is your data:\n\n${JSON.stringify(data, null, 2)}`;
    await bot.sendMessage(chatId, message);
    console.log(`JSON data sent to chat ID ${chatId} successfully.`);
  } catch (error) {
    console.error("Error sending JSON data:", error);
  }
};

// Main function to handle scraping and sending messages
const main = async (): Promise<void> => {
  const bot = new TelegramBot(token, { polling: true });

  const newData = await scrapeNewOffers();
  const currentData = await readJsonFile(jsonFilePath);

  // Find new items that haven't been sent yet
  const newItems = newData.filter(
    (item) =>
      !currentData.some(
        (existingItem) => existingItem.link === item.link && existingItem.sent,
      ),
  );

  if (newItems.length > 0) {
    await sendJsonData(bot, newItems);

    // Mark items as sent and update JSON file
    const updatedData = [
      ...currentData,
      ...newItems.map((item) => ({ ...item, sent: true })),
    ];
    await writeJsonFile(jsonFilePath, updatedData);
  }

  setTimeout(() => {
    console.log("Exiting program...");
    process.exit(0);
  }, 150000);
};

main(); // bootstrap
