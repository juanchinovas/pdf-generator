export interface Options {
    URL_BROWSER: string;
    FILE_DIR: string;
    PDF_DIR: string;
    TEMPLATE_DIR: string;
    PORT: number;
    printingMarginTop?: string | number;
    printingMarginBottom?: string | number;
    printingMarginLeft?: string | number;
    printingMarginRight?: string | number;
    BROWSER_NAME?: string;
    /**
     * Array list of javascript files to include in every templates.
     */
    libs: Array<string>;
};
interface ParamData {
    $templateName: string,
    $parameters: any,
    $extraParams?: any
}
interface PDFGeneratorResult {
    fileName: string;
    buffer: Buffer;
}
export interface PDFGenerator {
    processTemplate: (data: ParamData) => Promise<PDFGeneratorResult>;
    dispose: () => Promise<void>;
};
/**
 * Create a PDF Generator instance
 * @param options Options
 * @returns PDFGenerator
 */
export function pdfGenerator(options: Options): PDFGenerator;
/**
 * Real all the params found in a HTML template with the Vue.js template syntax.
 * @param templateName string
 * @returns Promise<{[key: string]: any}>
 */
export function getTemplateParameters(templateName: string): Promise<{[key: string]: any}>;