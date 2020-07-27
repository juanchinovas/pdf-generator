const puppeteer = require('puppeteer-core');
const templateInitializer = require("./helper");
const logger = require("./logger");

let _options, templateHelper, browser, page;

const pageEvents = {
    'pageerror': err => {
        logger.readLog({text: err, type: "ERROR"});
    },
    'console': message => {
        logger.readLog({text: message.text(), type: message.type().substr(0, 3).toUpperCase()});
    },
    'response': response => {
        if (!(/;base64,/ig.test(response.url()))) {
            logger.readLog({text: `${response.status()} ${response.url()}`, type: "LOG"});
        }
    },
    'requestfailed': request => {
        logger.readLog({text: `${request.failure().errorText} ${request.url()}`, type: "ERROR"});
    }
}

/**
 * Initialize headless browser and new page
 */
async function init() {
    
    if (browser && page) {
        return;
    }

    if (!!!_options.URL_BROWSER) {
        logger.readLog({text: "No target browser found", type: "LOG"});
        throw "No target browser found";
    }

    logger.readLog({text: "Launching Browser", type: "LOG"});
    browser = await puppeteer.launch({
        executablePath: _options.URL_BROWSER,
        product: _options.BROWSER_NAME
    });

    logger.readLog({text: "Starting Page", type: "LOG"});
    page = await browser.newPage();

    for (let event in pageEvents) {
        if (pageEvents.hasOwnProperty(event)) {
            page.on(event, pageEvents[event]);
        }
    }
};

/**
 * Dispose everything, remove page events and close the headless browser
 */
async function closeBrowser() {
    if (templateHelper) {
        templateHelper.dispose();
        templateHelper = null;
    }
    _options = null;

    if(page) {
        for (let event in pageEvents) {
            if (pageEvents.hasOwnProperty(event)) {
                page.off(event, pageEvents[event]);
            }
        }

        logger.readLog({text: "Closing Browser", type: "LOG"});
        page = null;
    }

    if (browser) {
        await browser.close();
        browser = null;
    }
};

/**
 * Create a HTML file from the template file with its data, create the PDF file.
 * Load the HTML template file
 * 
 * @param data - {$templateName: string, $parameters: any, $extraParams: any}
 * 
 * @returns Promise<{fileName:string, buffer: Buffer}>
 */
function processTemplate(data) {

    return new Promise(async (res, rej) => {

        try {
            await init();

            let tempFile = await templateHelper.prepareTemplate(data);
            let urlTemplate = `http://localhost${ (_options.PORT && ':' + _options.PORT) || ''}/${tempFile.fileName}.html`;

            if (tempFile.urlTemplate) {
                urlTemplate = tempFile.urlTemplate || urlTemplate;
            }

            logger.readLog({text: `Loading ${urlTemplate}`, type: "LOG"});
            await page.goto(urlTemplate, { waitUntil: 'networkidle0' });

            const _footerHTML = await __getFooterTemplateFromTemplate(page);
            const _headerHTML = await __getHeaderTemplateFromTemplate(page);

            logger.readLog({text: `Creating PDF`, type: "LOG"});
            const pdfFileBuffer = await page.pdf({
                path: `${_options.PDF_DIR}/${tempFile.fileName}.pdf`,
                format: 'Letter',
                printBackground: true,
                displayHeaderFooter: true,
                footerTemplate: _footerHTML.footerTemplate,
                headerTemplate: _headerHTML.headerTemplate,
                margin: {
                    top: _headerHTML.marginTop,
                    bottom: _footerHTML.marginBottom,
                    left: _options.printingMarginLeft,
                    right: _options.printingMarginRight
                }
            });

            res({fileName: `${tempFile.fileName}.pdf`, buffer: pdfFileBuffer });
            templateHelper.deleteFile(`${_options.FILE_DIR}/${tempFile.fileName}.html`);
            
        } catch (err) {
            logger.readLog({text: err.stack, type: "ERROR"});
            rej(err.message);
        }

    });
}

/**
 * Read the template to footer from the HTML template
 * @param {*} page 
 */
async function __getFooterTemplateFromTemplate(page) {
    try {
        return await page.$eval("#page-footer", ele=> {
            const t = {
                marginBottom: ele.dataset.marginBottom || _options.printingMarginBottom,
                footerTemplate: ele.outerHTML
            };

            ele.style.display = "none";

            return t;
        });
    } catch (error) {
        logger.readLog({text: error.message + ". No footer template found", type: "WARN"});
    }

    return ({ footerTemplate: `<div style="margin: 0 13mm;display: flex; align-items: center; width:100%;justify-content: flex-end;">
    <p style="font-size: 8px;text-align: right; align-self: flex-end;">
        [<span class="pageNumber"></span>/<span class="totalPages"></span>]
    </p>
</div>`, marginBottom: _options.printingMarginBottom });
}

/**
 * Read the template to header from the HTML template
 * @param {*} page 
 */
async function __getHeaderTemplateFromTemplate(page) {
    try {
        return await page.$eval("#page-header", ele=> {
            const t = {
                marginTop: ele.dataset.marginTop || _options.printingMarginTop,
                headerTemplate: ele.outerHTML
            };

            ele.style.display = "none";

            return t;
        });
        
    } catch (error) {
        logger.readLog({text: error.message + ". No header template found", type: "WARN"});
    }

    return ({ headerTemplate: `<span></span>`, marginTop: _options.printingMarginTop });
}

module.exports.initialize = function(options) {
    const {
        BROWSER_NAME = "chrome",
        URL_BROWSER,
        FILE_DIR,
        PDF_DIR,
        PORT,
        printingMarginTop = "18mm",
        printingMarginBottom = "18mm",
        printingMarginLeft = "18mm",
        printingMarginRight = "18mm",
        TEMPLATE_DIR
    } = options;

    _options = {
        BROWSER_NAME,
        URL_BROWSER,
        FILE_DIR,
        PDF_DIR,
        PORT,
        printingMarginTop,
        printingMarginBottom,
        printingMarginLeft,
        printingMarginRight,
        TEMPLATE_DIR
    };

    templateHelper = templateInitializer.initialize(_options);

    return {
        processTemplate,
        dispose: async () => {
            await closeBrowser();
        }
    };
};