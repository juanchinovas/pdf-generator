const PdfGenerator = require("./pdf-generator");
const Logger = require("./logger");
const FileHelper = require("./file-helper");
const TemplateHelper = require("./template-helper");
const TemplateParameterReader = require("./template-parameter-reader");
const puppeteer = require("puppeteer-core");
const fs = require("fs")


const logger = new Logger(fs);
const fileHelper = new FileHelper(logger, fs);
const templateParameterReader = new TemplateParameterReader()

/**
 * Initialize PDF generator
 *
 * @param {*} options
 * @returns {*} PdfGenerator
 */
exports.pdfGeneratorInstance = (options) => {
	const templateHelper = new TemplateHelper(options, fileHelper, templateParameterReader);
	return new PdfGenerator(options, logger,templateHelper, fileHelper, puppeteer);
};
