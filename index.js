/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

var isArray = Array.isArray;
var isObject = function (obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    var proto = obj;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(obj) === proto;
};
var merge = function (target, source) {
    if (isArray(source) && isArray(target)) {
        source.forEach(function (value, index) {
            target[index] = value;
        });
    }
    else if (isObject(source) && isObject(target)) {
        Object.assign(target, source);
    }
    return target;
};
var noop = function () { };
var createDeferred = function () {
    var resolve = noop;
    var reject = noop;
    var promise = new Promise(function (a, b) {
        resolve = a;
        reject = b;
    });
    return { resolve: resolve, reject: reject, promise: promise };
};

var IMMUTABLE = Symbol('IMMUTABLE');
var PARENTS = Symbol('PARENTS');
var internalKeys = [IMMUTABLE, PARENTS];
var isCostate = function (input) { return !!(input && input[IMMUTABLE]); };
var read = function (input) {
    if (!isCostate(input))
        return input;
    return input[IMMUTABLE]();
};
var co = function (state) {
    var _a;
    if (!isObject(state) && !isArray(state)) {
        throw new Error("Expect state to be array or object, instead of " + state);
    }
    if (isCostate(state))
        return state;
    var deferred = createDeferred();
    var target = (isArray(state) ? [] : {});
    var immutableTarget = (isArray(state) ? [] : {});
    var parents = new Map();
    var copy = function () {
        if (isArray(immutableTarget)) {
            immutableTarget = __spread(immutableTarget);
        }
        else {
            immutableTarget = __assign({}, immutableTarget);
        }
    };
    var notifyParents = function () {
        var e_1, _a;
        try {
            for (var parents_1 = __values(parents), parents_1_1 = parents_1.next(); !parents_1_1.done; parents_1_1 = parents_1.next()) {
                var _b = __read(parents_1_1.value, 2), parent_1 = _b[0], key = _b[1];
                parent_1[key] = proxy;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (parents_1_1 && !parents_1_1.done && (_a = parents_1.return)) _a.call(parents_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    var timer = null;
    var notify = function (key) {
        if (typeof key === 'symbol') {
            if (internalKeys.indexOf(key) !== -1)
                return;
        }
        notifyParents();
        if (timer != null)
            clearTimeout(timer);
        timer = setTimeout(doNotify, 0);
    };
    var doNotify = function () {
        deferred.resolve(immutableTarget);
        deferred = createDeferred();
    };
    var handlers = {
        set: function (target, key, value) {
            if (isObject(value) || isArray(value)) {
                value = co(value);
            }
            if (isCostate(value)) {
                value[PARENTS].set(proxy, key);
            }
            // copy before assigning
            copy();
            immutableTarget[key] = read(value);
            target[key] = value;
            notify(key);
            return true;
        },
        deleteProperty: function (target, key) {
            var value = target[key];
            if (isCostate(value)) {
                value[PARENTS].delete(proxy);
            }
            // copy before deleting
            copy();
            delete immutableTarget[key];
            delete target[key];
            notify(key);
            return true;
        }
    };
    var proxy = new Proxy(target, handlers);
    Object.defineProperties(proxy, (_a = {},
        _a[IMMUTABLE] = {
            value: function () { return immutableTarget; }
        },
        _a[PARENTS] = {
            value: parents
        },
        _a[Symbol.asyncIterator] = {
            value: function () {
                return __asyncGenerator(this, arguments, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                return [4 /*yield*/, __await(deferred.promise)];
                            case 1: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                            case 2: return [4 /*yield*/, _a.sent()];
                            case 3:
                                _a.sent();
                                return [3 /*break*/, 0];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
        },
        _a));
    merge(proxy, state);
    return proxy;
};

export default co;
export { read };
//# sourceMappingURL=index.js.map
,
            _a[IMMUTABLE] = {
                value: function () { return immutableTarget; }
            },
            _a[PARENTS] = {
                value: parents
            },
            _a[Symbol.asyncIterator] = {
                value: function () {
                    return __asyncGenerator(this, arguments, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    return [4 /*yield*/, __await(deferred.promise)];
                                case 1: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                                case 2: return [4 /*yield*/, _a.sent()];
                                case 3:
                                    _a.sent();
                                    return [3 /*break*/, 0];
                                case 4: return [2 /*return*/];
                            }
                        });
                    });
                }
            },
            _a));
        merge(proxy, state);
        return proxy;
    };

    exports.read = read;
    exports.default = co;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
