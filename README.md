# Pdf-Generator (html-pdf-generator on NPM)

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[npm-image]:http://img.shields.io/npm/v/html-pdf-generator.svg
[npm-url]:https://npmjs.org/package/html-pdf-generator
[downloads-image]:http://img.shields.io/npm/dm/html-pdf-generator.svg

A [NodeJs](https://nodejs.org) plugin to generate PDF from HTML template using [Puppeteer](https://github.com/puppeteer/puppeteer) and [Vue.js](https://vuejs.org/).

See postman [collection](../demo/pdf-generator-test.postman_collection.json) for mare example,

> If you need more functionality in your HTML tamplate you can add the &nbsp;&nbsp; `mixins: Array`&nbsp;&nbsp; properties to the window object to add a Vue.js mixin object.

## API

The options param is an object with the properties to config puppeteer and set the printing margin. See `.env` file in the demo app:

```javascript
{
    "PORT": number, // Port used in NodeJs service
    "FILE_DIR": string, // <TemporalHTMLFileDir>,
    "PDF_DIR": string, // <TemporalPDFFileDir>,
    "URL_BROWSER": string, // <DirToExecuteChromeOrFirefox>,
    "BROWSER_NAME":  string, // chrome|firefox - default chrome
    "TEMPLATE_DIR":  string, // <TemplateDir>, // templates
    "printingMarginLeft": string | number, // default 18mm,
    "printingMarginRight": string | number, // default 18mm,
    "printingMarginTop": string | number, // default 18mm,
    "printingMarginBottom": string | number // default 18mm
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
    processTemplate: Function({$templateName: string, $parameters: any, $extraParams: any}),
    dispose: Function
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