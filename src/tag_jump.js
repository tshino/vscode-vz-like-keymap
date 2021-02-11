"use strict";

const getHomePath = function() {
    if ('HOME' in process.env) {
        return process.env['HOME'];
    }
    if ('HOMEDRIVE' in process.env && 'HOMEPATH' in process.env) {
        return process.env['HOMEDRIVE'] + process.env['HOMEPATH'];
    }
    return '';
};

const expandTildePrefix = function(path) {
    if (path.match(/^\~[\\\/]/)) {
        let home = getHomePath();
        if (home !== '') {
            path = home + '/' + path.substring(2);
        }
    }
    return path;
};

const isUNCPath = function(path) {
    return path.match(/^\/\/[^\/]+\//) ? true : false;
};

const isAbsolutePath = function(path) {
    return path.match(/^(?:\/|[a-zA-Z]:\/)/) ? true : false;
};

const enumFolderUris = function(documentUri, folderUris) {
    let uris = [];
    if (documentUri.scheme !== 'untitled') {
        let parentPath = documentUri.path.replace(/[/\\][^/\\]+$/, '');
        uris.push(documentUri.with({
            path: parentPath,
            query: '',
            fragment: ''
        }));
    }
    if (folderUris) {
        uris = uris.concat(folderUris);
    }
    return uris;
};

const extractFileNames = function(text) {
    let names = text.split(/(?:[\s;,"'<>(){}|[\]@=+*]|:(?![/\\]))+/);
    names = names.map(name => name.trim());
    names = names.filter(name => name !== '');
    names = names.map(function(name) {
        if (name.match(/^.+\\\\/)) {
            name = name.replace(/\\\\/g, '\\');
        }
        return name;
    });
    return names;
};

const makeFileUri = function(folderUri, path) {
    try {
        path = expandTildePrefix(path);
        path = path.replace(/\\/g, '/');
        path = path.replace(/^\.\/|\/$/g, '');
        if (path === '') {
            return null;
        }
        if (isUNCPath(path)) {
            return folderUri.with({
                scheme: 'file',
                authority: path.replace(/^\/\/|(?<=[^\/])\/.+/g, ''),
                path: path.replace(/^\/\/[^\/]+/, ''),
                query: '',
                fragment: ''
            });
        }
        if (isAbsolutePath(path)) {
            return folderUri.with({
                scheme: 'file',
                authority: '',
                path: path,
                query: '',
                fragment: ''
            });
        }
        return folderUri.with({
            path: folderUri.path + '/' + path
        });
    } catch (_e) {
        return null;
    }
};

exports.getHomePath = getHomePath;
exports.expandTildePrefix = expandTildePrefix;
exports.isUNCPath = isUNCPath;
exports.isAbsolutePath = isAbsolutePath;
exports.enumFolderUris = enumFolderUris;
exports.extractFileNames = extractFileNames;
exports.makeFileUri = makeFileUri;
