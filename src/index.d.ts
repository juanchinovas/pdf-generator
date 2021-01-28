export interface Options {
    URL_BROWSER: string;
    FILE_DIR: string;
    PDF_DIR: string;
    TEMPLATE_DIR: string;
    BROWSER_NAME?: string;
    PORT: number;
    printingMarginTop?: string | number;
    printingMarginBottom?: string | number;
    printingMarginLeft?: string | number;
    printingMarginRight?: string | number;
    /**
     * Array list of javascript files to include in every templates.
     */
    libs: Array<string>;
    pdfMergerDelegator?: PdfMergerDelegator;
};
export interface ParamData {
    $templateName: string,
    $parameters: any,
    $extraParams?: ExtraParamData
};

export interface PdfMergerDelegator {
    getPdfTotalPages: (pdfBuffer: Buffer) => Promise<number>;
    merge: (pdfList: Array<Buffer>) => Promise<Buffer>;
};

export interface ExtraParamData {
    [key: string]: any;
    orientation?: string;
    preview?: boolean;
    previewHTML?: boolean;
};
export interface PDFGeneratorResult {
    fileName: string;
    buffer: Buffer | Array<Buffer>;
    templateType: 'application/pdf' | 'text/html' | 'array/pdf';
};
export interface PDFGenerator {
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
};

/**
 * Create a PDF Generator instance
 * @param Options
 * @returns PDFGenerator
 */
export function pdfGeneratorInstance(options: Options): PDFGenerator;

/**
 * Real all the params found in a HTML template with the Vue.js template syntax.
 * @param templateName string
 * @returns Promise<{[key: string]: any}>
 */
export function getTemplateParameters(templateName: string): Promise<{[key: string]: any}>;