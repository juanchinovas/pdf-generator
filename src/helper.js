const logger = require("./logger");
const fileHelper = require("./file-helper");

let _options;

/**
 * Read template content and prepare a html template with the data to be show on the headless browser
 * @param {*} data
 */
function readTemplateContent(data) {
    if (!data) {
        throw new Error("No data provided");
    }
    return new Promise(function (res, rej) {
        //The template data is a raw HTML
        if (typeof data === "string") {
            return res({
                template: data,
                templateName: "custom_template"
            });
        }

        //The template is a external file
        if (data.urlTemplate) {
            return res({
                template: data.urlTemplate,
                templateName: data.$templateName || "external_template"
            });
        }

        if (!data.$templateName) {
            throw new Error("No templateName provided");
        }

        fileHelper
            .readFile(`${_options.TEMPLATE_DIR}/${data.$templateName}.html`)
            .then(templateData => templateData.toString("utf8"))
            .then(template => {
                if (!("noData" in data)) {
                    var param = _getTemplateParameters(template);
                    param.extraParams = data.$extraParams;
                    let templateParts = template.split(/<\/body>\n*(<\/html>)*/gm);

                    templateParts.push(`
                            <script src="https://cdn.jsdelivr.net/npm/vue"></script>
                            <script>
                                window.onload = function () {
                                    new Vue({
                                        mixins: window.mixins || [],
                                        el: '#app',
                                        data: ${JSON.stringify(
                                            Object.assign(
                                                param,
                                                data.$parameters
                                            )
                                        )}
                                    });
                                }
                            </script></body></html>`);
                    template = templateParts.join('');
                }

                res({
                    template,
                    templateName: data.$templateName
                });
            })
            .catch(rej);
    });
}

/**
 * Save the template with its data as html file to be consume for the headless browser
 * @param {*} templateName
 * @param {*} template
 */
function saveOnTemp(templateName, template) {
    var fileName = `${templateName}_${new Date().getTime()}`;

    if (templateName === "external_template") {
        return Promise.resolve({
            fileName,
            urlTemplate: template
        });
    }

    return fileHelper
        .saveFile(`${_options.FILE_DIR}/${fileName}.html`, template)
        .then(() => ({
            fileName
        }));
}

/**
 * Read parameter from HTML template
 * @param {*} template
 */
function _getTemplateParameters(template) {
    var matched = "";
    var regex = /(\{\{\s*([a-zA-Z0-9_]+)\s*\}\})|(?:v-for=.+in\s)([a-zA-Z0-9_]+)/gi;
    var objResult = {};
    var key = "";

    while ((matched = regex.exec(template))) {
        if (matched) {
            key = matched[2] || matched[3];
            objResult[key] = matched[1] || [getArrayParams(matched, template)];
        }
    }

    return objResult;
}

/**
 * Read parameters from HTML template of objects and array.
 * @param {*} matches
 * @param {*} template
 */
function getArrayParams(matches, template) {
    if (matches && !matches[0].match("v-for")) return "";

    var arrayName = new RegExp(
        `"\\(*([a-z]+),*.*\\)*\\sin\\s${matches[3]}`,
        "ig"
    ).exec(matches[0]);
    var arrayParam = new RegExp(`${arrayName[1]}\\.(.+)\\}\\}`, "ig");
    var obj = {};
    while ((matched = arrayParam.exec(template))) {
        if (matched) {
            let param = matched.slice(0).pop();
            if (param) {
                param = param
                    .replace(/[\{\(\}\),]/g, "")
                    .split(/\s+/)
                    .shift();
            }
            obj[param] = `{{${param}}}`;
        }
    }

    return obj;
}

module.exports.initialize = function (options) {
    const {
        FILE_DIR,
        PDF_DIR,
        TEMPLATE_DIR
    } = options;
    _options = {
        FILE_DIR,
        PDF_DIR,
        TEMPLATE_DIR
    };

    return {
        prepareTemplate: function (data) {
            return fileHelper
                .ensureExitsDir([_options.FILE_DIR, _options.PDF_DIR])
                .then(() =>
                    readTemplateContent(data).then(processedData =>
                        saveOnTemp(
                            processedData.templateName,
                            processedData.template
                        )
                    )
                );
        },
        deleteFile: fileHelper.deleteFile,
        dispose: () => {
            _options = null;
        }
    };
};

module.exports.getTemplateParameters = function (templateName) {
    return readTemplateContent({
        $templateName: templateName,
        noData: true
    }).then(processedData => _getTemplateParameters(processedData.template));
};