"use strict";
const assert = require('assert');

const UriMock = (function() {
    var proto = {};
    const resolvePath = function(path) {
        return (path === '' || path[0] !== '/') ? '/' + path : path;
    };
    const validate = function(uri) {
        if (!uri.authority && /^\/\//.test(uri.path)) {
            throw new Error('invalid URI');
        }
        return uri;
    };
    proto.with = function(change) {
        return validate({
            scheme : change.scheme !== undefined ? change.scheme : this.scheme,
            authority : change.authority !== undefined ? change.authority : this.authority,
            path : change.path !== undefined ? resolvePath(change.path) : this.path,
            query :  change.query !== undefined ? change.query : this.query,
            fragment : change.fragment !== undefined ? change.fragment : this.fragment,
            __proto__ : proto
        });
    };
    return function(s, a, p, q, f) {
        return validate({
            scheme : s,
            authority : a,
            path : resolvePath(p || ''),
            query : q,
            fragment : f,
            __proto__ : proto
        });
    };
})();
module.exports = UriMock;

describe('UriMock', function() {
    it('should have properties scheme, authority, path, query, fragment', function() {
        let uri = UriMock();
        assert('scheme' in uri);
        assert('authority' in uri);
        assert('path' in uri);
        assert('query' in uri);
        assert('fragment' in uri);
    });
    it('should be able to be constructed with property values', function() {
        let uri = UriMock('s', 'a', 'p', 'q', 'f');
        assert.equal(uri.scheme, 's');
        assert.equal(uri.authority, 'a');
        assert.equal(uri.path, '/p');
        assert.equal(uri.query, 'q');
        assert.equal(uri.fragment, 'f');
    });
    it('should maintain path property to be absolute', function() {
        assert.equal(UriMock('s', 'a', '/p', 'q', 'f').path, '/p');
        assert.equal(UriMock('s', 'a', 'p', 'q', 'f').path, '/p');
        assert.equal(UriMock('', '', '', '', '').path, '/');
        assert.equal(UriMock().path, '/');
        assert.equal(UriMock().with({ path: 'p' }).path, '/p');
    });
    it('should throw exception when making invalid URI', function() {
        assert.throws(() => UriMock('s', '', '//path', '', ''));
        assert.throws(() => UriMock('s', '', '///path', '', ''));
        assert.throws(() => UriMock().with({ path: '//path' }));
    });
    it('should be deep-equality comparable', function() {
        let uri1 = UriMock('s', 'a', 'p', 'q', 'f');
        let uri2 = UriMock('s', 'a', 'p', 'q', 'f');
        let uri3 = UriMock();
        assert.equal(uri1, uri1);
        assert.notEqual(uri1, uri2);
        assert.notEqual(uri1, uri3);
        assert.deepStrictEqual(uri1, uri1);
        assert.deepStrictEqual(uri1, uri2);
        assert.notDeepStrictEqual(uri1, uri3);
    });
    describe('with', function() {
        it('should return clone', function() {
            let uri1 = UriMock('s', 'a', 'p', 'q', 'f');
            let uri2 = uri1.with({});
            assert.notEqual(uri2, uri1);
            assert.deepStrictEqual(uri2, uri1);
        });
        it('should replace specified property', function() {
            let uri0 = UriMock('s', 'a', 'p', 'q', 'f');
            let uri1 = uri0.with({ scheme : 's2' });
            assert.deepStrictEqual(uri1, UriMock('s2', 'a', 'p', 'q', 'f'));
            let uri2 = uri0.with({ authority : 'a2' });
            assert.deepStrictEqual(uri2, UriMock('s', 'a2', 'p', 'q', 'f'));
            let uri3 = uri0.with({ path : 'p2' });
            assert.deepStrictEqual(uri3, UriMock('s', 'a', 'p2', 'q', 'f'));
            let uri4 = uri0.with({ query : 'q2' });
            assert.deepStrictEqual(uri4, UriMock('s', 'a', 'p', 'q2', 'f'));
            let uri5 = uri0.with({ fragment : 'f2' });
            assert.deepStrictEqual(uri5, UriMock('s', 'a', 'p', 'q', 'f2'));
        });
        it('should clear specified property if its value is empty', function() {
            let uri0 = UriMock('s', 'a', 'p', 'q', 'f');
            let uri1 = uri0.with({ scheme : '' });
            assert.deepStrictEqual(uri1, UriMock('', 'a', 'p', 'q', 'f'));
            let uri2 = uri0.with({ authority : '' });
            assert.deepStrictEqual(uri2, UriMock('s', '', 'p', 'q', 'f'));
            let uri3 = uri0.with({ path : '' });
            assert.deepStrictEqual(uri3, UriMock('s', 'a', '', 'q', 'f'));
            let uri4 = uri0.with({ query : '' });
            assert.deepStrictEqual(uri4, UriMock('s', 'a', 'p', '', 'f'));
            let uri5 = uri0.with({ fragment : '' });
            assert.deepStrictEqual(uri5, UriMock('s', 'a', 'p', 'q', ''));
        });
        it('should update multiple properties if specified', function() {
            let uri0 = UriMock('s', 'a', 'p', 'q', 'f');
            let uri1 = uri0.with({ scheme : 's2', path : 'p2', query : '' });
            assert.deepStrictEqual(uri1, UriMock('s2', 'a', 'p2', '', 'f'));
        });
    });
});
