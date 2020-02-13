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

const isUNCPath = function(path) {
    return path.match(/^\/\/[^\/]+\//);
};

const isAbsolutePath = function(path) {
    return path.match(/^(?:\/|[a-zA-Z]:\/)/);
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

exports.getHomePath = getHomePath;
exports.isUNCPath = isUNCPath;
exports.isAbsolutePath = isAbsolutePath;
exports.enumFolderUris = enumFolderUris;
