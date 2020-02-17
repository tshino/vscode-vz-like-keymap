"use strict";
const assert = require('assert');
const UriMock = require('./uri_mock.js');
const tag_jump = require('../src/tag_jump.js');

describe('tag_jump', function() {
    describe('getHomePath', function() {
        const restoreEnv = function(name, value) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        };
        const HOME = process.env.HOME;
        const HOMEDRIVE = process.env.HOMEDRIVE;
        const HOMEPATH = process.env.HOMEPATH;
        beforeEach(function() {
            delete process.env.HOME;
            delete process.env.HOMEDRIVE;
            delete process.env.HOMEPATH;
        });
        after(function() {
            restoreEnv('HOME', HOME);
            restoreEnv('HOMEDRIVE', HOMEDRIVE);
            restoreEnv('HOMEPATH', HOMEPATH);
        });
        it('should return empty string if no HOME/HOMEDRIVE/HOMEPATH env var present', function() {
            assert.equal(tag_jump.getHomePath(), '');
        });
        it('should return empty string if only HOMEDRIVE/HOMEPATH present', function() {
            process.env.HOMEDRIVE = 'c:';
            assert.equal(tag_jump.getHomePath(), '');
            delete process.env.HOMEDRIVE;
            process.env.HOMEPATH = '\\path\\to\\home';
            assert.equal(tag_jump.getHomePath(), '');
        });
        it('should return HOME env var if present', function() {
            process.env.HOME = '/path/to/home';
            assert.equal(tag_jump.getHomePath(), '/path/to/home');
        });
        it('should return HOMEDRIVE+HOMEPATH env var if both present', function() {
            process.env.HOMEDRIVE = 'c:';
            process.env.HOMEPATH = '\\path\\to\\home';
            assert.equal(tag_jump.getHomePath(), 'c:\\path\\to\\home');
        });
        it('should return HOME env var if present even if HOMEDRIVE and HOMEPATH present', function() {
            process.env.HOME = '/path/to/home';
            process.env.HOMEDRIVE = 'c:';
            process.env.HOMEPATH = '\\path\\to\\home';
            assert.equal(tag_jump.getHomePath(), '/path/to/home');
        });
    });
    describe('isUNCPath', function() {
        // Note: every backslash is replaced to slash before calling this function.
        it('should return true for UNC path, false otherwise', function() {
            const isUNCPath = tag_jump.isUNCPath;
            assert.equal(isUNCPath('//example.com/path/to/doc.txt'), true);
            assert.equal(isUNCPath('//hostname/path/to/doc.txt'), true);
            assert.equal(isUNCPath('//192.168.9.9/path/to/doc.txt'), true);
            assert.equal(isUNCPath('//example.com/some/where'), true);
            assert.equal(isUNCPath('//example.com/some'), true);
            assert.equal(isUNCPath('//example.com/'), true);
            assert.equal(isUNCPath('//example.com'), false);
            assert.equal(isUNCPath('/example.com/path/to/doc.txt'), false);
            assert.equal(isUNCPath('example.com/path/to/doc.txt'), false);
            assert.equal(isUNCPath('c:/path/to/doc.txt'), false);
            assert.equal(isUNCPath('/path/to/doc.txt'), false);
            assert.equal(isUNCPath('path/to/doc.txt'), false);
            assert.equal(isUNCPath('./doc.txt'), false);
            assert.equal(isUNCPath('../doc.txt'), false);
        });
    });
    describe('isAbsolutePath', function() {
        // Note: every backslash is replaced to slash before calling this function.
        it('should return true for absolute path, false otherwise', function() {
            const isAbsolutePath = tag_jump.isAbsolutePath;
            assert.equal(isAbsolutePath('//example.com/path/to/doc.txt'), true);
            assert.equal(isAbsolutePath('//example.com'), true);
            assert.equal(isAbsolutePath('/example.com/path/to/doc.txt'), true);
            assert.equal(isAbsolutePath('example.com/path/to/doc.txt'), false);
            assert.equal(isAbsolutePath('c:/path/to/doc.txt'), true);
            assert.equal(isAbsolutePath('/path/to/doc.txt'), true);
            assert.equal(isAbsolutePath('path/to/doc.txt'), false);
            assert.equal(isAbsolutePath('./doc.txt'), false);
            assert.equal(isAbsolutePath('../doc.txt'), false);
        });
    });
    describe('enumFolderUris', function() {
        it('should return array containing document base folder', function() {
            assert.deepStrictEqual(
                tag_jump.enumFolderUris(
                    UriMock('file', '', '/path/to/basedoc.txt', '', '')
                ),
                [
                    UriMock('file', '', '/path/to', '', '')
                ]
            );
        });
        it('should ignore Untitled document URI', function() {
            assert.deepStrictEqual(
                tag_jump.enumFolderUris(
                    UriMock('untitled', '', 'Untitled-1', '', '')
                ),
                []
            );
        });
        it('should remove query and fragment part of document URI', function() {
            assert.deepStrictEqual(
                tag_jump.enumFolderUris(
                    UriMock('http', 'example.com', '/path/to/some', 'query', 'fragment')
                ),
                [
                    UriMock('http', 'example.com', '/path/to', '', '')
                ]
            );
        });
        it('should return array containing additional folder URIs if provided', function() {
            assert.deepStrictEqual(
                tag_jump.enumFolderUris(
                    UriMock('file', '', '/path/to/basedoc.txt', '', ''),
                    [
                        UriMock('file', '', '/path', '', ''),
                        UriMock('file', '', '/path/to/some', '', '')
                    ]
                ),
                [
                    UriMock('file', '', '/path/to', '', ''),
                    UriMock('file', '', '/path', '', ''),
                    UriMock('file', '', '/path/to/some', '', '')
                ]
            );
        });
    });
    describe('extractFileNames', function() {
        const extractFileNames = tag_jump.extractFileNames;
        it('should return array of extracted strings', function() {
            assert.deepStrictEqual(extractFileNames(''), []);
            assert.deepStrictEqual(extractFileNames(' '), []);
            assert.deepStrictEqual(extractFileNames('< >'), []);
            assert.deepStrictEqual(extractFileNames('README.txt'), ['README.txt']);
            assert.deepStrictEqual(extractFileNames('hello.txt world.txt'), ['hello.txt', 'world.txt']);
            assert.deepStrictEqual(extractFileNames('abc def hijklmn.'), ['abc', 'def', 'hijklmn.']);
        });
        it('should split text with delimiters which unlikely are part of a filename', function() {
            assert.deepStrictEqual(extractFileNames('FOO.txt(100): BAR'), ['FOO.txt', '100', 'BAR']);
            assert.deepStrictEqual(extractFileNames('FOO.txt:44 xxxx'), ['FOO.txt', '44', 'xxxx']);
            assert.deepStrictEqual(extractFileNames('file_name.ext'), ['file_name.ext']);
            assert.deepStrictEqual(extractFileNames('FOO-BAR.txt'), ['FOO-BAR.txt']);
            assert.deepStrictEqual(extractFileNames('name@line:col'), ['name', 'line', 'col']);
            assert.deepStrictEqual(extractFileNames('===FOO.txt==='), ['FOO.txt']);
            assert.deepStrictEqual(extractFileNames('===FOO.txt(10)==='), ['FOO.txt', '10']);
            assert.deepStrictEqual(extractFileNames('path/to/FOO.txt:123'), ['path/to/FOO.txt', '123']);
            assert.deepStrictEqual(extractFileNames('#include <zoo/config.h>'), ['#include', 'zoo/config.h']);
            assert.deepStrictEqual(extractFileNames('#include "zoo/config.h"'), ['#include', 'zoo/config.h']);
            assert.deepStrictEqual(extractFileNames('[hello.txt]'), ['hello.txt']);
            assert.deepStrictEqual(extractFileNames('{hello.txt}'), ['hello.txt']);
            assert.deepStrictEqual(extractFileNames('abc:def(hij) klm'), ['abc', 'def', 'hij', 'klm']);
        });
        it('should keep path-like strings untouched', function() {
            assert.deepStrictEqual(extractFileNames('path/to/some/file.txt'), ['path/to/some/file.txt']);
            assert.deepStrictEqual(extractFileNames('/abs/path/to/file.txt'), ['/abs/path/to/file.txt']);
            assert.deepStrictEqual(extractFileNames('./file.txt'), ['./file.txt']);
            assert.deepStrictEqual(extractFileNames('../file.txt'), ['../file.txt']);
            assert.deepStrictEqual(extractFileNames('~/file.txt'), ['~/file.txt']);
            assert.deepStrictEqual(extractFileNames('C:\\path\\to\\file.txt'), ['C:\\path\\to\\file.txt']);
            assert.deepStrictEqual(extractFileNames('z:/path/to/file.txt'), ['z:/path/to/file.txt']);
            assert.deepStrictEqual(extractFileNames('\\\\unc\\path\\name.txt'), ['\\\\unc\\path\\name.txt']);
        });
    });
});