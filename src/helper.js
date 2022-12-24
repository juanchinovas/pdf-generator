const fileHelper = require("./file-helper");

/**
 * Read template content and prepare a html template with the data to be show on the headless browser
 * @param {*} data
 */
function readTemplateContent(data, options) {
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
            throw new Error("No $templateName provided");
        }

        fileHelper
            .readFile(`${options.TEMPLATE_DIR}/${data.$templateName}.html`)
            .then(templateData => templateData.toString("utf8"))
            .then(async (template) => {
                let orientation, previewHTML, preview, customPagesHeaderFooter;

                if (!("noData" in data)) {
                    var param = _getTemplateParameters(template);
                    let templateParts = template.split(/<\/body>\n*(<\/html>)*/gm);
                    const extraParams = data.$extraParams || {};

                    param.extraParams = extraParams;
                    param.extraParams.totalPages = 0;
                    delete param.totalPages;

                    orientation = extraParams.orientation;
                    previewHTML = extraParams.previewHTML;
                    preview = extraParams.preview;
                    customPagesHeaderFooter = extraParams.customPagesHeaderFooter;

                    templateParts.push(options.libs.map(s => s.script ?? `<script src="${s}"></script>`).join('\n'));
                    templateParts.push(`<script>
                        window.onload = function () {
                            const [App, elemId] = initVue(${JSON.stringify(Object.assign(param, data.$parameters))});
                            reactiveInstance = elemId ? App.mount(elemId) : new Vue(App);
                        }
                    </script>`);
                    templateParts.push('</body></html>');
                    template = templateParts.join('');
                }

                res({
                    template,
                    templateName: data.$templateName,
                    orientation, 
                    previewHTML, 
                    preview,
                    customPagesHeaderFooter
                });
            })
            .catch(rej);
    });
}
/**
 * Save the template with its data as html file to be consume for the headless browser
 * @param {*} templateName
 * @param {*} template
 * @param {*} fileDir
 * 
 * @returns {*}
 * 
 */
async function saveOnTemp(templateName, template, fileDir) {
    var fileName = `${templateName}_${new Date().getTime()}`;

    if (templateName === "external_template") {
        return Promise.resolve({
            fileName,
            urlTemplate: template
        });
    }

    await fileHelper
        .saveFile(`${fileDir}/${fileName}.html`, template);

    return ({
        fileName
    });
}

/**
 * Read parameter from HTML template
 * @param {*} template
 */
function _getTemplateParameters(template) {
    var matched = "";
    var regex = /((?:\{\{)\s*([\d\w$]+)\s*(?:\}\}))|(?:v-for=.+(in|of)\s)([\.\d\w$]+)|(?:\{\{)\s*[\d\w$\.]+\(([\d\w$]+),*[\w\s\d"'-]*\)(?:\}\})|(?:\{\{)([\d$\w]+)\.([\d$\w]+)(?:\}\})/mgi;
    var objResult = {};
    var key = "";
    let matches = null;

    while ((matched = regex.exec(template))) {
        if (matched) {
            matches = matched.slice(0).filter(f => f);
            if (matches[0].match("v-for")) {
                key = matches[matches.length - 1];
                if (objResult[key] && Array.isArray(objResult[key])) {
                    objResult[key] = [Object.assign(objResult[key][0], getObjectParams(matches, template))];
                    continue;
                } 
                objResult[key] = [getObjectParams(matches, template)];
            } else if (matches[0].match(/(?:\{\{)([\d$\w]+)\.([\d$\w]+)(?:\}\})/)) {
                objResult[matches[1]] = getObjectParams(matches[1], template);
            } else if (isNaN(matches[matches.length - 1])) {
                key = matches.pop();
                objResult[key] =  `{{${key}}}`;
            }
        }
    }

    return objResult;
}

/**
 * Read parameters from HTML template of objects and array.
 * @param {*} matches
 * @param {*} template
 */
function getObjectParams(matches, template) {
   var arrayName = new RegExp(
        `"\\(*([\\d\\w$]+),*.*\\)*\\s(?:in|of)\\s${matches[matches.length - 1]}`,
        "igm"
    ).exec(matches[0]) || [null, matches];
    var regex = new RegExp(`${arrayName[1]}\\.([\\d\\w$]+)`, "igm");
    var obj = {};

    while ((matched = regex.exec(template))) {
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
    let _options = {
        FILE_DIR: options.FILE_DIR,
        PDF_DIR: options.PDF_DIR,
        TEMPLATE_DIR: options.TEMPLATE_DIR,
        libs: (options.libs || [])
    };
    let vueLib = _options.libs && Array.isArray(_options.libs) && _options.libs.find(s => /vue(\.min\.+?js?)*/.test(s));
    if (!vueLib) {
        vueLib = "https://cdn.jsdelivr.net/npm/vue@3";
    }

    _options.libs = [
        vueLib,
        { script: `<script>${fileHelper.readFileAsync(`${__dirname}/script-factory.js`)}</script>`},
        ..._options.libs.filter(lib => lib !== vueLib)
    ];
    
    return {
        prepareTemplate: async (data) => {
            await fileHelper.ensureExitsDir([_options.FILE_DIR, _options.PDF_DIR]);
            const processedData = await readTemplateContent(data, _options);
            const fileName = await saveOnTemp(
                processedData.templateName,
                processedData.template,
                _options.FILE_DIR
            );
            return ({
                ...fileName,
                ...processedData
            });
        },
        deleteFile: fileHelper.deleteFile,
        saveFile: fileHelper.saveFile,
        dispose: () => {
            _options = null;
        },

        /**
         * Read template parameter from source code.
         * 
         * Need to remove global op
         * 
         * @param {*} templateName 
         * @returns 
         */
        getTemplateParameters: async (templateName) => {
            const processedData = await readTemplateContent({
                $templateName: templateName,
                noData: true
            }, _options);
            return _getTemplateParameters(processedData.template);
        }
    };
};