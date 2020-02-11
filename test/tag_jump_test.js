"use strict";
const assert = require('assert');
const UriMock = require('./uri_mock.js');
const tag_jump = require('../src/tag_jump.js');

describe('tag_jump', function() {
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