const TemplateHelper = require("../template-helper");

describe("template-helper", () => {
	let helperInstance;
	let _options;
	let fileHelper;
	let templateParameterReader;

	beforeEach(() => {
		_options = {
			fileDir: "/fileDir",
			pdfDir: "/pdfDir",
			templateDir: "/templateDir"
		};
		fileHelper = {
			readFile: jest.fn(() => Promise.resolve("")),
			saveFile: jest.fn(() => Promise.resolve(true)),
			readFileAsync: jest.fn(() => "Vue code initiation goes here"),
			ensureExitsDir: jest.fn(() => Promise.resolve(true)),
			deleteFile: jest.fn(() => Promise.resolve(true))
		};
		templateParameterReader = {
			getParametersFrom: jest.fn(() => ({ param: "{{param}}" }))
		};

		helperInstance = new TemplateHelper(_options, fileHelper, templateParameterReader);
	});

	describe("prepareTemplate", () => {
		const falsyCases = [
			["", "No data provided"],
			[null, "No data provided"],
			[undefined, "No data provided"],
			[0, "No data provided"],
			[false, "No data provided"],
			[NaN, "No data provided"]
		];

		test.each(falsyCases)("when data is %o throws %s", async (param, expected) => {
			await expect(helperInstance.prepareTemplate(param)).rejects.toThrow(expected);
			expect(fileHelper.ensureExitsDir).toHaveBeenCalledWith([_options.fileDir, _options.pdfDir]);
		});

		it("returns template name 'custom_template' when data is a string", async () => {
			await expect(helperInstance.prepareTemplate("data")).resolves.toEqual(
				expect.objectContaining({
					fileName: expect.stringMatching(/custom_template/),
					template: "data",
					templateName: "custom_template"
				})
			);
		});

		it("returns template name 'external_template' when urlTemplate is set", async () => {
			const data = {
				urlTemplate: "url"
			};
			await expect(helperInstance.prepareTemplate(data)).resolves.toEqual(
				expect.objectContaining({
					fileName: expect.stringMatching(/external_template/),
					template: data.urlTemplate,
					templateName: "external_template"
				})
			);
		});

		it("throws 'No $templateName provided' when data object don't have '$templateName' property", async () => {
			await expect(helperInstance.prepareTemplate({})).rejects.toEqual(new Error("No $templateName provided"));
		});

		it("should not read template paramenters if 'noData' property is in the data object", async () => {
			await expect(helperInstance.prepareTemplate({
				$templateName: "test",
				$parameters: {},
				noData: true
			})).resolves.toEqual(expect.objectContaining({
				template: "",
				templateName: "test",
				fileName: expect.stringMatching(/^test_\d+$/),
			}));
		});

		it("returns template paramenters", async () => {
			await helperInstance.prepareTemplate({
				$templateName: "test",
				$parameters: {
					param: "testing template parameter reading"
				}
			});
			expect(fileHelper.readFile).toHaveBeenCalledWith("/templateDir/test.html");
		});

		it("returns template content and data", async () => {
			fileHelper.readFile.mockImplementation(() => {
				return Promise.resolve("<p>{{param}}<p>");
			});

			await expect(helperInstance.prepareTemplate({
				$templateName: "test",
				$parameters: {
					param: "testing template parameter reading"
				},
				$extraParams: {
					previewHTML: false,
					preview: true
				}
			})).resolves.toEqual(expect.objectContaining({
				templateName: "test",
				fileName: expect.stringMatching(/test_\d+/),
				orientation: undefined, 
				previewHTML: false, 
				preview: true,
				customPagesHeaderFooter: undefined,
				template: `<p>{{param}}<p><script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
<script>Vue code initiation goes here</script><script>
                        window.onload = function () {
                            const [App, elemId] = initVue({"param":"testing template parameter reading","extraParams":{"previewHTML":false,"preview":true,"totalPages":0}});
                            reactiveInstance = elemId ? App.mount(elemId) : new Vue(App);
                        }
                    </script></body></html>`,
			}));
		});

		it("returns template content and data with orientation horizontal", async () => {
			fileHelper.readFile.mockImplementation(() => {
				return Promise.resolve("<p>{{param}}<p><footer id=\"footer-page-1></footer><footer id=\"footer-page-1-last></footer>");
			});

			await expect(helperInstance.prepareTemplate({
				$templateName: "test",
				$parameters: {
					param: "testing template parameter reading"
				},
				$extraParams: {
					previewHTML: false,
					preview: true,
					orientation: "horizontal",
					customPagesHeaderFooter: [1, "2-last"]
				}
			})).resolves.toEqual(expect.objectContaining({
				templateName: "test",
				fileName: expect.stringMatching(/test_\d+/),
				orientation: "horizontal", 
				previewHTML: false, 
				preview: true,
				customPagesHeaderFooter: [1, "2-last"],
				template: `<p>{{param}}<p><footer id="footer-page-1></footer><footer id="footer-page-1-last></footer><script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
<script>Vue code initiation goes here</script><script>
                        window.onload = function () {
                            const [App, elemId] = initVue({"param":"testing template parameter reading","extraParams":{"previewHTML":false,"preview":true,"orientation":"horizontal","customPagesHeaderFooter":[1,"2-last"],"totalPages":0}});
                            reactiveInstance = elemId ? App.mount(elemId) : new Vue(App);
                        }
                    </script></body></html>`,
			}));
		});

		it("should not add vue lib if it's aready set", async () => {
			templateParameterReader.getParametersFrom.mockImplementation(() => ({}));
			_options.libs = ["https://framework/vue@2"];
			helperInstance = new TemplateHelper(_options, fileHelper, templateParameterReader);

			await expect(helperInstance.prepareTemplate({
				$templateName: "test"
			})).resolves.toEqual(expect.objectContaining({
				templateName: "test",
				fileName: expect.stringMatching(/test_\d+/),
				template: `<script src="https://framework/vue@2"></script>
<script>Vue code initiation goes here</script><script>
                        window.onload = function () {
                            const [App, elemId] = initVue({"extraParams":{"totalPages":0}});
                            reactiveInstance = elemId ? App.mount(elemId) : new Vue(App);
                        }
                    </script></body></html>`,
			}));
		});
	});

	describe("getTemplateParameters", () => {
		it("returns simple template parameters", async () => {
			fileHelper.readFile.mockImplementation(() => {
				return Promise.resolve("<p>{{param}}<p>");
			});

			await expect(helperInstance.getTemplateParameters("test")).resolves.toEqual({
				param: "{{param}}",
			});
			expect(templateParameterReader.getParametersFrom).toHaveBeenCalledWith("<p>{{param}}<p>");
		});
	});

	describe("dispose", () => {
		it("should calls file-helper deleteFile method", () => {
			expect(helperInstance.dispose()).toBeUndefined();
		});
	});
});