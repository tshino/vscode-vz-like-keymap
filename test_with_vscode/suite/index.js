"use strict";
const path = require('path');
const Mocha = require('mocha');
const fs = require('fs');
const vscode = require('vscode');

async function setupCoverage() {
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path.join(__dirname, '..', '..'),
        reporter: ['text', 'html'],
        all: true,
        cache: false,
        silent: false,
        instrument: true,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
        include: [
            'src/*.js',
        ],
        exclude: [
            'test_with_vscode/**',
            '.vscode-test/**'
        ],
    });

    nyc.reset();
    nyc.wrap();

    return nyc;
}

async function run() {
    const nyc = await setupCoverage();

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    });
    mocha.timeout(5000);

    const testsRoot = path.resolve(__dirname, '.');

    return await new Promise((c, e) => {
        fs.readdir(testsRoot, (err, files) => {
            if (err) {
                e(err);
                return;
            }

            // Add files to the test suite
            for (const f of files) {
                if (f.endsWith('.test.js')) {
                    mocha.addFile(path.resolve(testsRoot, f));
                }
            }

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    }).finally(async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    });
}

module.exports = {
    run
};
