class TemplateHelper {
	#fileHelper;
	#options;
	#templateParameterReader;

	constructor(options, fileHelper, templateParameterReader) {
		this.#fileHelper = fileHelper;
		this.#templateParameterReader = templateParameterReader;
		this.#options = this.#initialize(options);
	}

	async prepareTemplate(data) {
		await this.#fileHelper.ensureExitsDir([this.#options.fileDir, this.#options.pdfDir]);
		const processedData = await this.#readTemplateContent(data, this.#options);
		const fileInfo = await this.#saveOnTemp(
			processedData.templateName,
			processedData.template,
			this.#options.fileDir
		);

		return ({
			...fileInfo,
			...processedData
		});
	}

	dispose () {
		this.#options = null;
	}

	/**
	 * Read template parameter from source code.
	 * 
	 * Need to remove global op
	 * 
	 * @param {*} templateName 
	 * @returns 
	 */
	async getTemplateParameters(templateName) {
		const { template } = await this.#readTemplateContent({
			$templateName: templateName,
			noData: true
		}, this.#options);
		return this.#templateParameterReader.getParametersFrom(template);
	}

	/**
	 * Read template content and prepare a html template with the data to be show on the headless browser
	 * @param {*} data
	 */
	#readTemplateContent(data, options) {
		if (!data) {
			throw new Error("No data provided");
		}
		return new Promise((res, rej) => {
			//The template data is a raw HTML
			if (typeof data === "string") {
				return res({
					template: data,
					templateName: "custom_template"
				});
			}

			//The template is a external file
			if (data.urlTemplate) {
				return res({
					template: data.urlTemplate,
					templateName: data.$templateName || "external_template"
				});
			}

			if (!data.$templateName) {
				throw new Error("No $templateName provided");
			}

			this.#fileHelper
				.readFile(`${options.templateDir}/${data.$templateName}.html`)
				.then(templateData => templateData.toString("utf8"))
				.then(async (template) => {
					let orientation, previewHTML, preview, customPagesHeaderFooter;

					if (!("noData" in data)) {
						var param = this.#templateParameterReader.getParametersFrom(template);
						let templateParts = template.split(/<\/body>\n*(<\/html>)*/gm);
						const extraParams = data.$extraParams || {};

						param.extraParams = extraParams;
						param.extraParams.totalPages = 0;
						delete param.totalPages;

						orientation = extraParams.orientation;
						previewHTML = extraParams.previewHTML;
						preview = extraParams.preview;
						customPagesHeaderFooter = extraParams.customPagesHeaderFooter;

						templateParts.push(options.libs.map(s => s.script ?? `<script src="${s}"></script>`).join("\n"));
						templateParts.push(`<script>
                        window.onload = function () {
                            const [App, elemId] = initVue(${JSON.stringify(Object.assign(param, data.$parameters))});
                            reactiveInstance = elemId ? App.mount(elemId) : new Vue(App);
                        }
                    </script>`);
						templateParts.push("</body></html>");
						template = templateParts.join("");
					}

					res({
						template,
						templateName: data.$templateName,
						orientation,
						previewHTML,
						preview,
						customPagesHeaderFooter
					});
				})
				.catch(rej);
		});
	}
	/**
	 * Save the template with its data as html file to be consume for the headless browser
	 * @param {*} templateName
	 * @param {*} template
	 * @param {*} fileDir
	 * 
	 * @returns Promise<{ fileName: string }>
	 * 
	 */
	async #saveOnTemp(templateName, template, fileDir) {
		var fileName = `${templateName}_${new Date().getTime()}`;

		if (templateName === "external_template") {
			return Promise.resolve({
				fileName,
				urlTemplate: template
			});
		}

		await this.#fileHelper
			.saveFile(`${fileDir}/${fileName}.html`, template);

		return ({
			fileName
		});
	}

	#initialize({fileDir, pdfDir, templateDir, libs = []}) {
		let _options = {
			fileDir,
			pdfDir,
			templateDir,
			libs
		};
		let vueLib = _options.libs && Array.isArray(_options.libs) && _options.libs.find(s => /vue(\.min\.+?js?)*/.test(s));
		if (!vueLib) {
			vueLib = "https://cdn.jsdelivr.net/npm/vue@3";
		}

		_options.libs = [
			vueLib,
			{ script: `<script>${this.#fileHelper.readFileAsync(`${__dirname}/script-factory.js`)}</script>` },
			..._options.libs.filter(lib => lib !== vueLib)
		];

		return _options;
	}
}

module.exports = TemplateHelper;