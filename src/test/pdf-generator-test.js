const expect = require("chai").expect;
const pdfGen = require("../pdf-generator");

const URL_BROWSER = /*"/opt/google/chrome/google-chrome";*/
                    /*'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'*/
                    `C:\\Users\\jnovas\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`;

describe("Testing pdf generator file", () => {

    it("should fail when #initialize() with no data", () => {
        try {
            const init = pdfGen.initialize();
        } catch (err) {
            expect(err.message).to.be.a('string').that.to.be.equal("Cannot destructure property `BROWSER_NAME` of 'undefined' or 'null'.");
        }
    });
    it("should #initialize() returns an object with two functions", () => {
        const init = pdfGen.initialize({});
        expect(init).to.be.an('object').that.not.is.empty;
        expect(init).to.have.all.keys('processTemplate', 'dispose');
        init.dispose().then(() => {});
    });
    it("should fail when #processTemplate() with no data", (done) => {
        const init = pdfGen.initialize({});
        init.processTemplate()
        .then(() => {
            done("failed");
        })
        .catch( err => {
            expect(err).to.be.a('string').that.to.be.equal("No target browser found");
            done();
        })
        .finally(() => {
            init.dispose().then(() => {});
        });
    });
    it("should fail when #processTemplate(...) with empty object", (done) => {
        const init = pdfGen.initialize({
            URL_BROWSER, // depend of the OS
            FILE_DIR: '../demo/temp',
            TEMPLATE_DIR:'../demo/templates',
            PDF_DIR: '../demo/temp/pdfs'
        });
        init.processTemplate({})
        .then(() => {
            done("failed");
            console.log("juahaha");
        })
        .catch( err => {
            expect(err).to.be.a('string').that.to.be.equal("No $templateName provided");
            done();
        })
        .finally(() => {
            init.dispose().then(() => {});
        });
    });
    it("should fail when #processTemplate(...) with not existing template", (done) => {
        const init = pdfGen.initialize({
            URL_BROWSER, // depend of the OS
            FILE_DIR: '../demo/temp',
            TEMPLATE_DIR:'../demo/templates',
            PDF_DIR: '../demo/temp/pdfs'
        });
        init.processTemplate({$templateName: "No_found"})
        .then(() => {
            done("failed");
        })
        .catch( err => {
            
            console.log(err);
            expect(err).to.be.a('string').that.to.be.equal("ENOENT: no such file or directory, open \'../demo/templates/No_found.html\'");
            done();
        })
        .finally(() => {
            init.dispose().then(() => {});
        });
    });
    it("should fail #processTemplate(...) wrong port number", (done) => {
        const init = pdfGen.initialize({
            URL_BROWSER, // depend of the OS
            FILE_DIR: '../demo/temp',
            TEMPLATE_DIR:'../demo/templates',
            PDF_DIR: '../demo/temp/pdfs',
            PORT: 13000
        });
        init.processTemplate({$templateName: "Template1"})
        .then(() => {
            done("failed");
        })
        .catch( err => {
            
            console.log(err);
            expect(err).to.be.a('string').that.match(/net::ERR_CONNECTION_REFUSED at/ig);
            done();
        })
        .finally(() => {
            init.dispose().then(() => {});
        });
    });
    it("should #processTemplate() returns an object", (done) => {
        // require demo server
        require("../../demo/index");

        const init = pdfGen.initialize({
            URL_BROWSER, // depend of the OS
            FILE_DIR: '../demo/temp',
            TEMPLATE_DIR:'../demo/templates',
            PDF_DIR: '../demo/temp/pdfs',
            PORT: 3000
        });

        init.processTemplate({$templateName: "Template1"})
        .then((res) => {
            expect(res).to.be.an('object').that.is.not.empty;
            expect(res).to.have.all.keys('fileName', 'buffer');
            expect(res.fileName).to.be.a("string").that.match(/\w+_\d+.pdf/);
            expect(res.buffer).to.be.an.instanceOf(Buffer);
            done();
        })
        .catch( err => {
            
            console.log(err);
            done(err);
        })
        .finally(() => {
            init.dispose().then(() => {});
        });
    });

});