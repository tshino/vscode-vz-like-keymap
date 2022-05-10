"use strict";
const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');
const vscode = require('vscode');

async function setupCoverage() {
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path.join(__dirname, '..', '..'),
        reporter: ['text', 'html'],
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

    const testsRoot = path.resolve(__dirname, '..');

    return await new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return e(err);
            }

            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

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
