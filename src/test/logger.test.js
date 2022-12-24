const fs = require("fs");
const logger = require("../logger");

jest.mock("fs", () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    openSync: jest.fn(),
    writeSync: jest.fn(),
    closeSync: jest.fn()
}));

describe("Logger", () => {
    describe("writeLog", () => {
        beforeEach(() => {
            fs.existsSync.mockReturnValue(true);
            fs.mkdirSync.mockReturnValue();
            fs.openSync.mockReturnValue();
            fs.writeSync.mockReturnValue();
            fs.closeSync.mockReturnValue();
        });

        it("verifies if logs folder exists", () => {
            logger.writeLog({ text: "test", type: "test" });
            expect(fs.existsSync).toHaveBeenCalledWith("./logs");
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        it("creates logs folder if not exists", () => {
            fs.existsSync.mockReturnValue(false);

            logger.writeLog({ text: "test", type: "test" });

            expect(fs.existsSync).toHaveBeenCalledWith("./logs");
            expect(fs.mkdirSync).toHaveBeenCalledWith("./logs", parseInt("0744", 8));
        });

        it("should open the current date log file", () => {
            const currentDate = new Date();
            const fileName = `${currentDate.getFullYear()}-${(currentDate.getMonth()+1).toString().padStart(2, "00")}-${currentDate.getDate().toString().padStart(2, "00")}.log`;

            logger.writeLog({ text: "test", type: "test" });

            expect(fs.openSync).toHaveBeenCalledWith(`./logs/${fileName}`, 'a');
        });

        it("should add a new line to the log file", () => {
            logger.writeLog({ text: "test", type: "test" });
            expect(fs.writeSync).toHaveBeenCalled();
        });
    });
});