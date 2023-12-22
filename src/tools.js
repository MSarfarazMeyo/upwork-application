const Apify = require('apify');

const crypto = require('crypto');

const { utils } = Apify;

exports.logger = utils.log;

/**
 * @param {Array<string>} urls
 */
exports.validateStartUrls = (urls) => {
    let hasError = false;
    urls.forEach(({requestsFromUrl} ) => {
 this.logger.info('processing url', { requestsFromUrl });
        
        if (!requestsFromUrl.match(/upwork\.com\/ab\/proposals\/job\/([^/]+)\/apply/)) {
            this.logger.error('Url not supported', { requestsFromUrl });
            hasError = true;
        }
    });
    if (hasError) {
        process.exit(0);
    }
};

exports.focusAndType = async (
    page,
    selector,
    value,
) => {
    if (!selector || !value) {
        return;
    }

    if (!(await page.$(selector))) {
        await page.waitForSelector(selector, {
            timeout: 5000,
        });
    }

    await page.focus(selector);
    await utils.sleep(500);
    await page.type(selector, value, { get delay() { return 5 * (Math.floor(Math.random() * 5) + 5) } });
    await utils.sleep(500);
};

exports.waitForComponentsToLoad = (
    page,
) => page.waitForFunction(
    () => !document.querySelectorAll('.up-loader-overlay.is-open').length,
    {
        polling: 500
    }
);

/**
 *
 * @param {ElementHandle} elHandler
 * @param {string} value
 */
exports.focusAndTypeHandle = async (elHandle, value) => {
    await elHandle.focus();
    await utils.sleep(1000);
    await elHandle.type(value);
};

exports.isLoginPage = async (page) => {
    if (await page.$('#login_username') !== null) {
        return true;
    }
    return false;
};

exports.activateDebugMode = () => {
    utils.log.setLevel(utils.log.LEVELS.DEBUG);
};

exports.takeScreenshot = async ({ request, page, number }) => {
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    // The record key may only include the following characters: a-zA-Z0-9!-_.'()
    const key = `${Date.now()}_${number}_` + crypto.createHash('md5').update(`${Date.now()}`).digest('hex');

    // Save the screenshot. Choosing the right content type will automatically
    // assign the local file the right extension, in this case .png.
    // The screenshots will be stored in ./apify_storage/key_value_stores/default/
    await Apify.setValue(key, screenshotBuffer, { contentType: 'image/png' });
    this.logger.debug(`Screenshot of ${request.url} saved.`);
};
