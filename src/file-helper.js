class FileHelper {
	#logger;
	#fs;

	constructor(logger, fs) {
		this.#logger = logger;
		this.#fs = fs;
	}


	readFile(fileDir) {
		return new Promise((res, rej) => {
			this.#fs.readFile(fileDir, (err, data) => {
				if (err) {
					return rej(this.#errorHandler(err));
				}
				res(data);
			});
		});
	}

	readFileAsync(fileDir) {
		return this.#fs.readFileSync(fileDir, { encoding: "utf8" });
	}

	saveFile(fileDir, data) {
		return new Promise((res, rej) => {
			this.#fs.writeFile(fileDir, data, (err) => {
				if (err) {
					return rej(this.#errorHandler(err));
				}
				res(true);
			});
		});
	}

	/**
	 * Verify if the temp dir exists, if it does not create it.
	 */
	ensureExitsDir(dirs) {
		return new Promise((res, rej) => {
			if (!Array.isArray(dirs)) {
				this.#logger.writeLog({
					text: "No array of dirs provided",
					type: "ERROR"
				});
				return rej("No array of dirs provided");
			}

			Promise.all(dirs.map(d => this.#promesifyMkdir(d)))
				.then(res)
				.catch(rej);
		});
	}

	deleteFile(file) {
		const exists = this.#fs.existsSync(file);
		if (exists) {
			this.#logger.writeLog({ text: `Delete file ${file}`, type: "LOG" });
			this.#fs.unlink(file, (err) =>  {
				if (err) {
					const Err = this.#errorHandler(err);
					throw Err;
				}
			});
		}
	}


	#promesifyMkdir(path) {
		return new Promise((res, rej) => {
			this.#fs.mkdir(path, { recursive: true }, (err) => {
				if (err) {
					return rej(this.#errorHandler(err));
				}
				res(true);
			});
		});
	}

	#errorHandler(err) {
		this.#logger.writeLog({ text: err, type: "ERROR" });
		return err;
	}
}

module.exports = FileHelper;