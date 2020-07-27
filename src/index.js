const pdfGenerator = require("./pdf-generator");
const helper = require("./helper");

/**
 * Initialize PDF generator
 *
 * @param {*} options
 * @returns {*} pdfGenerator
 */
exports.pdfGenerator = pdfGenerator.initialize;

/**
 * Read all parameters from a template
 *
 * @param string templateName
 * @returns Promise<{*}>
 */
exports.getTemplateParameters = helper.getTemplateParameters;