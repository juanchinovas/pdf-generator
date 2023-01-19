
class PdfGenerator {
	#browser;
	#browserStarted;
	#options;
	#logger;
	#templateHelper;
	#pdfMergeDelegator;
	#fileHelper;
	#puppeteer;
	#pageEvents;

	constructor(options, logger, pdfMergeDelegator, templateHelper, fileHelper, puppeteer) {
		this.#browserStarted = false;
		[this.#options, this.#pageEvents] = this.#initialize(options);
		this.#logger = logger;
		this.#templateHelper = templateHelper;
		this.#fileHelper = fileHelper;
		this.#puppeteer = puppeteer;
		this.#pdfMergeDelegator = pdfMergeDelegator;
	}

	async processTemplate(data) {
		const [_, page] = await this.#init(this.#options, this.#browser);
		return this.#generatePdfFromTemplate({
			page,
			data,
			pdfMergeDelegator: this.#pdfMergeDelegator,
			options: this.#options,
			templateHelper: this.#templateHelper,
			fileHelper: this.#fileHelper
		});
	}

	async dispose() {
		await this.#closeBrowser({ templateHelper: this.#templateHelper, browser: this.#browser });
		this.#browser = null;
		this.#browserStarted = false;
	}

	async getTemplateParameters(templateName) {
		return this.#templateHelper.getTemplateParameters(templateName);
	}

	/**
	 * Initialize headless browser and new page
	 */

	async #init(options) {
		if (!options.browserUrl) {
			throw new Error("No target browser found");
		}

		return new Promise(async (res) => {
			if (!this.#browserStarted && !this.#browser) {
				this.#browserStarted = true;
				this.#logger.writeLog({ text: "Launching Browser", type: "LOG" });
				for (let i = 0; i < 3; i++) {
					this.#browser = await this.#puppeteer.launch({
						executablePath: options.browserUrl,
						product: options.browserName
					}).catch((err) => {
						this.logger.writeLog({ text: err?.message ?? err, type: "ERROR" });
					});
					if (this.#browser) break;
					this.logger.writeLog({ text: `Launching headless browser try: ${i+1}`, type: "LOG" });
				}
			}

			const intervalCode = setInterval(async () => {
				if (this.#browser) {
					clearInterval(intervalCode);
					this.#logger.writeLog({ text: "Starting Page", type: "LOG" });
					const page = await this.#browser.newPage();

					for (let event in this.#pageEvents) {
						if (Object.prototype.hasOwnProperty.call(this.#pageEvents, event)) {
							page.on(event, this.#pageEvents[event]);
						}
					}

					res([this.#browser, page]);
				}
			}, 100);
		});
	}


	/**
	 * Dispose everything, remove page events and close the headless browser
	 */
	async #closeBrowser({ templateHelper, browser }) {
		this.#logger.writeLog({ text: "Closing Browser", type: "LOG" });
		if (templateHelper) {
			templateHelper.dispose();
			templateHelper = null;
		}

		const pages = await browser.pages();
		for (const page of pages) {
			for (let event in this.#pageEvents) {
				if (Object.prototype.hasOwnProperty.call(this.#pageEvents, event)) {
					page.off(event, this.#pageEvents[event]);
				}
			}
		}

		if (browser) {
			await browser.close();
		}
	}

	/**
	 * Create a HTML file from the template file with its data, create the PDF file.
	 * Load the HTML template file
	 * 
	 * @param data - {$templateName: string, $parameters: any, $extraParams: any}
	 * 
	 * @returns Promise<{fileName:string, buffer: Buffer, totalPages: number, templateType: 'application/pdf' | 'text/html' | 'array/pdf' }>
	 */
	async #generatePdfFromTemplate({ data, options, pdfMergeDelegator, templateHelper, fileHelper, page }) {
		try {
			let tempFile = await templateHelper.prepareTemplate(data);
			let urlTemplate = `${options.templateServerUrl}/${tempFile.fileName}.html`;
			let templateType = "application/pdf";
			let templateBuffer = null;
			let totalPages = 0;

			if (tempFile.urlTemplate) {
				urlTemplate = tempFile.urlTemplate;
			}

			this.#logger.writeLog({ text: `Loading ${urlTemplate}`, type: "LOG" });
			await page.goto(urlTemplate, { waitUntil: "domcontentloaded" });

			if (tempFile.previewHTML !== true) {
				this.#logger.writeLog({ text: "Creating PDF", type: "LOG" });
/*
				let _footerHTML = await this.#__getFooterTemplateFromTemplate(page, options);
				let _headerHTML = await this.#__getHeaderTemplateFromTemplate(page, options);
				*/
				const pdfOptions = {
					path: `${options.pdfDir}/${tempFile.fileName}.pdf`,
					format: options.paperFormat,
					printBackground: true,
					displayHeaderFooter: true,
					/*footerTemplate: _footerHTML.footerTemplate,
					headerTemplate: _headerHTML.headerTemplate,*/
					preferCSSPageSize: tempFile.preferCssPage ?? false,
					margin: {
						/*top: _headerHTML.marginTop,
						bottom: _footerHTML.marginBottom,*/
						left: options.printingMarginLeft,
						right: options.printingMarginRight
					},
					height: options.height,
					width: options.width
				};
				if (tempFile.orientation === "horizontal") {
					pdfOptions.landscape = true;
					page.addStyleTag({ "content": "@page { size: A4 landscape; }" });
					this.#logger.writeLog({ text: `Setting PDF orientation to ${tempFile.orientation}`, type: "LOG" });
				}
				// Don't save the pdf 
				if (tempFile.preview === true) {
					delete pdfOptions.path;
					this.#logger.writeLog({ text: "Deleting pdf path for preview pdf request", type: "LOG" });
				}

				totalPages = await this.#resolvePdfTotalPage({
					page,
					pdfOptions,
					fileHelper,
					page,
					options,
					logger: this.#logger,
					fileHelper,
					tempFile
				});

				// Generate pdf with custom header y footer 
				[templateBuffer, templateType] = await this.#generatePdfWithCustomHeaderAndFooter({
					pdfOptions,
					logger: this.#logger,
					pdfMergeDelegator,
					tempFile,
					fileHelper,
					totalPages,
					options,
					page
				});
			} else {
				templateType = "text/html";
				templateBuffer = Buffer.from(await page.content(), "utf8");
			}

			fileHelper.deleteFile(`${options.fileDir}/${tempFile.fileName}.html`);
			return ({ totalPages, fileName: `${tempFile.fileName}.pdf`, buffer: templateBuffer, templateType });
		} catch (err) {
			this.#logger.writeLog({ text: err.stack, type: "ERROR" });
			throw err;
		} finally {
			await page.close();
		}
	}

	/**
	 * Generate pdf with custom header y footer
	 * @param {*} params
	 * @returns Promise<Array<string | Buffer>>
	 */
	async #generatePdfWithCustomHeaderAndFooter({ tempFile, pdfOptions, pdfMergeDelegator, fileHelper, logger, totalPages, options, page }) {
		const pdfChunks = [];
		const headerFooterByPage = tempFile.customPagesHeaderFooter ?? [];
		for (const pageIndex in headerFooterByPage) {
			const pageHeaderFooterId = headerFooterByPage[pageIndex];
			const headerId = (pageHeaderFooterId && `#header-page-${pageHeaderFooterId}`) || undefined;
			const footerId = (pageHeaderFooterId && `#footer-page-${pageHeaderFooterId}`) || undefined;
			const _headerHTML = await this.#__getHeaderTemplateFromTemplate(page, options, headerId);
			const _footerHTML = await this.#__getFooterTemplateFromTemplate(page, options, footerId);
			const _pdfOptions = {
				...pdfOptions,
				footerTemplate: _footerHTML.footerTemplate,
				headerTemplate: _headerHTML.headerTemplate 
			};
	
			_pdfOptions.margin.top = _headerHTML.marginTop;
			_pdfOptions.margin.bottom = _footerHTML.marginBottom;

			if (totalPages && pageHeaderFooterId) {
				_pdfOptions.pageRanges = pageHeaderFooterId.replace(/last|penult|first/g, (x) => {
					return x === "first"  ? 1 :
						   x === "penult" ? totalPages - 1 : totalPages;
				});
			}

			try {
				pdfChunks.push(await page.pdf(_pdfOptions));
			} catch (error) {
				logger.writeLog({ text: error.stack, type: "ERROR" });
			}
		}

		let templateBuffer = pdfChunks;
		let templateType = "array/pdf";
		pdfOptions.path && fileHelper.deleteFile(pdfOptions.path);

		if (pdfMergeDelegator) {
			templateBuffer = await pdfMergeDelegator.merge(pdfChunks, tempFile.metadata);
			templateType = "application/pdf";
			pdfOptions.path && await fileHelper.saveFile(pdfOptions.path, templateBuffer).catch(err => {
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
	async #resolvePdfTotalPage({ page, pdfOptions, options, logger, fileHelper, tempFile }) {
		const [templateBuffer] = await this.#generatePdfWithCustomHeaderAndFooter({
			pdfOptions,
			logger,
			tempFile,
			fileHelper,
			options,
			page
		});

		const totals = await Promise.all(templateBuffer.map(buff => this.#pdfMergeDelegator.getPdfTotalPages(buff)));
		const totalPages = Math.ceil(totals.reduce((sumTotal, total) => sumTotal + total, 0) / totals.length);
		console.log({ totals, totalPages });
		await page.$eval("body", (body, totalPagesParam) => {
			// eslint-disable-next-line
			const script = document.createElement("script");
			// eslint-disable-next-line
			const text = document.createTextNode(`updateTotalPages(${totalPagesParam});`);

			script.appendChild(text);
			body.appendChild(script);
		}, totalPages);

		return totalPages;
	}

	/**
	 * Read the template to footer from the HTML template
	 * @param {*} page 
	 */
	async #__getFooterTemplateFromTemplate(page, options, pageFooterId = "#page-footer") {
		try {
			return await page.$eval(pageFooterId, (ele, _options) => {
				ele.style.display = "";
				const outerHTML = ele.outerHTML;
				ele.style.display = "none";

				return ({
					footerTemplate: outerHTML,
					marginBottom: ele.dataset.marginBottom || _options.printingMarginBottom
				});

			}, options);

		} catch (error) {
			this.#logger.writeLog({ text: `${error.message}. No footer template found`, type: "WARN" });
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
	async #__getHeaderTemplateFromTemplate(page, options, pageHeaderId = "#page-header") {
		try {
			return await page.$eval(pageHeaderId, (ele, {printingMarginTop}) => {
				ele.style.display = "";
				const outerHTML = ele.outerHTML;
				ele.style.display = "none";
				return ({
					headerTemplate: outerHTML,
					marginTop: ele.dataset.marginTop || printingMarginTop
				});

			}, options);

		} catch (error) {
			this.#logger.writeLog({ text: `${error.message}. No header template found`, type: "WARN" });
		}

		return ({ headerTemplate: "<span></span>", marginTop: options.printingMarginTop });
	}

	#initialize(options) {
		if (!options) {
			throw new Error("The Initializer options cannot be null");
		}

		const {
			browserName = "chrome",
			browserUrl,
			fileDir = "./temp",
			pdfDir = "./temp/pdfs",
			port,
			templateDir,
			printingMarginTop = "2.54cm",
			printingMarginBottom = "2.54cm",
			printingMarginLeft = "2.54cm",
			printingMarginRight = "2.54cm",
			libs,
			templateServerUrl = "http://localhost",
			height, width,
			paperFormat = "Letter"
		} = options;

		const _options = {
			browserName,
			browserUrl,
			fileDir,
			pdfDir,
			port,
			templateDir,
			printingMarginTop,
			printingMarginBottom,
			printingMarginLeft,
			printingMarginRight,
			libs,
			templateServerUrl: `${templateServerUrl}${(port && (":" + port)) || ""}`,
			height, width,
			paperFormat
		};

		const pageEvents = {
			"pageerror": err => {
				this.#logger.writeLog({ text: err, type: "ERROR" });
			},
			"error": err => {
				this.#logger.writeLog({ text: err, type: "ERROR" });
			},
			"console": message => {
				let msgs = message.args()
					.map(m => {
						if (m && m._remoteObject.preview && m._remoteObject.preview.subtype !== "error") {
							const obj = m._remoteObject.preview.properties.reduce((obj, prop) => (obj[prop.name] = prop.value, obj), {});
							return JSON.stringify(obj, null, 2);
						}
						if (m && m._remoteObject.description) {
							return m._remoteObject.description;
						}
						if (m && m._remoteObject.value) {
							return m._remoteObject.value;
						}
		
						return [];
					});
				this.#logger.writeLog({ text: msgs.join(" "), type: message.type().substr(0, 3).toUpperCase() });
			},
			"response": response => {
				if (!(/;base64,/ig.test(response.url()))) {
					this.#logger.writeLog({ text: `${response.status()} ${response.url()}`, type: "LOG" });
				}
			},
			"requestfailed": request => {
				this.#logger.writeLog({ text: `${request.failure().errorText} ${request.url()}`, type: "ERROR" });
			}
		};

		return [ _options, pageEvents ];
	}
}

module.exports = PdfGenerator;