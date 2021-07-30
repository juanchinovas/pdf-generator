const puppeteer = require('puppeteer-core');
const templateInitializer = require("./helper");
const logger = require("./logger");

let _options, templateHelper, browser, page, pdfMergerDelegator;

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
async function init() {

    if (browser && page) {
        return;
    }

    if (!!!_options.URL_BROWSER) {
        throw new Error("No target browser found");
    }

    logger.writeLog({ text: "Launching Browser", type: "LOG" });
    browser = await puppeteer.launch({
        executablePath: _options.URL_BROWSER,
        product: _options.BROWSER_NAME
    });

    logger.writeLog({ text: "Starting Page", type: "LOG" });
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
function processTemplate(data) {

    return new Promise(async (res, rej) => {

        try {
            await init();

            let tempFile = await templateHelper.prepareTemplate(data);
            
            let urlTemplate = `http://localhost${(_options.PORT && ':' + _options.PORT) || ''}/${tempFile.fileName}.html`;
            let templateType = 'application/pdf';
            let templateBuffer = null;

            if (tempFile.urlTemplate) {
                urlTemplate = tempFile.urlTemplate || urlTemplate;
            }

            logger.writeLog({ text: `Loading ${urlTemplate}`, type: "LOG" });
            await page.goto(urlTemplate, { waitUntil: 'networkidle0' });
            let _totalPages = 0
            if (tempFile.previewHTML !== true) {
                logger.writeLog({ text: `Creating PDF`, type: "LOG" });
                
                let _footerHTML = await __getFooterTemplateFromTemplate(page.$eval.bind(page));
                let _headerHTML = await __getHeaderTemplateFromTemplate(page.$eval.bind(page));
                const pdfOptions = {
                    path: `${_options.PDF_DIR}/${tempFile.fileName}.pdf`,
                    format: 'Letter',
                    printBackground: true,
                    displayHeaderFooter: true,
                    footerTemplate: _footerHTML.footerTemplate,
                    headerTemplate: _headerHTML.headerTemplate,
                    preferCSSPageSize: tempFile.preferCssPage || false,
                    margin: {
                        top: _headerHTML.marginTop,
                        bottom: _footerHTML.marginBottom,
                        left: _options.printingMarginLeft,
                        right: _options.printingMarginRight
                    }
                };
                if (tempFile.orientation === "horizontal") {
                    pdfOptions.landscape = true;
                    page.addStyleTag({ 'content': '@page { size: A4 landscape; }' });
                }
                // Don't save the pdf 
                if (tempFile.preview === true) {
                    delete pdfOptions.path;
                }
                
                const {buffer, totalPages} = await resolvePdfTotalPage({ 
                    pagePdfGenFn: page.pdf.bind(page), 
                    pdfOptions, 
                    pageEvalFn: page.$eval.bind(page)
                });
                
                templateBuffer = buffer;
                _totalPages = totalPages;
                // Generate pdf with custom header y footer 
                if (tempFile.customPagesHeaderFooter) {
                    const pdfChunks = [];
                    for (const pageIndex in tempFile.customPagesHeaderFooter) {
                        let printPage = tempFile.customPagesHeaderFooter[pageIndex];

                        _headerHTML = await __getHeaderTemplateFromTemplate(page.$eval.bind(page), `#header-page-${printPage}`);
                        _footerHTML = await __getFooterTemplateFromTemplate(page.$eval.bind(page), `#footer-page-${printPage}`);

                        pdfOptions.footerTemplate = _footerHTML.footerTemplate;
                        pdfOptions.headerTemplate = _headerHTML.headerTemplate;

                        pdfOptions.margin.top = _headerHTML.marginTop;
                        pdfOptions.margin.bottom = _footerHTML.marginBottom;
                        
                        pdfOptions.pageRanges  = printPage.replace(/last|penult|first/g, (x) => {
                            return x === 'penult'? totalPages - 1: 
                                   x === 'last'? totalPages: 
                                   x === 'first'? 1: x
                        });
                        
                        try {
                            pdfChunks.push(await page.pdf(pdfOptions));
                        } catch (error) {
                            logger.writeLog({ text: error.stack, type: "ERROR" });
                        }
                    }
                    pdfOptions.path && templateHelper.deleteFile(pdfOptions.path);
                    if (pdfMergerDelegator) {
                        templateBuffer = await pdfMergerDelegator.merge(pdfChunks);
                        pdfOptions.path && await templateHelper.saveFile(pdfOptions.path, templateBuffer).catch(err => {
                            logger.writeLog({ text: err, type: "ERROR" });
                        });
                    } else {
                        templateBuffer = pdfChunks;
                        templateType = "array/pdf";
                    }
                }
            } else {
                templateType = 'text/html';
                templateBuffer = Buffer.from(await page.content(), 'utf8');
            }
            
            res({ totalPages: _totalPages, fileName: `${tempFile.fileName}.pdf`, buffer: templateBuffer, templateType });
            
            templateHelper.deleteFile(`${_options.FILE_DIR}/${tempFile.fileName}.html`);

        } catch (err) {
            logger.writeLog({ text: err.stack, type: "ERROR" });
            rej(err.message);
        }

    });
}


/**
 * Generate the PDF to resolve the total pages of it.
 * 
 * @param {*} parmas
 * 
 * @returns Promise<Buffer>
 */
function resolvePdfTotalPage({pagePdfGenFn, pdfOptions, pageEvalFn}) {
    return pagePdfGenFn/*page.pdf*/(pdfOptions)
    .then(async (buffer) => {
        if (pdfMergerDelegator) {
            pdfOptions.path && templateHelper.deleteFile(pdfOptions.path); // Delete the previous pdf
            const totalPages = await pdfMergerDelegator.getPdfTotalPages(buffer);
            
            return await pageEvalFn("body", (body, totalPages) => {
                const script = document.createElement("script");
                const text = document.createTextNode(`
                    const key = 'totalPages';
                    reactiveInstance.extraParams[key] = ${totalPages};
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
async function __getFooterTemplateFromTemplate(pageEvalFn, pageFooterId = "#page-footer") {
    try {
        return await pageEvalFn/*page.$eval*/(pageFooterId, (ele, _options) => {
            const outerHTML = ele.outerHTML;
            ele.style.display = "none";

            return ({
                footerTemplate: outerHTML,
                marginBottom: ele.dataset.marginBottom || _options.printingMarginBottom
            });

        }, _options);

    } catch (error) {
        logger.writeLog({ text: error.message + ". No footer template found", type: "WARN" });
    }

    return ({
        footerTemplate: `<div style="margin: 0 13mm;display: flex; align-items: center; width:100%;justify-content: flex-end;">
    <p style="font-size: 8px;text-align: right; align-self: flex-end;">
        [<span class="pageNumber"></span>/<span class="totalPages"></span>]
    </p>
</div>`, marginBottom:_options.printingMarginBottom
    });
}

/**
 * Read the template to header from the HTML template
 * @param {*} page 
 */
async function __getHeaderTemplateFromTemplate(pageEvalFn, pageHeaderId = "#page-header") {
    try {
        return await pageEvalFn/*page.$eval*/(pageHeaderId, (ele, _options) => {
            const outerHTML = ele.outerHTML;
            ele.style.display = "none";

            return ({
                headerTemplate: outerHTML,
                marginTop: ele.dataset.marginTop || _options.printingMarginTop
            });

        }, _options);

    } catch (error) {
        logger.writeLog({ text: error.message + ". No header template found", type: "WARN" });
    }

    return ({ headerTemplate: `<span></span>`, marginTop: _options.printingMarginTop });
}

module.exports.initialize = function (options) {
    if (!options) {
        throw new Error("The Initializer options cannot be null");
    }

    const {
        BROWSER_NAME = "chrome",
        URL_BROWSER,
        FILE_DIR,
        PDF_DIR,
        PORT,
        printingMarginTop       = "2.54cm",
        printingMarginBottom    = "2.54cm",
        printingMarginLeft      = "2.54cm",
        printingMarginRight     = "2.54cm",
        TEMPLATE_DIR,
        libs
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
        TEMPLATE_DIR,
        libs
    };
    pdfMergerDelegator = options.pdfMergerDelegator;

    templateHelper = templateInitializer.initialize(_options);

    return {
        processTemplate,
        dispose: async () => {
            await closeBrowser();
        }
    };
};