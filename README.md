# Pdf-Generator (html-pdf-generator on NPM)

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[npm-image]:http://img.shields.io/npm/v/html-pdf-generator.svg
[npm-url]:https://npmjs.org/package/html-pdf-generator
[downloads-image]:http://img.shields.io/npm/dm/html-pdf-generator.svg

A [NodeJs](https://nodejs.org) plugin to generate PDF from HTML template using [Puppeteer](https://github.com/puppeteer/puppeteer) and [Vue.js](https://vuejs.org/).

See postman [collection](../demo/pdf-generator-test.postman_collection.json) for more example,

> If you need more functionality in your HTML template you can add the &nbsp;&nbsp; `Vuejs mixins`&nbsp;&nbsp; in the global `window.mixins` array to extend Vuejs default functionality. See the file [mixin.js](../demo/misc/mixin.js) for more example.

## Interfaces

The `options` param is an object with the properties to config puppeteer, set the printing margin of the PDF and setting the JavaScript files to be loaded automatically into the template. See `.env` file in the demo app:

```typescript
interface Options {
    URL_BROWSER: string; // <DirToExecuteChromeOrFirefox> - Browser executable full path
    FILE_DIR: string; // <TemporalHTMLFileDir> - Where to save temporary files
    PDF_DIR: string; // <TemporalPDFFileDir> - Where to save the pdf generated
    TEMPLATE_DIR: string; // <TemplateDir> - Where the VueJs/HTML templates live
    PORT: number; // Port used in NodeJs service
    printingMarginTop?: string | number; // default 2.54cm
    printingMarginBottom?: string | number; // default 2.54cm
    printingMarginLeft?: string | number; // default 2.54cm
    printingMarginRight?: string | number; // default 2.54cm
    BROWSER_NAME?: string; // chrome|firefox - default chrome
    libs: Array<string> // List of js files used on the templates
}
```

```typescript
interface PdfMergerDelegator {
    getPdfTotalPages: (pdfBuffer: Buffer) => Promise<number>;
    merge: (pdfList: Array<Buffer>) => Promise<Buffer>;
}

interface TemplateData {
    $templateName: string,
    $parameters: {[key:string]: any}, 
    $extraParams: {[key:string]: any}
}

interface PDFGeneratorResult {
    fileName: string;
    buffer: Buffer | Array<Buffer>;
    templateType: 'application/pdf' | 'text/html' | 'array/pdf';
}

interface PdfGenerator {
    /**
     * Process the VueJs template to generate PDF
     * @param ParamData
     * @param PdfMergerDelegator optional
     * 
     * @returns Promise<PDFGeneratorResult>
     */
    processTemplate: (data: ParamData, pdfMergerDelegator?: PdfMergerDelegator) => Promise<PDFGeneratorResult>;
    /**
     * Dispose the puppeteer instance
     */
    dispose: () => Promise<void>;
}
```
## API
```typescript
/**
 * Create a PDF Generator instance
 *
 * @param Options
 * @returns PdfGenerator
 */
function pdfGeneratorInstance(options: Options) => PdfGenerator; 

/**
 * Real all the params found in a HTML template with the Vue.js template syntax.
 *
 * @param string templateName
 * @returns Promise<{[key: string]: any}>
 */
function getTemplateParameters(templateName: string): Promise<{[key: string]: any}>;
```