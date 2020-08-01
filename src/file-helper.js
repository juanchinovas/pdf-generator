const fs = require("fs");
const logger = require("./logger");

module.exports.readFile = function(fileDir) {
    return new Promise( (res, rej) => {
        fs.readFile(fileDir, (err, data) => {
            if (err) {
                rej(errorHandler(err));
                return;
            }
            res(data);
        } )
    });
};

module.exports.saveFile = function(fileDir, data) {
    return new Promise( (res, rej) => {
        fs.writeFile(fileDir, data, (err) => {
            if (err) {
                rej(errorHandler(err));
                return;
            }
            res(true);
        } )
    });
};

/**
 * Verify if the temp dir exists, if it does not create it.
 */
module.exports.ensureExitsDir = function(dirs) {
    return new Promise((res, rej) => {
        if (!Array.isArray(dirs)) {
            logger.writeLog({
                text: "No array of dirs provided",
                type: "ERROR"
            });
            rej("No array of dirs provided");
            return;
        }

        Promise.all(dirs.map(d => _promesifyMkdir(d)))
            .then(res)
            .catch(rej);
    });
};

module.exports.deleteFile = function(file) {
    let exists = fs.existsSync(file);
    if (exists) {
        logger.writeLog({ text: `Delete file ${file}`, type: "LOG" });
        fs.unlink(file, function(err) {
            if (err) {
                errorHandler(err);
            }
        });
    }
};


function _promesifyMkdir(path) {
    return new Promise( (res, rej) => {
        fs.mkdir(path, {recursive: true}, (err) => {
            if(err) {
                return rej(errorHandler(err));
            }
            res(true);
        });
    });
}

function errorHandler(err) {
    logger.writeLog({ text: err, type: "ERROR" });
    return err;
}