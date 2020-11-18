const compression = require("compression");
const express = require("express");
const bodyParser = require("body-parser");
const pdfProcessor = require("html-pdf-generator");
const fs = require("fs");

const app = express();
const {
    BROWSER_NAME,
    URL_BROWSER,
    FILE_DIR,
    PDF_DIR,
    PORT = 3000,
    TEMPLATE_DIR,
    libs = ['misc/mixin.js']  
} = process.env;

let pdfGenerator = pdfProcessor.pdfGenerator({
    BROWSER_NAME,
    URL_BROWSER,
    FILE_DIR,
    PDF_DIR,
    PORT,
    TEMPLATE_DIR,
    libs 
});
const host = `http://localhost:${PORT}`;

// compress all responses
app.use(compression());
app.use(express.static("temp"));
app.use("/misc", express.static("misc"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: ["text/html", "text/plain"] }));

app.get("/test-pdf/:templateName", (req, res) => {
    try {
        let data = {noData: true};
        const fileTemplate = `./test-data/data - ${req.params.templateName}.json`;
        if (fs.existsSync(fileTemplate)) {
            data = require(fileTemplate);
        }
        const parameters = parseDataFromArrayToObject(data.parameters);
        const templateData = {
            $templateName: req.params["templateName"],
            $parameters: parameters,
            $extraParams: getExtraParams(data, ["parameters"])
        };
        
        pdfGenerator
            .processTemplate(templateData)
            .then(processed => {
                res.setHeader(
                    "Content-Disposition",
                    "inline; filename=" + processed.fileName
                );
                res.type("application/pdf");

                res.send(processed.buffer);
            })
            .catch(err => {
                res.status(400).send({ message: err, code: -15 });
            });
    } catch (err) {
        res.status(400).send({ message: err.message, code: -16 });
    }
});

app.post("/documents", (req, res) => {
    if (req.body === null || req.body === undefined) {
        res.status(400).send({ message: "Empty request body", code: -20 });
        return;
    }
    const data = req.body;
    let pdfGenPromise = null;
    if (data.urlTemplate || typeof(data) === "string") {
        pdfGenPromise = pdfGenerator
        .processTemplate(data);
    } else {
        const parameters = parseDataFromArrayToObject(data.parameters);
        const templateData = {
            $templateName: data.templateName,
            $parameters: parameters,
            $extraParams: getExtraParams(data, ["parameters"])
        };
        pdfGenPromise = pdfGenerator
        .processTemplate(templateData);
    }

    pdfGenPromise.then(processed => {
            res.json({
                fileName: processed.fileName,
                url: `${host}/documents/${processed.fileName}`
            });
        })
        .catch(err => {
            res.status(400).send({ message: err, code: -17 });
        });
});

app.get("/documents/:fileName", (req, res) => {
    res.sendFile(`${__dirname}/${PDF_DIR}/${req.params.fileName}`);
});

app.get("/templates/:templateName/parameters", (req, res) => {
    pdfProcessor
        .getTemplateParameters(req.params.templateName)
        .then(params => {
            res.json({
                templateName: req.params.templateName,
                parameters: params
            });
        })
        .catch(err => {
            res.status(400).send({ message: err, code: -17 });
        });
});

function parseDataFromArrayToObject(params) {
    let _params = params || {};
    if (
        Array.isArray(params) &&
        params.length &&
        params[0].key &&
        params[0].value
    ) {
        _params = params.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
    }

    return _params;
}

function getExtraParams(data, excludes) {
    return Object.keys(data)
        .filter(key => !excludes.includes(key))
        .reduce((curr, key) => {
            curr[key] = data[key];
            return curr;
        }, {});
}

app.listen(PORT, () =>
    console.log(`Example app listening at ${host}`)
);

process.on("exit", function(code) {
    console.log(`About to exit with code: ${code}`);
    pdfGenerator && pdfGenerator.dispose();
    pdfGenerator = null;
});
