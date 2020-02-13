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
});