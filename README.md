# Pdf-Generator (html-pdf-generator on NPM)

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]

[npm-image]:http://img.shields.io/npm/v/html-pdf-generator.svg
[npm-url]:https://npmjs.org/package/html-pdf-generator
[downloads-image]:http://img.shields.io/npm/dm/html-pdf-generator.svg

A [NodeJs](https://nodejs.org) plugin to generate PDF from HTML template using [Puppeteer](https://github.com/puppeteer/puppeteer) and [Vue.js](https://vuejs.org/).

See postman [collection](../demo/pdf-generator-test.postman_collection.json) for more example,

> If you need more functionality in your HTML template you can add the `VueJs mixin` in the global `window.mixins` array to extend default functionality. See the file [mixin.js](../demo/misc/mixin.js) for more example.

# Table of contents
- [Installation](#installation)
- [Usage Example](#usage-example)
  - [Initialize](#initialize)
  - [Generate PDF in memory](#generate-pdf-in-memory)
  - [Generate HTML in memory](#generate-html-in-memory)
  - [Different headers/footers](#different-headersfooters)
  - [Components](#components)
  - [PDF Merger Delegator](#pdf-merger-delegator)
- [Documentation](#documentation)
  - [Interfaces](#interfaces)
  - [API](#api)

# Installation
**NPM Module**
```node
npm i html-pdf-generator
```
# Usage Example
## Initialize
```javascript
const pdfProcessor = require("html-pdf-generator");

const {
    BROWSER_NAME,
    URL_BROWSER,
    FILE_DIR,
    PDF_DIR,
    PORT = 3000,
    TEMPLATE_DIR
} = process.env;

let pdfGenerator = pdfProcessor.pdfGeneratorInstance({
    BROWSER_NAME,
    URL_BROWSER,
    FILE_DIR,
    PDF_DIR,
    PORT,
    TEMPLATE_DIR,
    libs: [/*VueJs mixin files*/],
    pdfMergerDelegator
});
```
> Use `process.env` if you passed the environment variables using node command. I recommend use a `.env` file and the package [dotenv](https://www.npmjs.com/package/dotenv).

> `libs` property in the `Options` object pass to `pdfGeneratorInstance` function is optional, is a list of VueJs mixin modules o components to be injected into the template. Can be pass it a VueJs library url by default is use this https://cdn.jsdelivr.net/npm/vue
> See `pdfMergerDelegator` info in [PDF Merger Delegator](#pdf-merger-delegator).

## Generate PDF in memory
```typescript
const templateData = {
    $templateName: "template name",
    $parameters: {},
    $extraParams: {}
};
// Indicate the pdf file is created in memory 
templateData.$extraParams.preview: true;
// Indicate if the result is or not HTML
templateData.$extraParams.previewHTML: false;

pdfGenerator
    .processTemplate(templateData)
    .then(processed => {
        /*You code here*/
    })
```
## Generate HTML in memory
```typescript
const templateData = {
    $templateName: "template name",
    $parameters: {},
    $extraParams: {}
};
// Indicate the pdf file is created in memory 
templateData.$extraParams.preview: true;
// Indicate if the result is or not HTML
templateData.$extraParams.previewHTML: true;

pdfGenerator
    .processTemplate(templateData)
    .then(processed => {
        /*You code here*/
    })
```
## Different headers/footers
To use different headers and footers in the PDF pages generated. Have to pass the property `customPagesHeaderFooter` passing the array of string with the page where the header/footer must to be added.

```json
{
    "$templateName": ,
    "$parameters": {},
    "$extraParams": {
        "customPagesHeaderFooter" : [
            "1", 
            "2-penult",
            "last"
        ]
    }
}
```
> The pages in the array can be number as it generated on the browser or name 
> * `first`     --> Document page #1.
> * `penult`    --> Previous to last document page.
> * `last`      --> Last document page.
> * `1-3`       --> Rage of pages, starting from page 1 to page 3.
> * `2-penult`  --> Rage of pages, starting from page 2 to previous to last page.

> For each page ranges in the array **`customPagesHeaderFooter`** in the template have to be a element with the `id='page-header-{page-range}'` or `id='page-footer-{page-range}'` is important that the element is hidden.
```html
<div 
    id="header-page-2-penult" 
    class="header">
    <div>
        <label>I'm in the header from 2 to penult page</label>
    </div>
    <v-style>
        #header-page-2-penult {
            padding: 2.1em 2cm;
            margin-top: -.4cm;
            display: flex; 
            align-items: center; 
            width: 100%;
            justify-content: flex-end;
            background-color: violet;
            color: #fff;
            font-size: 12px;
        }

        #header-page-2-penult > div {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            text-align: right;
        }
    </v-style>
</div>
```
**As `VueJs` remove the css style tag by default, the element `v-style` is include in the library. `v-style` let you include the css to the header/footer**.

## Components
VueJs component are valid.
```javascript
Vue.component('test-component', {
  props: ["prop1"],
  template: '<label>I am a component {{prop1}}</label>'
})
```
All the components must to be in separated file and reference it on the `libs` property.

## PDF Merger Delegator
The PDF delegator is a helper that satisfy the interface
```typescript
{
    getPdfTotalPages: (pdfBuffer: Buffer) => Promise<number>;
    merge: (pdfList: Array<Buffer>) => Promise<Buffer>;
}
```
> * `getPdfTotalPages` function to get the total pages of the generated pdf
> * `merge` function to merge all pages generated by the [Different headers/footers](#different-headersfooters)

The delegator is implemented using a library that can manipulate pdf. Like [pdf-lib](https://www.npmjs.com/package/pdf-lib) or other.

> See [pdf delegator of the demo](./demo/pdfMergerDelegator.js).

`Why a delegator?` due to the limitation of using Puppeteer to generate pdf with different header or footer as an only file is necessary a third library to merge the pdf generated with different headers and footers. Too right now is not possible to get the total pages of the document with Puppeteer.

# Documentation

## Interfaces

The `options` param is an object with the properties to config puppeteer, set the printing margin of the PDF and setting the JavaScript files to be loaded automatically into the template. See `.env` file in the demo app:

```typescript
interface Options {
    URL_BROWSER: string; // <DirToExecuteChromeOrFirefox> - Browser executable full path
    FILE_DIR: string; // <TemporalHTMLFileDir> - Where to save temporary files
    PDF_DIR: string; // <TemporalPDFFileDir> - Where to save the pdf generated
    TEMPLATE_DIR: string; // <TemplateDir> - Where the VueJs/HTML templates live
    BROWSER_NAME?: string; // chrome|firefox - default chrome
    PORT: number; // Port used in NodeJs service
    printingMarginTop?: string | number; // default 2.54cm
    printingMarginBottom?: string | number; // default 2.54cm
    printingMarginLeft?: string | number; // default 2.54cm
    printingMarginRight?: string | number; // default 2.54cm
    libs: Array<string> // List of js files used on the templates
    pdfMergerDelegator?: PdfMergerDelegator; // Object to merge the different pdf create with distinct header/footer and get the total page.
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
     * 
     * @returns Promise<PDFGeneratorResult>
     */
    processTemplate: (data: ParamData) => Promise<PDFGeneratorResult>;
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
 * Real all the params found in a HTML template 
 * with the Vue.js template syntax.
 *
 * @param string templateName
 * @returns Promise<{[key: string]: any}>
 */
function getTemplateParameters(templateName: string): Promise<{[key: string]: any}>;
```