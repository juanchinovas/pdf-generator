class PdfMergeDelegator {
	#thirdPdfLib;

	constructor(pdfLib) {
		this.#thirdPdfLib = pdfLib;
	}

	async getPdfTotalPages(pdfBuffer) {
		const pdfDoc = await this.#thirdPdfLib.PDFDocument.load(pdfBuffer);
		return pdfDoc.getPageCount();
	}

	async merge(pdfList, metadata = {}) {
		const pdfDoc = await this.#thirdPdfLib.PDFDocument.create();
		for (const page of pdfList) {
			const pdfDocument = await this.#thirdPdfLib.PDFDocument.load(page);
			const copiedPages = await pdfDoc.copyPages(pdfDocument, pdfDocument.getPageIndices());
			copiedPages.forEach((page) => pdfDoc.addPage(page));
		}
		this.addMetadata(pdfDoc, metadata);
		return Buffer.from(await pdfDoc.save());
	};

	addMetadata(pdfDoc, metadata = {}) {
		pdfDoc.setTitle(metadata.title);
		pdfDoc.setAuthor(metadata.author);
		pdfDoc.setSubject(metadata.summary);
		pdfDoc.setKeywords(metadata.keywords ?? []);
		pdfDoc.setProducer('@sunacchi/pdf-generator');
		pdfDoc.setCreator('pdf-generator');
		pdfDoc.setCreationDate(new Date());
		pdfDoc.setModificationDate(new Date());
	}
}

module.exports = PdfMergeDelegator;
