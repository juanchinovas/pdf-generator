const fs = require("fs");
const logger = require("../logger");
const fileHelper = require("../file-helper");

jest.mock("fs", () => ({
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readFileSync: jest.fn(),
    mkdir: jest.fn(),
    existsSync: jest.fn(() => true),
    unlink: jest.fn(),
}));

describe("file-helper", () => {
    beforeEach(() => {
        logger.writeLog = jest.fn();
    });

    describe("readFile", () => {
        let err = null;
        beforeEach(() => {
            fs.readFile.mockImplementation((_, cb) => cb(err, "data"));
        });

        it("should return file content", async () => {
            await expect(fileHelper.readFile("/path")).resolves.toEqual("data");
        });

        it("fails read file if does not exist", async () => {
            err = "oops";

            await expect(fileHelper.readFile("/no-exist")).rejects.toEqual(err);
            expect(logger.writeLog).toHaveBeenCalledWith({ text: err, type: "ERROR" });
        });
    });

    describe("readFileAsync", () => {
        it("should return file content async", async () => {
            fs.readFileSync.mockImplementation(() => "data");

            expect(fileHelper.readFileAsync("/path")).toEqual("data");
        })
    });

    describe("saveFile", () => {
        let err = null;
        beforeEach(() => {
            fs.writeFile.mockImplementation((_, _1, cb) => cb(err));
        });

        it("should return file content", async () => {
            await expect(fileHelper.saveFile("/path", "data")).resolves.toBe(true);
        });

        it("fails read file if does not exist", async () => {
            err = "oops";

            await expect(fileHelper.saveFile("/no-exist", "data")).rejects.toEqual(err);
            expect(logger.writeLog).toHaveBeenCalledWith({ text: err, type: "ERROR" });
        });
    });

    describe("ensureExitsDir", () => {
        let err = null;
        beforeEach(() => {
            fs.mkdir.mockImplementation((_, _1, cb) => cb(err));
        });

        it("fails if the param is not an array", async () => {
            await expect(fileHelper.ensureExitsDir("/path")).rejects.toEqual("No array of dirs provided");
            expect(logger.writeLog).toHaveBeenCalledWith({
                text: "No array of dirs provided",
                type: "ERROR"
            });
        });

        it("creates one dir", async () => {
            await expect(fileHelper.ensureExitsDir(["/path"])).resolves.toEqual([true]);
        });

        it("creates 2 dirs", async () => {
            await expect(fileHelper.ensureExitsDir(["/path", "/path2"])).resolves.toEqual([true, true]);
        });

        it("fails when can not create the dir", async () => {
            err = "oops";

            await expect(fileHelper.ensureExitsDir(["/path"])).rejects.toEqual(err);
        });
    });

    describe("deleteFile", () => {
        let err = null;
        beforeEach(() => {
            fs.unlink.mockImplementation((_, cb) => cb(err));
        });

        it("deletes the file", () => {
            fs.existsSync.mockImplementationOnce(() => true);

            fileHelper.deleteFile("/path/file.log");

            expect(logger.writeLog).toHaveBeenCalledWith({ text: `Delete file /path/file.log`, type: "LOG" });
            expect(fs.unlink).toHaveBeenCalled();
        });

        it("should not delete the file if not exists", () => {
            fs.existsSync.mockImplementationOnce(() => false);

            fileHelper.deleteFile("/path/file2.log");

            expect(logger.writeLog).not.toHaveBeenCalledWith({ text: `Delete file /path/file.log2`, type: "LOG" });
        });

        it("should fail when delete the file", async () => {
            err = "oops";

            expect(() => fileHelper.deleteFile("/path/file2.log")).toThrow(err);
        });
    });
});