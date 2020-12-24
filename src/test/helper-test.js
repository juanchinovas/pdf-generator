const expect = require("chai").expect;
const helper = require("../helper");

describe("Testing helper file functionality", () => {
    let helperIni = null;

    before(() => {
        helperIni = helper.initialize({
            FILE_DIR: '../demo/temp',
            TEMPLATE_DIR:'../demo/templates',
            PDF_DIR: '../demo/temp/pdfs'
        });
    });

    describe("Reading Template's parameters", () => {
    
        it("Read params from ../demo/templates/Template1.html", (done) => {
            helper.getTemplateParameters("Template1")
            .then((params) => {
                expect(params).to.be.an('object').that.is.empty;
                expect(params).to.not.have.any.keys('param1', 'param2');
                done()
            })
            .catch((err) => {
                done(err);
            });
        });
        it("Read params from ../demo/templates/Template3.html", (done) => {
            helper.getTemplateParameters("Template3")
            .then((params) => {
                expect(params).to.be.an('object').that.is.not.empty;
                expect(params).to.have.any.keys('param1', 'param2');
                expect(params).to.have.property('param1').that.is.equal("{{param1}}");
                done()
            })
            .catch((err) => {
                done(err);
            });
        });
    });

    it("Initializer return", () => {
        expect(helperIni).to.be.an('object').that.is.not.empty;
        expect(helperIni).to.have.all.keys('prepareTemplate', 'deleteFile', 'saveFile', 'dispose');
        expect(helperIni).to.have.property('prepareTemplate').that.is.a('function');
        expect(helperIni).to.have.property('deleteFile').that.is.a('function');
        expect(helperIni).to.have.property('saveFile').that.is.a('function');
        expect(helperIni).to.have.property('dispose').that.is.a('function');
    });

    describe("File from template", () => {
        let fileName = "";
        it("Create a file using ../demo/templates/Template1.html", (done) => {
            helperIni.prepareTemplate({$templateName: "Template1", $parameters: {}})
            .then((data) => {
                fileName = data.fileName;
                expect(data).to.be.an('object').that.is.not.empty;
                expect(data).to.have.property('fileName').that.match(/\w+_\d+/);
                done()
            })
            .catch((err) => {
                done(err);
            });
        });
        it("Deleting file created using ../demo/templates/Template1.html", (done) => {
            try {
                helperIni.deleteFile(`../demo/temp/${fileName}.html`);
                done();
            } catch (err) {
                done(err);
            }
            
        });
    });
    after(() => {
        helperIni = null;
    })
})