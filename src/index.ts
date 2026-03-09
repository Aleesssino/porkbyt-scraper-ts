import puppeteer, { Browser, Page } from "puppeteer";
import { promises as fsPromises } from "fs";
import { simulateHumanDelay } from "./utils";
import "dotenv/config";
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
const d_token = process.env.DISCORD_TOKEN as string;
const d_chatId = process.env.DISCORD_CHAT_ID as string;
const br_username = process.env.BR_USERNAME as string;
const br_password = process.env.BR_PASSWORD as string;
const jsonFilePath = "data.json";

interface Article {
  title: string;
  link: string;
}

const authAndLogin = async (page: Page) => {
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

    await simulateHumanDelay();

    await page.locator("#password").click();
    await page.locator("#password").fill(br_password);

    await simulateHumanDelay();

    await page.locator('form button[type="submit"]').click();
    const navigationPromise = page.waitForNavigation();
    await navigationPromise;
  } catch (error) {
    console.log("auth error", error);
    throw error;
  }
};

const readJsonFile = async (filePath: string): Promise<Article[]> => {
  try {
    const data = await fsPromises.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return [];
  }
};

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

const scrapeNewOffers = async () => {
  const loginURL = "https://www.bezrealitky.cz/login";
  const filterURL = "https://www.bezrealitky.cz/vyhledat?watchdog=819320";
  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1950, height: 1591, deviceScaleFactor: 1 });
    await page.goto(loginURL, { waitUntil: "networkidle2" });

    // authenification
    await authAndLogin(page);

    await simulateHumanDelay();

    // close modal
    await page.locator("#path2").click();
    await page.locator("button span::-p-text(Nepovolit)").click();

    await simulateHumanDelay();

    // filter
    await page.locator("a ::-p-text(Zobrazit nabídky)").click();
    await page.goto(filterURL);

    // $x(`/html/body/div[1]/main/section/div/div[2]/div/div[7]/section/article/div[2]`)
    const articleData = await page.evaluate(() => {
      const data: Article[] = [];
      const articles = document.querySelectorAll(
        ".PropertyCard_propertyCardContent__osPAM",
      );

      articles.forEach((article) => {
        const titleElement = article.querySelector("h2");
        const title = titleElement
          ? titleElement.textContent?.trim() || "No title found"
          : "No title found";

        const anchorElement = article.querySelector("a");
        const link = anchorElement
          ? anchorElement.getAttribute("href") || "No link found"
          : "No link found";

        data.push({ title, link });
      });
      return data;
    });

    const validData = articleData.filter(
      (item) =>
        item.title !== "No title found" && item.link !== "No link found",
    );

    console.log("Article Data:", validData);

    return validData;
  } catch (error) {
    console.log("Scrape error:", error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const sendDiscordData = async (data: Article[]): Promise<void> => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(d_token);
    const channel = (await client.channels.fetch(d_chatId)) as TextChannel;

    if (!channel) throw new Error("Could't find Discord channel.");

    for (const item of data) {
      const embed = new EmbedBuilder()
        .setTitle(item.title)
        .setURL(
          item.link.startsWith("http")
            ? item.link
            : `https://www.bezrealitky.cz${item.link}`,
        )
        .setColor(0x00ae86)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await new Promise((res) => setTimeout(res, 500));
    }
    console.log(`Sent ${data.length} items to Discord.`);
  } catch (error) {
    console.error("Discord send error:", error);
  } finally {
    client.destroy();
  }
};

const sendDiscordError = async (errorMessage: string): Promise<void> => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  try {
    await client.login(d_token);
    const channel = (await client.channels.fetch(d_chatId)) as TextChannel;
    if (channel) {
      await channel.send(`⚠️ **Scraper Error:** ${errorMessage}`);
    }
  } finally {
    client.destroy();
  }
};

const main = async (): Promise<void> => {
  let newData: Article[] = [];
  try {
    newData = await scrapeNewOffers();
  } catch (error) {
    await sendDiscordError((error as Error).message);
    process.exit(1);
  }

  const currentData = await readJsonFile(jsonFilePath);
  const newItems = newData.filter(
    (item) =>
      !currentData.some((existingItem) => existingItem.link === item.link),
  );

  if (newItems.length > 0) {
    await sendDiscordData(newItems);
    const updatedData = [...currentData, ...newItems];
    await writeJsonFile(jsonFilePath, updatedData);
  } else {
    console.log("No new items to send.");
  }

  console.log("Task complete.");
  process.exit(0);
};

main();
