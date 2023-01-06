class TemplateParameterReader {
	constructor() {}

	/**
	 * Read parameter from HTML template
	 * @param {*} template
	 */
	getParametersFrom(template) {
		let matched = "";
		const regex = /((?:\{\{)\s*([\d\w$]+)\s*(?:\}\}))|(?:v-for="([\d\w]+)\s(in|of)\s)([.\d\w$]+)|(?:\{\{)\s*[\d\w$.]+\(([\d\w$]+),*[\w\s\d"'-]*\)(?:\}\})|(?:\{\{)([\d$\w]+)\.([\d$\w]+)(?:\}\})/mgi;
		const objResult = {};
		let key = "";
		let matches = null;
		const unWantedkeys = new Map();

		while ((matched = regex.exec(template))) {
			if (matched) {
				matches = matched.slice(0).filter(f => f);
				if (matches[0].match("v-for")) {
					key = matches[matches.length - 1];
					objResult[key] = [this.#getObjectParams(matches, template)];
					unWantedkeys.set(matches[1], key);
				} else if (matches[0].match(/(?:\{\{)([\d$\w]+)\.([\d$\w]+)(?:\}\})/)) {
					objResult[matches[1]] = this.#getObjectParams(matches[1], template);
				} else if (isNaN(matches[matches.length - 1])) {
					key = matches.pop();
					objResult[key] = `{{${key}}}`;
				}
			}
		}
		unWantedkeys.forEach((_, key) => delete objResult[key]);

		return objResult;
	}

	/**
	 * Read parameters from HTML template of objects and array.
	 * @param {*} matches
	 * @param {*} template
	 */
	#getObjectParams(matches, template) {
		const arrayName = new RegExp(
			`"\\(*([\\d\\w$]+),*.*\\)*\\s(?:in|of)\\s${matches[matches.length - 1]}`,
			"igm"
		).exec(matches[0]) || [null, matches];
		const regex = new RegExp(`${arrayName[1]}\\.([\\d\\w$]+)`, "igm");
		const obj = {};
		let matched;

		while ((matched = regex.exec(template))) {
			if (matched) {
				let param = matched.slice(0).pop();
				if (param) {
					param = param
						.replace(/[{(}),]/g, "")
						.split(/\s+/)
						.shift();
				}
				obj[param] = `{{${param}}}`;
			}
		}

		return obj;
	}
}

module.exports = TemplateParameterReader;