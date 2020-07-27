# Pdf-Generator

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[npm-image]:http://img.shields.io/npm/v/pdf-genarator.svg
[npm-url]:https://npmjs.org/package/pdf-genarator
[downloads-image]:http://img.shields.io/npm/dm/pdf-genarator.svg

A [NodeJs](https://nodejs.org) plugin to generate PDF from HTML template using [Puppeteer](https://github.com/puppeteer/puppeteer) and [Vue.js](https://vuejs.org/).

See postman [collection](../demo/pdf-generator-test.postman_collection.json) for mare example,

## API

The options param is an object with the properties to config puppeteer and set the printing margin. See `.env` file in the demo app:

```json
{
    "PORT": number, // Port used in NodeJs service
    "FILE_DIR": string, // <TemporalHTMLFileDir>,
    "PDF_DIR": string, // <TemporalPDFFileDir>,
    "URL_BROWSER": string, // <DirToExecuteChromeOrFirefox>,
    "BROWSER_NAME":  string, // chrome|firefox - default chrome
    "TEMPLATE_DIR":  string, // <TemplateDir>, // templates
    "printingMarginLeft": any, // default 18mm,
    "printingMarginRight": any, // default 18mm,
    "printingMarginTop": any, // default 18mm,
    "printingMarginBottom": any // default 18mm
}
```

```javascript
/**
 * Initialize PDF generator
 *
 * @param {*} options
 * @returns {*} pdfGenerator
 */
function pdfGenerator(options); 
```
The function `pdfGenerator` returns:

```javascript
{
    processTemplate: function({$templateName: string,$parameters: any, $extraParams: any}),
    dispose: function()
}
```

```javascript
/**
 * Read all parameters from a template
 *
 * @param string templateName
 * @returns Promise<{*}>
 */
function getTemplateParameters(templateName)
```