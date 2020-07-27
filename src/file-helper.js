const fse = require("fs-extra");
const logger = require("./logger");

module.exports.readFile = function(fileDir) {
    return fse.readFile(fileDir).catch(err => {
        logger.readLog({ text: err, type: "ERROR" });
        return err;
    });
};

module.exports.saveFile = function(fileDir, data) {
    return fse.writeFile(fileDir, data).catch(err => {
        logger.readLog({ text: err, type: "ERROR" });
        return err;
    });
};

/**
 * Verify if the temp dir exists, if it does not create it.
 */
module.exports.ensureExitsDir = function(dirs) {
    return new Promise((res, rej) => {
        if (!Array.isArray(dirs)) {
            logger.readLog({
                text: "No array of dirs provided",
                type: "ERROR"
            });
            rej("No array of dirs provided");
            return;
        }

        Promise.all(dirs.map(d => fse.ensureDir(d)))
            .then(res)
            .catch(rej);
    });
};

module.exports.deleteFile = function(file) {
    let exists = fse.existsSync(file);
    if (exists) {
        logger.readLog({ text: `Delete file ${file}`, type: "LOG" });
        fse.unlink(file, function(err) {
            if (err) {
                logger.readLog({ text: err, type: "ERROR" });
            }
        });
    }
};
