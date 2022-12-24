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
    pdfMergeDelegator?: PdfMergeDelegator;
    templateServerUrl?: string;
    height?: string | number;
    width?: string | number;
    paperFormat?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
}
export interface ParamData {
    $templateName: string,
    $parameters: any,
    $extraParams?: ExtraParamData
}

export interface PdfMergeDelegator {
    getPdfTotalPages: (pdfBuffer: Buffer) => Promise<number>;
    merge: (pdfList: Array<Buffer>) => Promise<Buffer>;
}

export interface ExtraParamData {
    [key: string]: any;
    orientation?: string;
    preview?: boolean;
    previewHTML?: boolean;
}
export interface PDFGeneratorResult {
    fileName: string;
    totalPages: number;
    buffer: Buffer | Array<Buffer>;
    templateType: 'application/pdf' | 'text/html' | 'array/pdf';
}
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
    /**
     * Real all the params found in a HTML template with the Vue.js template syntax.
     * @param templateName string
     * @returns Promise<{[key: string]: any}>
     */
    getTemplateParameters: (templateName: string) => Promise<{[key: string]: any}>;
}

/**
 * Create a PDF Generator instance
 * @param Options
 * @returns PDFGenerator
 */
export function pdfGeneratorInstance(options: Options): PDFGenerator;
