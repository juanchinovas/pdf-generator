const puppeteer = require('puppeteer-core');
const templateInitializer = require("./helper");
const logger = require("./logger");

let browser, page;

const pageEvents = {
    'pageerror': err => {
        logger.writeLog({ text: err, type: "ERROR" });
    },
    'error': err => {
        logger.writeLog({ text: err, type: "ERROR" });
    },
    'console': message => {
        let msgs = message.args()
            .map(m => {
                if (m && m._remoteObject.preview && m._remoteObject.preview.subtype !== "error") {
                    const obj = m._remoteObject.preview.properties.reduce((a, i) => (a[i.name] = i.value, a), {});
                    return JSON.stringify(obj, null, 2);
                }
                if (m && m._remoteObject.description) {
                    return m._remoteObject.description;
                }
                if (m && m._remoteObject.value) {
                    return m._remoteObject.value;
                }

                return undefined;
            });
        logger.writeLog({ text: msgs.join(" "), type: message.type().substr(0, 3).toUpperCase() });
    },
    'response': response => {
        if (!(/;base64,/ig.test(response.url()))) {
            logger.writeLog({ text: `${response.status()} ${response.url()}`, type: "LOG" });
        }
    },
    'requestfailed': request => {
        logger.writeLog({ text: `${request.failure().errorText} ${request.url()}`, type: "ERROR" });
    }
}

/**
 * Initialize headless browser and new page
 */
async function init(options) {

    if (browser && page) {
        return [browser, page];
    }

    if (!!!options.URL_BROWSER) {
        throw new Error("No target browser found");
    }

    logger.writeLog({ text: "Launching Browser", type: "LOG" });
    const _browser = await puppeteer.launch({
        executablePath: options.URL_BROWSER,
        product: options.BROWSER_NAME
    });

    logger.writeLog({ text: "Starting Page", type: "LOG" });
    const _page = await _browser.newPage();

    for (let event in pageEvents) {
        if (pageEvents.hasOwnProperty(event)) {
            _page.on(event, pageEvents[event]);
        }
    }

    return [_browser, _page];
};


/**
 * Dispose everything, remove page events and close the headless browser
 */
async function closeBrowser({ templateHelper, browser, page }) {
    if (templateHelper) {
        templateHelper.dispose();
        templateHelper = null;
    }

    if (page) {
        for (let event in pageEvents) {
            if (pageEvents.hasOwnProperty(event)) {
                page.off(event, pageEvents[event]);
            }
        }

        logger.writeLog({ text: "Closing Browser", type: "LOG" });
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
function processTemplate({ data, options, pdfMergeDelegator, templateHelper }) {
    return new Promise(async (res, rej) => {
        try {
            const [_browser, _page] = await init(options);
            browser = _browser;
            page = _page;

            let tempFile = await templateHelper.prepareTemplate(data);
            let urlTemplate = `${options.templateServerUrl}/${tempFile.fileName}.html`;
            let templateType = 'application/pdf';
            let templateBuffer = null;
            let totalPages = 0

            if (tempFile.urlTemplate) {
                urlTemplate = tempFile.urlTemplate || urlTemplate;
            }

            logger.writeLog({ text: `Loading ${urlTemplate}`, type: "LOG" });
            await page.goto(urlTemplate, { waitUntil: 'networkidle0' });

            if (tempFile.previewHTML !== true) {
                logger.writeLog({ text: `Creating PDF`, type: "LOG" });
                
                let _footerHTML = await __getFooterTemplateFromTemplate(page.$eval.bind(page), options);
                let _headerHTML = await __getHeaderTemplateFromTemplate(page.$eval.bind(page), options);
                const pdfOptions = {
                    path: `${options.PDF_DIR}/${tempFile.fileName}.pdf`,
                    format: options.paperFormat ?? 'Letter',
                    printBackground: true,
                    displayHeaderFooter: true,
                    footerTemplate: _footerHTML.footerTemplate,
                    headerTemplate: _headerHTML.headerTemplate,
                    preferCSSPageSize: tempFile.preferCssPage ?? false,
                    margin: {
                        top: _headerHTML.marginTop,
                        bottom: _footerHTML.marginBottom,
                        left: options.printingMarginLeft,
                        right: options.printingMarginRight
                    },
                    height: options.height,
                    width: options.width
                };
                if (tempFile.orientation === "horizontal") {
                    pdfOptions.landscape = true;
                    page.addStyleTag({ 'content': '@page { size: A4 landscape; }' });
                }
                // Don't save the pdf 
                if (tempFile.preview === true) {
                    delete pdfOptions.path;
                }
                
                ({ buffer: templateBuffer, totalPages } = await resolvePdfTotalPage({ 
                    pagePdfGenFn: page.pdf.bind(page), 
                    pdfOptions, 
                    pageEvalFn: page.$eval.bind(page),
                    pdfMergeDelegator,
                    templateHelper
                }));
                
                // Generate pdf with custom header y footer 
                if (tempFile.customPagesHeaderFooter) {
                    [templateBuffer, templateType] = await generatePdfWithCustomHeaderAndFooter({
                        pdfOptions,
                        logger,
                        pdfMergeDelegator,
                        tempFile,
                        templateHelper,
                        totalPages,
                        options
                    });
                }
            } else {
                templateType = 'text/html';
                templateBuffer = Buffer.from(await page.content(), 'utf8');
            }
            
            res({ totalPages, fileName: `${tempFile.fileName}.pdf`, buffer: templateBuffer, templateType });
            templateHelper.deleteFile(`${options.FILE_DIR}/${tempFile.fileName}.html`);
        } catch (err) {
            logger.writeLog({ text: err.stack, type: "ERROR" });
            rej(err.message);
        } finally {
            data = null;
            options = null;
            pdfMergeDelegator = null;
            templateHelper = null;
        }
    });
}

/**
 * Generate pdf with custom header y footer
 * @param {*} params
 * @returns Promise<Array<string | Buffer>>
 */
async function generatePdfWithCustomHeaderAndFooter({ tempFile, pdfOptions, pdfMergeDelegator, templateHelper, logger, totalPages, options }) {
    const pdfChunks = [];
    for (const pageIndex in tempFile.customPagesHeaderFooter) {
        const pageHeaderFooterId = tempFile.customPagesHeaderFooter[pageIndex];
        const _pdfOptions = { ...pdfOptions };

        const _headerHTML = await __getHeaderTemplateFromTemplate(page.$eval.bind(page), options, `#header-page-${pageHeaderFooterId}`);
        const _footerHTML = await __getFooterTemplateFromTemplate(page.$eval.bind(page), options, `#footer-page-${pageHeaderFooterId}`);

        _pdfOptions.footerTemplate = _footerHTML.footerTemplate;
        _pdfOptions.headerTemplate = _headerHTML.headerTemplate;

        _pdfOptions.margin.top = _headerHTML.marginTop;
        _pdfOptions.margin.bottom = _footerHTML.marginBottom;
        
        _pdfOptions.pageRanges  = pageHeaderFooterId.replace(/last|penult|first/g, (x) => {
            return x === 'penult'? totalPages - 1: 
                x === 'last'? totalPages: 
                x === 'first'? 1: x
        });
        
        try {
            pdfChunks.push(await page.pdf(_pdfOptions));
        } catch (error) {
            logger.writeLog({ text: error.stack, type: "ERROR" });
        }
    }
    let templateBuffer = pdfChunks;
    let templateType = "array/pdf";
    pdfOptions.path && templateHelper.deleteFile(pdfOptions.path);

    if (pdfMergeDelegator) {
        templateBuffer = await pdfMergeDelegator.merge(pdfChunks);
        templateType = "application/pdf";
        pdfOptions.path && await templateHelper.saveFile(pdfOptions.path, templateBuffer).catch(err => {
            logger.writeLog({ text: err, type: "ERROR" });
        });
    }

    return [templateBuffer, templateType];
}

/**
 * Generate the PDF to resolve the total pages of it.
 * 
 * @param {*} parmas
 * 
 * @returns Promise<Buffer>
 */
function resolvePdfTotalPage({ pagePdfGenFn, pdfOptions, pageEvalFn, pdfMergeDelegator, templateHelper }) {
    return pagePdfGenFn/*page.pdf*/(pdfOptions)
    .then(async (buffer) => {
        if (pdfMergeDelegator) {
            pdfOptions.path && templateHelper.deleteFile(pdfOptions.path); // Delete the previous pdf
            const totalPages = await pdfMergeDelegator.getPdfTotalPages(buffer);
            
            return await pageEvalFn("body", (body, totalPages) => {
                const script = document.createElement("script");
                const text = document.createTextNode(`
                    reactiveInstance.extraParams['totalPages'] = ${totalPages};
                `);
                
                script.appendChild(text);
                body.appendChild(script);
            }, totalPages)
            .then(async () => {
                return { buffer: await pagePdfGenFn/*page.pdf*/(pdfOptions), totalPages };
            });
        }

        return { buffer, totalPages: 0 };
    });
}

/**
 * Read the template to footer from the HTML template
 * @param {*} page 
 */
async function __getFooterTemplateFromTemplate(pageEvalFn, options, pageFooterId = "#page-footer") {
    try {
        return await pageEvalFn/*page.$eval*/(pageFooterId, (ele, _options) => {
            const outerHTML = ele.outerHTML;
            ele.style.display = "none";

            return ({
                footerTemplate: outerHTML,
                marginBottom: ele.dataset.marginBottom || _options.printingMarginBottom
            });

        }, options);

    } catch (error) {
        logger.writeLog({ text: error.message + ". No footer template found", type: "WARN" });
    }

    return ({
        footerTemplate: `<div style="margin: 0 13mm;display: flex; align-items: center; width:100%;justify-content: flex-end;">
                            <p style="font-size: 8px;text-align: right; align-self: flex-end;">
                                [<span class="pageNumber"></span>/<span class="totalPages"></span>]
                            </p>
                        </div>`,
        marginBottom: options.printingMarginBottom
    });
}

/**
 * Read the template to header from the HTML template
 * @param {*} page 
 */
async function __getHeaderTemplateFromTemplate(pageEvalFn, options, pageHeaderId = "#page-header") {
    try {
        return await pageEvalFn/*page.$eval*/(pageHeaderId, (ele, _options) => {
            const outerHTML = ele.outerHTML;
            ele.style.display = "none";

            return ({
                headerTemplate: outerHTML,
                marginTop: ele.dataset.marginTop || _options.printingMarginTop
            });

        }, options);

    } catch (error) {
        logger.writeLog({ text: error.message + ". No header template found", type: "WARN" });
    }

    return ({ headerTemplate: `<span></span>`, marginTop: options.printingMarginTop });
}

module.exports.initialize = function (options) {
    if (!options) {
        throw new Error("The Initializer options cannot be null");
    }

    const {
        BROWSER_NAME            = "chrome",
        URL_BROWSER,
        FILE_DIR,
        PDF_DIR,
        PORT,
        TEMPLATE_DIR,
        printingMarginTop       = "2.54cm",
        printingMarginBottom    = "2.54cm",
        printingMarginLeft      = "2.54cm",
        printingMarginRight     = "2.54cm",
        libs,
        templateServerUrl       = "http:localhost",
        height, width,
        paperFormat
    } = options;

    const _options = {
        BROWSER_NAME,
        URL_BROWSER,
        FILE_DIR,
        PDF_DIR,
        PORT,
        TEMPLATE_DIR,
        printingMarginTop,
        printingMarginBottom,
        printingMarginLeft,
        printingMarginRight,
        libs,
        templateServerUrl:          `${templateServerUrl}${(PORT && (':' + PORT)) || ''}`,
        height, width,
        paperFormat
    };

    const templateHelper = templateInitializer.initialize(_options);

    return {
        processTemplate: (data) => processTemplate({ data, pdfMergeDelegator: options.pdfMergeDelegator, options: _options, templateHelper }),
        dispose: async () => {
            await closeBrowser({ templateHelper, browser, page });
        },
        getTemplateParameters: templateHelper.getTemplateParameters
    };
};