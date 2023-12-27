const Apify = require("apify");
const { Page } = require("puppeteer");
const {
  logger,
  focusAndTypeHandle,
  takeScreenshot,
  waitForComponentsToLoad,
  focusAndType,
} = require("./tools");
const got = require("got");
const fs = require("fs");
const stream = require("stream");
const url = require("url");
const path = require("path");
const { promisify } = require("util");

const pipeline = promisify(stream.pipeline);

const setProjectPaymentMethod = async (page) => {
  logger.info("Setting project payment method");
  const paymentMethodSelector = "input[name=milestoneMode][value=default]";
  const illustrationSelector = "up-c-illustration[name=proposal-one]";
  // await page.waitForSelector(paymentMethodSelector, { timeout: 5000 });
  if (await page.$(paymentMethodSelector)) {
    await page.$eval(paymentMethodSelector, (el) => {
      el.click();
    });
    logger.info("Found OLD project payment method form");
  }
  if (await page.$(illustrationSelector)) {
    await page.$eval(illustrationSelector, (el) => {
      el.click();
    });
    logger.info("Found NEW project payment method form");
  }
};

const setProjectDuration = async (page) => {
  logger.info("Setting project duration");
  await page
    .waitForSelector(
      '.fe-proposal-job-estimated-duration [role="combobox"], .fe-proposal-job-estimated-duration button',
      { visible: true, timeout: 5000 }
    )
    .then((button) => {
      button.click();
      logger.info("Setting project duration clicked.");
    });
  await Apify.utils.sleep(1500);
  logger.info("Setting project duration last item clicking.");
  await page
    .waitForSelector(".fe-proposal-job-estimated-duration ul li:last-child")
    .then((li) => {
      li.click();
      logger.info("Setting project duration last item clicked.");
    });
};

const setSriRate = async (page) => {
  logger.info("Setting sri rate");
  await page
    .waitForSelector('.sri-form-card [role="combobox"]', {
      visible: true,
      timeout: 5000,
    })
    .then((div) => div.click());
  await Apify.utils.sleep(800);
  await page
    .waitForSelector(".sri-form-card ul li:nth-child(1)")
    .then((li) => li.click());
};

const submitApplication = async (page) => {
  await Promise.race([
    page.waitForSelector("footer .air3-btn-primary").then(async (button) => {
      await button.evaluate((button) => button.scrollIntoView());
      await button.click();
    }),
    // page.waitForSelector('.fe-proposal-additional-details .up-btn-primary').then(
    //     async button => {
    //         await button.evaluate(button => button.scrollIntoView())
    //         await button.click();
    //     }
    // ),
  ]);
  await page
    .waitForSelector("label[data-test=understand-and-agree] input", {
      timeout: 5000,
      visible: true,
    })
    .then(async (checkbox) => {
      await checkbox.click();
      await page.click(
        ".fe-proposal-fixed-price-confirmation-dialog .air3-btn-primary"
      );
    })
    .catch((err) => {
      logger.info(err);
    });
};

/**
 *
 * @param {*} page
 * @param {string} defaultAnswer
 */
const fillQuestions = async (page, defaultAnswer) => {
  logger.info("Filling questions");
  const questions = await page.$$(".fe-proposal-job-questions textarea");
  logger.info(`${questions.length} found`);
  await questions.reduce(async (next, current) => {
    await next;
    return focusAndTypeHandle(current, defaultAnswer);
  }, Promise.resolve());
};

/**
 *
 * @param {Page} page
 */
exports.handleRefillConnects = async (page, autoRefillAmount) => {
  await page.waitForSelector(
    '#connects-dropdown .up-btn,[aria-labelledby*="selectConnectsNumber"]'
  );
  let chosed = false;
  do {
    await Apify.utils.sleep(1000);
    await page.click(
      '#connects-dropdown .up-btn,[aria-labelledby*="selectConnectsNumber"]'
    );
    await page
      .waitForXPath(
        `//li/span/span[contains(text(), '${autoRefillAmount} for')]/parent::span/parent::li`,
        { visible: true, timeout: 1000 }
      )
      .then((li) => {
        chosed = true;
        return li.click();
      })
      .catch(() => {});
  } while (!chosed);
  await Apify.utils.sleep(1000);
  await page.$eval("#footerButtonMain", (button) => button.scrollIntoView());
  await page.click("#footerButtonMain");
  await page.waitForNavigation();
  await page
    .waitForSelector('[data-qa="fulfill"]')
    .then((button) => button.click());
  // await Apify.utils.sleep(1000 * 2);
  await page.waitForNavigation();
};

/**
 *
 * @param {Object} context
 * @param {*} context.request
 * @param {Page} context.page
 * @param {*} context.session
 * @param {Apify.PuppeteerCrawler} context.crawler
 * @param {Object} input
 * @param {string} [input.coverLetter]
 * @param {string} [input.defaultAnswer]
 * @param {boolean} [input.testMode]
 */
exports.handleApplication = async (
  { request, page, session, crawler },
  {
    coverLetter,
    attachments = [],
    defaultAnswer,
    testMode,
    agency,
    freelancer,
    autoRefill,
    autoRefillAmount = "100",
    ignoreDuplicateProposals,
  }
) => {
  if (request.url.includes("connects")) {
    logger.info("Fill connects");
    await Promise.all([
      page
        .waitForXPath("//button[contains(text(), ' Buy Connects ')]")
        .then((button) => button.click()),
      page.waitForNavigation(),
    ]);
    await this.handleRefillConnects(page, autoRefillAmount);
    //Your Connects balance has been updated!
    return;
  }

  logger.info("Handling application URL");

  const alert = await page.$("div.alert-danger");
  if (alert) {
    const message = await page.evaluate((handle) => handle.innerText, alert);
    logger.error(message);
    return;
  }
  await waitForComponentsToLoad(page);
  await Apify.utils.sleep(7000);

  const title2 = await page.title();
  logger.info(`application title: ${title2}`);
  try {
    logger.warning("Taking screenshot2");
    await takeScreenshot({ request, page, number: 1 });
    logger.info(`page url: ${request.url}`);
  } catch (err) {
    logger.warning("Additional Logs2");
    logger.info(err);
  }

  if (agency) {
    logger.warning("Agency Options", agency);
    await page
      .waitForSelector(".air3-modal-footer button", {
        visible: true,
        timeout: 2000,
      })
      .then((button) => button.click())
      .catch(() => {});
    await Apify.utils.sleep(1000);
    await page
      .waitForSelector(
        ".nav-messages ~ .nav-dropdown-account .nav-item-label",
        { visible: true }
      )
      .then((button) => button.evaluate((button) => button.click()));
    await page
      .waitForXPath(
        `//li[contains(@class, "nav-dropdown-account") and contains(@class, "open")]//ul[contains(@class, "nav-dropdown-list")]//div[contains(text(), "${agency}")]/following::div[contains(text(), "Agency")]`
      )
      .then(async (div) => {
        const isSelected = await div.evaluate((div) =>
          div.closest("li").classList.contains("active")
        );
        if (!isSelected) {
          div.evaluate((div) => div.click());
          await page.waitForNavigation();
          await page.goto(request.url);
          await waitForComponentsToLoad(page);
        }
      });
    await page.waitForSelector('.up-fe-team-selector [role="combobox"]', {
      visible: true,
    });
    await Apify.utils.sleep(3000);
    await page.click('.up-fe-team-selector [role="combobox"]');
    await Apify.utils.sleep(1000);
    await page
      .waitForXPath(
        `//div[contains(@class, "up-fe-team-selector")]//ul/li//span[contains(text(), "${agency}")]//ancestor::li`
      )
      .then((li) => li.click());
    await page.waitForSelector(
      '.up-fe-contractor-selector [role="combobox"]:not(.is-disabled)',
      { visible: true }
    );
    await Apify.utils.sleep(3000);
    await page.click('.up-fe-contractor-selector [role="combobox"]');
    await Apify.utils.sleep(1000);
    if (!freelancer)
      freelancer = await page.evaluate(() =>
        document
          .querySelector(
            ".nav-messages ~ .nav-dropdown-account ul li a div div"
          )
          .textContent.trim()
      );
    await page
      .waitForXPath(
        `//div[contains(@class, "up-fe-contractor-selector")]//ul/li//span[contains(text(), "${freelancer}")]//ancestor::li`,
        { timeout: 5000, visible: true }
      )
      .then((li) => li.click())
      .catch((error) => {
        logger.error(error);
        logger.error(`Freelancer ${freelancer} not found`);
        process.exit(1);
      });
  } else {
    logger.warning("Freelancer Options");
    await Promise.all([
      page
        .waitForXPath(
          `//li[contains(@class, "nav-dropdown-account")][last()]//li[contains(@class, "active")]//div[contains(text(), "Agency")]`,
          { timeout: 10 * 1000 }
        )
        .then(async () => {
          logger.info("Account Selecting");
          await page
            .waitForSelector(
              ".nav-messages ~ .nav-dropdown-account .nav-item-label",
              { visible: true }
            )
            .then((button) => button.evaluate((button) => button.click()));
          await page.click(".nav-messages ~ .nav-dropdown-account ul li > a");
          await page.waitForNavigation();
          await page.goto(request.url);
          await waitForComponentsToLoad(page);
        }),
      page
        .waitForSelector(
          'label:has(input[name="contractor-selector"][value=true]', //'label:has(input[name="contractor-selector"])',
          { timeout: 10 * 1000 }
        )
        .then(async (label) => {
          logger.info("Freelance option selected");
          label.click();
        }),
    ]).catch((error) => logger.info(error));
  }

  let connectRefilled;

  await page
    .waitForSelector(".air3-modal-footer  button", {
      visible: true,
      timeout: 50000,
    })
    .then(async (button) => {
      console.log("Refill connects");
      await button.click();
      await this.handleRefillConnects(page, autoRefillAmount);
      connectRefilled = true;
    })
    .catch((error) => {
      console.log("Error while refilling connects");
      console.error(error);
      if (!error.message.includes("desktop-size-controls")) {
        return Promise.reject(error);
      }
    });

  if (connectRefilled) {
    await page.goto(request.url);
  }

  await waitForComponentsToLoad(page);

  try {
    await setProjectPaymentMethod(page);
  } catch (err) {
    logger.warning("No project payment method option found");
    logger.info(err);
  }

  try {
    await setProjectDuration(page);
  } catch (err) {
    logger.warning("No project duration option found");
    logger.info(err);
  }

  try {
    await setSriRate(page);
  } catch (err) {
    logger.warning("No sri option found");
    logger.info(err);
  }

  const { customCoverLetter } = request.userData;
  const jobCoverLetter = customCoverLetter || coverLetter;
  await focusAndType(page, `.cover-letter-area textarea`, jobCoverLetter);

  const input = await page.$('[type="file"]');
  for (const attachment of attachments) {
    const filename = path.parse(url.parse(attachment.url).pathname).base;
    const filepath = "./" + filename;
    await pipeline(got.stream(attachment), fs.createWriteStream(filepath));
    await input.uploadFile(filepath);
    await page.waitForSelector(`[aria-label="Delete attachment ${filename}"]`);
  }

  await fillQuestions(page, defaultAnswer);
  // await page.$eval('.layout-page-content', (el) => el.click());
  await Apify.utils.sleep(1000);

  if (autoRefill) {
    await Promise.race([
      page
        .waitForXPath(
          "//div[contains(text(), 'When you submit this proposal')]/strong"
        )
        .then((strong) =>
          strong
            .evaluate((strong) => strong.textContent)
            .then((connects) => parseInt(connects))
        ),
      page
        .waitForXPath(
          "//ng-pluralize[contains(text(), 'Connects')]/parent::span"
        )
        .then((strong) =>
          strong
            .evaluate((strong) => strong.textContent)
            .then((connects) => parseInt(connects.match(/\d+/)))
        ),
    ])
      .then((connects) => {
        logger.info(`Found ${connects} connects left`);
        if (connects < 10) {
          return crawler.requestQueue.addRequest({
            url: "https://www.upwork.com/nx/plans/connects/history",
          });
        }
      })
      .catch(async () => {
        await takeScreenshot({ request, page, number: 2 });
      });
  }

  if (!testMode) {
    await submitApplication(page);
    await Apify.utils.sleep(5000);
    await Promise.race([
      page
        .waitForSelector(".form-error", { visible: true, timeout: 10000 })
        .then(async () => {
          throw new Error(`${errors.length} validation errors found`);
        }),
      page
        .waitForSelector(
          "label[data-test=understand-and-agree]" /*'input[name=checkbox]'*/
        )
        .then(async (label) => {
          await label.click();
          await Apify.utils.sleep(1000);
          await page
            .waitForSelector(".air3-modal-footer .air3-btn-primary")
            .then((button) => button.click());
        }),
      page
        .waitForSelector(".up-alert.up-alert-danger", {
          visible: true,
          timeout: 10000,
        })
        .then(async (alert) => {
          const error = await alert.evaluate((div) => div.textContent);
          throw new Error(error);
        }),
      page
        .waitForSelector(".air3-alert.air3-alert-positive", {
          visible: true,
          timeout: 10000,
        })
        .then(async (alert) => {
          logger.info("Your proposal was submitted");
        }),
      page.waitForNavigation().then(() => {
        logger.info("Applied to job");
      }),
    ])
      .then(async () => {
        Apify.utils.sleep(3000);
        await takeScreenshot({ request, page, number: 3 });
      })
      .catch(async (error) => {
        logger.error(error.message);
        if (
          ignoreDuplicateProposals &&
          error.message.includes(
            "The user already has a pending proposal for this job"
          )
        ) {
          return Apify.utils.sleep(3000);
        }
        await takeScreenshot({ request, page, number: 4 });
        process.exit(1);
      });
  }
};

/**
 * @param {Object} context
 * @param {*} context.request
 * @param {*} context.page
 * @param {*} context.session
 * @param {string} securityQuestion
 */
exports.handleLogin = async (
  { request, page, session },
  { username, password, securityQuestion }
) => {
  logger.info("Logging in");

  const title = await page.title();
  logger.info(`title: ${title}`);
  if (title.includes("denied")) {
    session.retire();
    throw new Error(`Url has been blocked ${request.url}`);
  }

  try {
    logger.info("Typing username");
    await page.waitForSelector("#login_username", { visible: true });
    await focusAndType(page, "#login_username", username);
    await page.click("#login_password_continue");
    logger.info("Typing password");
    await page.waitForSelector("#login_password", { visible: true });
    await focusAndType(page, "#login_password", password);
    await page.waitForSelector("#login_control_continue", { timeout: 5000 });
    await page.click("#login_control_continue");

    logger.info("Validating login");

    await page
      .waitForSelector("#login_answer", { timeout: 10000 })
      .then(async () => {
        logger.info("Typing security question");
        await focusAndType(page, "#login_answer", securityQuestion);
        const rememberSelector = "#login_remember[value=true]";
        logger.info("Checking off remember selector");
        // if (await page.$(rememberSelector)) {
        //     await page.click(rememberSelector);
        // }
        logger.info("Continue to go applying page...");
        await page.click("#login_control_continue");
        logger.info("Continue Clicked");
      })
      .catch((error) => {
        logger.info("No validation required");
        logger.info(error);
      });
    // await page.waitForNavigation();

    logger.info("Logging in");
  } catch (err) {
    await takeScreenshot({ request, page, number: 5 });
    throw err;
  }
};
