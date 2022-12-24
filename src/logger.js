const fs = require("fs");



module.exports.writeLog = function({text, type}) {
    if (!fs.existsSync("./logs")) {
        fs.mkdirSync("./logs", parseInt("0744", 8));
    }
    const currentDate = new Date();
    const fileName = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, "00")}-${currentDate.getDate().toString().padStart(2, "00")}.log`
    const fd = fs.openSync(`./logs/${fileName}`, 'a');
    fs.writeSync(fd, `[${currentDate}]   ${type}   '${text}'\n`);
    fs.closeSync(fd);
}
