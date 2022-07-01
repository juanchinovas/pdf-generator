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
            throw new Error("No $templateName provided");
        }

        fileHelper
            .readFile(`${_options.TEMPLATE_DIR}/${data.$templateName}.html`)
            .then(templateData => templateData.toString("utf8"))
            .then(template => {
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

                    templateParts.push(`
                        ${_options.libs.map(s => '<script src="' + s + '"></script>').join('\n')}
                        <script>
                            const mejorVueVersion = (/^(2|3)(?=\.)/.exec(Vue.version) || []).shift() || '2';
                            const createVue = 'createVue' + mejorVueVersion + 'Instance';
                            
                            // Vue v2.x
                            ${createVue2Instance}
                            // Vue v3.x
                            ${createVue3Instance}

                            window.onload = function () { 
                                const vueInit = {
                                    style: { text: '* {\\n\\t-webkit-print-color-adjust: exact;\\n\\tcolor-adjust: exact;\\n}' },
                                    el: '#app',
                                    mixins: window.mixins,
                                    data: () => (${JSON.stringify(Object.assign(param, data.$parameters))})
                                };
                                window.reactiveInstance = window[createVue](Vue, vueInit);
                            }
                        </script></body></html>
                    `);
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
    var regex = /((?:\{\{)\s*([\d\w$]+)\s*(?:\}\}))|(?:v-for=.+in\s)([\d\w$]+)|(?:\{\{)\s*[\d\w$\.]+\(([\d\w$]+),*[\w\s\d"'-]*\)(?:\}\})|(?:\{\{)([\d$\w]+)\.([\d$\w]+)(?:\}\})/mgi;
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
        `"\\(*([\\d\\w$]+),*.*\\)*\\sin\\s${matches[matches.length - 1]}`,
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

function createVue2Instance(Vue, { style, ...vueInit }) {
    // Allow style inside Vue root
    Vue.component('v-style', {
        render: function (createElement) {
            this.$slots.default.push(style);
            return createElement('style', this.$slots.default);
        }
    });

    console.log("Vue v2.x");
    return new Vue(vueInit);
}

function createVue3Instance(Vue, { style, ...vueInit }) {
    // Allow style inside Vue root
    customElements.define(
        'v-style',
        Vue.defineCustomElement({
            render() {
                console.log(this);
                return [
                    Vue.h('style', style.text),
                    Vue.h('style', this.$slots.default)
                ]
            }
        })
    );

    const app = Vue.createApp(vueInit);
    app.config.compilerOptions.isCustomElement = tag => tag.startsWith('v-');

    console.log("Vue v3.x");
    return app;
}

module.exports.initialize = function (options) {
    _options = {
        FILE_DIR: options.FILE_DIR,
        PDF_DIR: options.PDF_DIR,
        TEMPLATE_DIR: options.TEMPLATE_DIR,
        libs: (options.libs || [])
    };

    if (_options.libs && Array.isArray(_options.libs) && _options.libs.filter(s => /vue(\.min\.+?js?)*/.test(s)).length === 0) {
        _options.libs.unshift("https://cdn.jsdelivr.net/npm/vue@3");
    }
    
    return {
        prepareTemplate: function (data) {
            return fileHelper
                .ensureExitsDir([_options.FILE_DIR, _options.PDF_DIR])
                .then(() =>
                    readTemplateContent(data).then(processedData =>
                        saveOnTemp(
                            processedData.templateName,
                            processedData.template
                        ).then((fileName) => ({
                            ...fileName,
                            ...processedData
                        }))
                    )
                );
        },
        deleteFile: fileHelper.deleteFile,
        saveFile: fileHelper.saveFile,
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