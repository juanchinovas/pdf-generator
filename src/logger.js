const fs = require("fs");



module.exports.readLog = function({text, type}) {
    if (!fs.existsSync("./logs")) {
        fs.mkdirSync("./logs", 0744);
    }
    var currentDate = new Date();
    var fileName = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, "00")}-${currentDate.getDate().toString().padStart(2, "00")}.log`
    var stream = fs.createWriteStream(`./logs/${fileName}`, {flags: 'a'});
    stream.once('open', function(fd) {
        stream.write(`[${new Date()}]   ${type}   '${text}'\n`, function () {});
        stream.end();
        stream.close();
    });
}