const PdfGenerator = require("../pdf-generator");

/**
 * mock document
 */
global.document = {
	createElement: jest.fn(() => ({
		appendChild: jest.fn()
	})),
	createTextNode: jest.fn(),
};

describe("pdf-generator", () => {
	let options = {
		URL_BROWSER: "/dir/browser"
	};
	let templateInfo = {};
	let puppeteer;
	let templateHelper;
	let logger;
	let pdfGeneratorInstance;
	let fileHelper;
	const events = {};
	const mockPageFn = {
		goto: jest.fn(() => Promise.resolve()),
		pdf: jest.fn(() => Promise.resolve(Buffer.from("test pdf"))),
		content: jest.fn(() => Promise.resolve(Buffer.from("test pdf"))),
		$eval: jest.fn((selector, cb, ops) => {
			return Promise.resolve(cb({
				id: selector,
				style: {},
				outerHTML: "",
				appendChild: jest.fn(),
				dataset: {}
			}, ops));
		}),
		addStyleTag: jest.fn(),
		close: jest.fn(() => Promise.resolve())
	};


	afterEach(() => {
		const pages = [];
		puppeteer = {
			launch: jest.fn(() => Promise.resolve({
				newPage: jest.fn(() => {
					const page = {
						on: jest.fn((eventName, handler) => events[eventName] = handler),
						off: jest.fn((eventName) => delete events[eventName]),
						...mockPageFn
					};
					pages.push(page);
					return Promise.resolve(page);
				}),
				close: jest.fn(() => Promise.resolve(pages.length = 0)),
				pages: jest.fn(() => Promise.resolve(pages)),
			}))
		};
		templateHelper = {
			getTemplateParameters: jest.fn(() => Promise.resolve({})),
			dispose: jest.fn(),
			prepareTemplate: jest.fn(() => Promise.resolve(templateInfo)),
		};
		fileHelper = {
			deleteFile: jest.fn(() => Promise.resolve(true)),
			saveFile: jest.fn(() => Promise.resolve(true))
		};
		logger = {
			writeLog: jest.fn()
		};
		pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);
	});

	describe("initialize", () => {

		const falsyCases = [
			["", "The Initializer options cannot be null"],
			[null, "The Initializer options cannot be null"],
			[undefined, "The Initializer options cannot be null"],
			[0, "The Initializer options cannot be null"],
			[false, "The Initializer options cannot be null"],
			[NaN, "The Initializer options cannot be null"]
		];

		test.each(falsyCases)("when data is %o throws %s", (param, expected) => {
			expect(() => new PdfGenerator(param, null, null, null)).toThrow(expected);
		});

		it("initiates pdf generator correctly", async () => {
			expect(pdfGeneratorInstance).not.toBeNull();
			expect(pdfGeneratorInstance).toEqual(expect.objectContaining({
				processTemplate: expect.any(Function),
				dispose: expect.any(Function),
				getTemplateParameters: expect.any(Function)
			}));
		});

		it("should not create a new browser instance when processTemplate is called twice", async () => {
			const pdfGenInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await pdfGenInstance.processTemplate({});
			await pdfGenInstance.processTemplate({});

			expect(puppeteer.launch).toHaveBeenCalledTimes(1);
		});

		it("should not create a new browser instance when processTemplate is called twice using Promise.all", async () => {
			const pdfGenInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);
			await Promise.all([
				pdfGenInstance.processTemplate({}),
				pdfGenInstance.processTemplate({})
			]);

			expect(puppeteer.launch).toHaveBeenCalledTimes(1);
		});
	});

	describe("processTemplate", () => {
		let pdfGeneratorInstance;
		beforeEach(() => {
			pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);
		});

		it("throws when not browser dir/url is set", async () => {
			const pdfGeneratorInstance = new PdfGenerator({}, logger, templateHelper, fileHelper, puppeteer);

			await expect(() => pdfGeneratorInstance.processTemplate({})).rejects.toThrow("No target browser found");
		});

		it("should launch the browser instance", async () => {
			await pdfGeneratorInstance.processTemplate({});
			expect(puppeteer.launch).toHaveBeenCalledWith({
				executablePath: options.URL_BROWSER,
				product: "chrome"
			});
			expect(logger.writeLog).toHaveBeenCalled();
		});

		it("should have events on page", async () => {
			await pdfGeneratorInstance.processTemplate({});
			expect(Object.keys(events)).toEqual(["pageerror", "error", "console", "response", "requestfailed"]);
		});

		it("should load the page from url", async () => {
			templateInfo = { fileName: "test_4512" };

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(mockPageFn.goto).toHaveBeenCalledWith("http://localhost/test_4512.html", {"waitUntil": "networkidle0"});
		});

		it("should fail load the page", async () => {
			templateInfo = { fileName: "test_4512" };
			mockPageFn.goto.mockRejectedValueOnce(new Error("Fail load the page"));

			await expect(pdfGeneratorInstance.processTemplate({})).rejects.toEqual(new Error("Fail load the page"));
			expect(mockPageFn.goto).toHaveBeenCalledWith("http://localhost/test_4512.html", {"waitUntil": "networkidle0"});
		});

		it("should load an external page", async () => {
			templateInfo = {
				fileName: "test_4512",
				urlTemplate: "http://website.com/op"
			};

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(mockPageFn.goto).toHaveBeenCalledWith("http://website.com/op", {"waitUntil": "networkidle0"});
		});

		it("should load the template as html", async () => {
			templateInfo =  {
				fileName: "test_4512",
				urlTemplate: "http://website.com/op",
				previewHTML: true
			};

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "text/html",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
		});

		it("should create pdf in horizontal orientation", async () => {
			templateInfo = {
				fileName: "test_4512",
				urlTemplate: "http://website.com/op",
				orientation: "horizontal"
			};

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(mockPageFn.addStyleTag).toHaveBeenCalledWith({ "content": "@page { size: A4 landscape; }" });
		});

		it("should set pdf creation as previewed and not save temp pdf", async () => {
			templateInfo = {
				fileName: "test_4512",
				preview: true
			};

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(logger.writeLog).toHaveBeenCalledWith({ text: "Deleting pdf path for preview pdf request", type: "LOG" });
		});

		it("should create pdf with custom header and footer", async () => {
			templateInfo = {
				fileName: "test_4512",
				customPagesHeaderFooter: [ "1", "2-penult" ]
			};

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_4512.pdf",
				templateType: "array/pdf",
				totalPages: 0,
				buffer: [ Buffer.from("test pdf"), Buffer.from("test pdf") ]
			});
		});

		it("creates pdf with PdfMergeDelegator will merge pdf array into one", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				pdfMergeDelegator: {
					merge: jest.fn(() => Promise.resolve(Buffer.from("test pdf"))),
					getPdfTotalPages: jest.fn(() => Promise.resolve(1)),
				}
			};
			templateInfo = {
				fileName: "test_5",
				customPagesHeaderFooter: [ "first" ]
			};
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "application/pdf",
				totalPages: 1,
				buffer: Buffer.from("test pdf")
			});
			expect(options.pdfMergeDelegator.merge).toHaveBeenCalled();
			expect(options.pdfMergeDelegator.getPdfTotalPages).toHaveBeenCalled();
		});

		it("creates pdf with PdfMergeDelegator and save the file", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				PDF_DIR: "/dir/pdf",
				pdfMergeDelegator: {
					merge: jest.fn(() => Promise.resolve(Buffer.from("test pdf"))),
					getPdfTotalPages: jest.fn(() => Promise.resolve(3)),
				}
			};
			templateInfo = {
				fileName: "test_5",
				customPagesHeaderFooter: [ "1" ]
			};
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "application/pdf",
				totalPages: 3,
				buffer: Buffer.from("test pdf")
			});
			expect(fileHelper.saveFile).toHaveBeenCalledWith("/dir/pdf/test_5.pdf", Buffer.from("test pdf"));
		});

		it("creates pdf with PdfMergeDelegator and save file fail", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				PDF_DIR: "/dir/pdf",
				pdfMergeDelegator: {
					merge: jest.fn(() => Promise.resolve(Buffer.from("test pdf"))),
					getPdfTotalPages: jest.fn(() => Promise.resolve(3)),
				}
			};
			templateInfo = {
				fileName: "test_5",
				customPagesHeaderFooter: [ "1" ]
			};
			fileHelper.saveFile
				.mockRejectedValueOnce(new Error("Oops"));
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "application/pdf",
				totalPages: 3,
				buffer: Buffer.from("test pdf")
			});
			expect(fileHelper.saveFile).toHaveBeenCalled();
		});

		it("throws when create pdf with custom header and footer and page pdf fail", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				PORT: 100
			};
			templateInfo = {
				fileName: "test_5",
				customPagesHeaderFooter: [ "1", "first", "last" ]
			};
			const err = new Error("Oops");
			mockPageFn.pdf
				.mockResolvedValueOnce(Buffer.from("test pdf"))
				.mockRejectedValueOnce(err)
				.mockRejectedValueOnce(err)
				.mockRejectedValueOnce(err);
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "array/pdf",
				totalPages: 0,
				buffer: []
			});
			expect(logger.writeLog).toHaveBeenCalledWith({ text: err.stack, type: "ERROR" });
		});

		it("should fallback to default footer when page eval fails", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				PORT: 50,
				paperFormat: "A5",
				PDF_DIR: "/dir"
			};
			templateInfo = {
				fileName: "test_5"
			};
			mockPageFn.$eval
				.mockRejectedValueOnce(new Error("Oops"));
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(logger.writeLog).toHaveBeenCalledWith({ text: "Oops. No footer template found", type: "WARN" });
			expect(mockPageFn.pdf).toHaveBeenCalledWith(
				{
					path: "/dir/test_5.pdf",
					format: "A5",
					printBackground: true,
					displayHeaderFooter: true,
					footerTemplate:  `<div style="margin: 0 13mm;display: flex; align-items: center; width:100%;justify-content: flex-end;">
                            <p style="font-size: 8px;text-align: right; align-self: flex-end;">
                                [<span class="pageNumber"></span>/<span class="totalPages"></span>]
                            </p>
                        </div>`,
					headerTemplate: "",
					preferCSSPageSize: false,
					margin: {
						bottom: "2.54cm",
						left: "2.54cm",
						right: "2.54cm",
						top: "2.54cm",
					},
					height: undefined,
					width: undefined
				}
			);
		});

		it("should fallback to default header when page eval fails", async () => {
			const options = {
				URL_BROWSER: "/dir/browser",
				PORT: 50,
				PDF_DIR: "/dir"
			};
			templateInfo = {
				fileName: "test_5"
			};
			mockPageFn.$eval
				.mockResolvedValueOnce({ marginBottom: "2.54cm" })
				.mockRejectedValueOnce(new Error("Oops"));
			const pdfGeneratorInstance = new PdfGenerator(options, logger, templateHelper, fileHelper, puppeteer);

			await expect(pdfGeneratorInstance.processTemplate({})).resolves.toEqual({
				fileName: "test_5.pdf",
				templateType: "application/pdf",
				totalPages: 0,
				buffer: Buffer.from("test pdf")
			});
			expect(logger.writeLog).toHaveBeenCalledWith({ text: "Oops. No header template found", type: "WARN" });
			expect(mockPageFn.pdf).toHaveBeenCalledWith(
				{
					path: "/dir/test_5.pdf",
					format: "Letter",
					printBackground: true,
					displayHeaderFooter: true,
					footerTemplate: undefined,
					headerTemplate: "<span></span>",
					preferCSSPageSize: false,
					margin: {
						bottom: "2.54cm",
						left: "2.54cm",
						right: "2.54cm",
						top: "2.54cm",
					},
					height: undefined,
					width: undefined
				}
			);
		});

		describe("Page events", () => {
			beforeEach(() => {
				options = {
					URL_BROWSER: "/dir/browser"
				};
			});

			it("should call page error event handler", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.pageerror("Err");
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "Err", type: "ERROR" });
			});
    
			it("should call error event handler", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.error("Err");
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "Err", type: "ERROR" });
			});
    
			it("should call page response event handler", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.response({
					url: () => ";base64,",
					status: () => "status"
				});
				expect(logger.writeLog).not.toHaveBeenCalledWith({ text: "status ;base64,", type: "LOG" });
			});
    
			it("should call page response event handler, not base 64", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.response({
					url: () => "http://ulr.com/op",
					status: () => "status"
				});
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "status http://ulr.com/op", type: "LOG" });
			});
    
			it("should call page requestfailed event handler, not base 64", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.requestfailed({
					url: () => "http://ulr.com/op",
					failure: () => ({ errorText: "test error" })
				});
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "test error http://ulr.com/op", type: "ERROR" });
			});
    
			it("should call page console event handler log description", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.console({
					args: () => {
						return [
							{
								_remoteObject: {
									description: "Testing"
								}
							}
						];
					},
					type: () => "Error"
				});
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "Testing", type: "ERR" });
			});
    
			it("should call page console event handler log value", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.console({
					args: () => {
						return [
							{
								_remoteObject: {
									value: "Testing"
								}
							}
						];
					},
					type: () => "Error"
				});
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "Testing", type: "ERR" });
			});
    
			it("should call page console event handler log preview log type", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.console({
					args: () => [{
						_remoteObject: {
							preview: {
								subtype: "log",
								properties: [
									{
										name: "prop",
										value: "value"
									}
								]
							}
						}
					}],
					type: () => "Log"
				});

				expect(logger.writeLog).toHaveBeenCalledWith({
					text: JSON.stringify({ prop: "value" }, null, 2),
					type: "LOG"
				});
			});

			it("should call page console event handler log preview log type", async () => {
				await pdfGeneratorInstance.processTemplate({});
				events.console({
					args: () => [{
						_remoteObject: {
							preview: {
								subtype: "error",
								properties: [
									{
										name: "prop",
										value: "value"
									}
								]
							}
						}
					}],
					type: () => "error"
				});
				expect(logger.writeLog).toHaveBeenCalledWith({ text: "", type: "ERR" });
			});
		});

		afterAll(async () => {
			await pdfGeneratorInstance.dispose();
		});
	});

	describe("getTemplateParameters", () => {
		it("should call getTemplateParameters method from helper file", async () => {
			await expect(pdfGeneratorInstance.getTemplateParameters("test")).resolves.toEqual({});
		});
	});

	describe("dispose", () => {
		it("should dispose browser instance", async () => {
			await pdfGeneratorInstance.processTemplate({});

			await expect(pdfGeneratorInstance.dispose()).resolves.toBeUndefined();
		});
	});
});