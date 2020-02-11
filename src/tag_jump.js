"use strict";

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
        for (var i = 0; i < folderUris.length; i++) {
            uris.push(folderUris[i]);
        }
    }
    return uris;
};

exports.enumFolderUris = enumFolderUris;
