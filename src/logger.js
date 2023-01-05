class Logger {
	#fs;
	#currentDate;

	constructor(fs) {
		this.#fs = fs;
		this.#currentDate = new Date();
	}

	writeLog({text, type}) {
		if (!this.#fs.existsSync("./logs")) {
			this.#fs.mkdirSync("./logs", parseInt("0744", 8));
		}
		const fileName = `${this.#currentDate.getFullYear()}-${(this.#currentDate.getMonth()+1).toString().padStart(2, "00")}-${this.#currentDate.getDate().toString().padStart(2, "00")}`;
		const fd = this.#fs.openSync(`./logs/${fileName}.log`, "a");
		this.#fs.writeSync(fd, `[${this.#currentDate}]   ${type}   '${text}'\n`);
		this.#fs.closeSync(fd);
	}
}

module.exports = Logger;