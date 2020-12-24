const pdfLib = require('pdf-lib');

module.exports.getPdfTotalPages = (pdfBuffer) => {
    return pdfLib.PDFDocument.load(pdfBuffer)
        .then( pdfDoc => pdfDoc.getPageCount());
};
module.exports.merge = async (pdfList) => {
    return pdfLib.PDFDocument.create()
        .then( async (mergedPdf) =>  {
            for (let i in pdfList) {
                pdfDocument = await pdfLib.PDFDocument.load(pdfList[i]);
                const copiedPages = await mergedPdf.copyPages(pdfDocument, pdfDocument.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            return Buffer.from(await mergedPdf.save());
        });
};