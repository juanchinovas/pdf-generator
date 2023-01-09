class TemplateParameterReader {
	constructor() {}

	/**
	 * Read parameter from HTML template
	 * @param {*} template
	 */
	getParametersFrom(template) {
		const regex = /((?:\{\{)\s*([\d\w$.]+)\s*(?:\}\}))|(?:v-for="([\d\w]+)\s(in|of)\s)([.\d\w$]+)|(?:\{\{)\s*[\d\w$.]+\(([\d\w$]+),*[\w\s\d"'-]*\)(?:\}\})|(?:text|html|show|if|else-if|bind|:|model)="([\d$\w.]+)"|(?:show|if|else-if)="([\d$\w.]+)+"|(?:show|if|else-if)=.+\s([a-zA-Z]+)\s*"|(?:show|if|else-if)="(\s*[a-zA-Z]*\(*([\d\$\w.]+)\)|([\d\$\w.]+))/mgi;
		const objResult = {};
		const unWantedkeys = new Map();
		let key = "", matches = null, matched = "";

		while ((matched = regex.exec(template))) {
			if (matched) {
				matches = matched.slice(0).filter(f => f);
				key = matches[matches.length - 1];
				let [parent, child, ...rest] = key.split(".");
				if (matches[0].match("v-for")) {
					objResult[key] = [this.#getObjectParams(matches, template)];
					unWantedkeys.set(matches[1], key);
				} else if (parent && child) {
					objResult[parent] = objResult[parent] ?? {};
					if (rest && rest.length) {
						objResult[parent][child] = rest.reduce(([obj, old], item) => {
							if (!obj[item]) {
								obj[item] = {};
							}
							return [ obj[item], old ?? obj ];
						}, [{}]).pop();
						continue;
					}
					objResult[parent][child] = `{{${child}}}`;
				} else if (!child && isNaN(parent)) {
					objResult[parent] = `{{${parent}}}`;
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
		).exec(matches[0]);
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