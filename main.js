/**
 * This template is a production ready boilerplate for developing with `PuppeteerCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require("apify");
const crypto = require("crypto");
const { handleLogin, handleApplication } = require("./src/routes");
const {
  logger,
  validateStartUrls,
  isLoginPage,
  activateDebugMode,
  takeScreenshot,
} = require("./src/tools");

Apify.main(async () => {
  const input = await Apify.getInput();
  const { startUrls, debugMode, proxyConfig } = input;
  const id = crypto.createHash("md5").update(input.username).digest("hex");
  if (debugMode) {
    activateDebugMode();
  }
  validateStartUrls(startUrls);

  const requestList = await Apify.openRequestList("start-urls", startUrls);
  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration(proxyConfig);

  const forceCloud = !0;
  const store = await Apify.openKeyValueStore("upwork-sessions", {
    forceCloud,
  });
  let session = await store.getValue(id);
  const crawler = new Apify.PuppeteerCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      persistStateKeyValueStoreId: "upwork-sessions",
      maxPoolSize: 1,
      sessionOptions: {
        id: session?.id,
      },
    },
    persistCookiesPerSession: true,
    handlePageTimeoutSecs: 60 * 4,
    navigationTimeoutSecs: 60 * 4,
    launchContext: {
      // Chrome with stealth should work for most websites.
      // If it doesn't, feel free to remove this.
      useChrome: true,
      stealth: true,
      launchOptions: {
        // slowMo: 150,//10 * (Math.floor(Math.random() * 10) + 5),
        headless: false,
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        // stealthOptions: {
        //     addPlugins: false,
        //     emulateWindowFrame: false,
        //     emulateWebGL: false,
        //     emulateConsoleDebug: false,
        //     addLanguage: false,
        //     hideWebDriver: true,
        //     hackPermissions: false,
        //     mockChrome: false,
        //     mockChromeInIframe: false,
        //     mockDeviceMemory: false,
        // },
        stealth: true,
        args: [
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--disable-notifications",
          "--window-size=1920,1080",
        ],
        useChrome: Apify.isAtHome(),
      },
    },
    preNavigationHooks: [
      async ({ page }) => {
        try {
          await page.setCookie(...session.cookies);
        } catch {}
      },
    ],
    handlePageFunction: async (context) => {
      const { url, session } = context.request;
      logger.info("Page opened.", { url });

      context.page
        .waitForSelector("#onetrust-accept-btn-handler", { timeout: 5000 })
        .then((button) => button.click())
        .then(() => logger.info("Cookies accepted"))
        .catch(() => logger.info("Failed to accept Cookies"));

      if (await isLoginPage(context.page)) {
        logger.info("Needs to login");
        await handleLogin(context, input);
        await store.setValue(
          id,
          await context.page.cookies(url).then((cookies) => ({
            cookies,
            id: session?.id,
          }))
        );
      } else {
        logger.info("No need to login");
      }
      await handleApplication(context, input);
      await store.setValue(
        id,
        await context.page.cookies(url).then((cookies) => ({
          cookies,
          id: session?.id,
        }))
      );
    },

    handleFailedRequestFunction: async (context) => {
      logger.error(`Url ${context.request.url} failed`);
      process.exit(1);
    },
  });

  logger.info("Starting the crawl.");
  await crawler.run();
  logger.info("Crawl finished.");
});
