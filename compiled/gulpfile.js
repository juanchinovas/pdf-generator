const gulp = require("gulp");
const terser = require("gulp-terser");
const shell = require("gulp-shell");
const clean = require("gulp-clean");
const bump = require("gulp-bump");
const fs = require("fs");
const os = require('os');

const destDir = "../compiled/npm";
let copyCommand = os.platform() === "win32"? `for %i in ("..\\README.md" "..\\src\\index.d.ts" "..\\src\\package.json") do copy /Y %i "${destDir}"`: 
                                            `cp ../README.md ../src/index.d.ts ../src/package.json ${destDir}`;


gulp.task("clean-dest", function () {
    if (!fs.existsSync("./npm")) return Promise.resolve();

    return gulp.src("./npm")
        .pipe(clean())
});

gulp.task("copy-files", shell.task(copyCommand));
gulp.task("npm-install", shell.task(`cd ${destDir} && npm i --production`));
gulp.task("npm-pack", shell.task(`cd ${destDir} && npm pack`));
gulp.task("npm-publish", shell.task(`cd ${destDir} && npm publish`));
// install plugin
gulp.task("npm-un-plugin", shell.task(`cd ../demo && npm un html-pdf-generator`));
gulp.task("npm-in-plugin", shell.task(`cd ../demo && npm i file:../compiled/npm`));

gulp.task("compile", function () {
    return gulp.src(["../src/*.js", "!../src/node_modules/**"])
        .pipe(terser())
        .pipe(gulp.dest(destDir));
});

gulp.task('bump-version', function () {
    return gulp.src(`${destDir}/package.json`)
        .pipe(bump({
            type: 'path'
        }))
        .pipe(gulp.dest(destDir));
});

gulp.task('clean-scripts', function () {
    return new Promise( (res, rej) => {
        fs.readFile(`${destDir}/package.json`, "utf-8", function(err, fileContent) {
            if(err) {
                rej(err);
                return;
            }

            const obj = JSON.parse(fileContent);
            delete obj.scripts;
    
            fs.writeFile(`${destDir}/package.json`, JSON.stringify(obj, undefined, 4), function(err) {
                if(err) {
                    rej(err);
                    return;
                }
                res();
            });
        });
    });
});

gulp.task('default', gulp.series('clean-dest', 'compile', 'copy-files', 'npm-install', 'npm-un-plugin', 'npm-in-plugin'));

gulp.task('npm-pack', gulp.series('clean-dest', 'compile', 'copy-files', 'clean-scripts', 'bump-version', 'npm-pack'));

gulp.task('npm-publish', gulp.series('clean-dest', 'compile', 'copy-files', 'clean-scripts', 'bump-version', 'npm-publish', 'clean-dest'));