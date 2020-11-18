# Pdf-Generator (html-pdf-generator on NPM)

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[npm-image]:http://img.shields.io/npm/v/html-pdf-generator.svg
[npm-url]:https://npmjs.org/package/html-pdf-generator
[downloads-image]:http://img.shields.io/npm/dm/html-pdf-generator.svg

A [NodeJs](https://nodejs.org) plugin to generate PDF from HTML template using [Puppeteer](https://github.com/puppeteer/puppeteer) and [Vue.js](https://vuejs.org/).

See postman [collection](../demo/pdf-generator-test.postman_collection.json) for mare example,

> If you need more functionality in your HTML template you can add the &nbsp;&nbsp; `mixins: Array`&nbsp;&nbsp; properties to the window object to extend Vue.js default functionality.

## API

The `options` param is an object with the properties to config puppeteer and set the printing margin. See `.env` file in the demo app:

```typescript
{
    interface Options {
        URL_BROWSER: string; // <DirToExecuteChromeOrFirefox>
        FILE_DIR: string; // <TemporalHTMLFileDir>
        PDF_DIR: string; // <TemporalPDFFileDir>
        TEMPLATE_DIR: string; // <TemplateDir> - templates
        PORT: number; // Port used in NodeJs service
        printingMarginTop?: string | number; // default 18mm
        printingMarginBottom?: string | number; // default 18mm
        printingMarginLeft?: string | number; // default 18mm
        printingMarginRight?: string | number; // default 18mm
        BROWSER_NAME?: string; // chrome|firefox - default chrome
        libs: Array<string> // List of js files used on the templates
    }
}
```

```javascript
/**
 * Create a PDF Generator instance
 *
 * @param {*} options
 * @returns {*} pdfGenerator
 */
function pdfGenerator(options: Options); 
```
The function `pdfGenerator` returns:

```typescript
{
    processTemplate: (data: {$templateName: string, $parameters: any, $extraParams: any}) => Promise<{fileName: string, buffer: Buffer}>;
    dispose: () => Promise<void>;
}
```

```typescript
/**
 * Real all the params found in a HTML template with the Vue.js template syntax.
 *
 * @param string templateName
 * @returns Promise<{[key: string]: any}>
 */
function getTemplateParameters(templateName: string): Promise<{[key: string]: any}>;
```