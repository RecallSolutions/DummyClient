"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DummyObject = require('./DummyObject').DummyObject;

/**
 * Create a new Dummy Type Object.
 * @template P
 * @param {P} propMap
 * @param endPoint
 * @param registry
 * @return {DummyType}
 * @constructor
 */

var DummyType = function () {
    function DummyType(propMap, endPoint) {
        _classCallCheck(this, DummyType);

        /**
         * A map of the types of each property.
         * @type {Map<string, {get:function(number, DummyObject):(number|Promise<DummyObject,*>)}>}
         */
        this.propMap = propMap;
        /**
         * The API endpoint for this type of object.
         * Must include a leading slash, no trailing slash.
         * @type {string}
         * @example
         * '/cars'
         */
        this.endPoint = endPoint;
        /**
         * A registry of all objects of this type.
         * @type {Map<number, DummyObject>}
         */
        this.registry = new Map();

        /**
         * The indexes being used to search objects of this type.
         * Stores a map of indexes, by the string identifier.
         *      Each of these identifiers corresponds to a new map, representing the actual index.
         *          This map relates numeric ids, to actual objects.
         * @type {Map<string, Map<*, Map<number, DummyObject>>>}
         */
        this.indexes = new Map();

        /**
         * The indexor functions for each index.
         * These functions must accept a DummyObject and an Index Map, and assign the object to the map.
         * These functions are indexed by index name.
         * @type {Map<string, function(DummyObject, Map<*, Map<number, DummyObject>>):void>}
         */
        this.indexors = new Map();

        /**
         * Actions are network operations this object is capable of performing, outside of usual crud.
         * Each action is a string beginning with a /, corresponding to a rest endpoint.
         * Posting to this endpoint will trigger an action.
         *
         * @example
         * '/optimize'
         *
         * This map holds names for the actions, linked to the action endpoints.
         * @type {Map<string, string>}
         */
        this.actions = new Map();
    }

    /**
     *
     * @param {*} val The value to be used to index.
     * @param {DummyObject} obj The object to be indexed.
     * @param {Map<*, Map<number, DummyObject>>} index
     */


    _createClass(DummyType, [{
        key: "createAction",
        value: function createAction(name, endpoint) {
            this.actions.set(name, endpoint);
        }

        /**
         * Create a new index, i.e. make it possible to search for objects of this type based on a property.
         * If the index will be created on a simple property, that is
         *      *) A primitive field
         *      *) A reference (just the numeric id)
         * The DO NOT use this method, use createBasicIndex(...).
         *
         * The indexor must do the following:
         *      0) Accept params index (the index) and obj (the object being indexed)
         *      1) Clear existing indices for the object using obj.type.clearIndices(obj), to prevent redundant indices.
         *      2) Find or create a sub index. That is, a map relating object ids to objects.
         *         This sub index is stored in the main index by a key, which is the value being indexed upon.
         *      3) This sub index must either be added to the main index, or updated with the new object.
         *      4) Push the new index to the object.
         *              Use the syntax obj.indexees.push([index, val, subIndex])
         *              Where index is the main index, and val is the key relating index to subindex.
         * @param {string} name The unique identifier for this index.
         * @param {function(DummyObject, Map<*, Map<number, DummyObject>>):void} indexor The function responsible for indexing.
         */

    }, {
        key: "createIndex",
        value: function createIndex(name, indexor) {
            this.indexes.set(name, new Map());
            this.indexors.set(name, indexor);
        }

        /**
         * Create an index where no additional validation is needed, simply uses property to index.
         * Should only be used for non reference properties.
         * @param name
         * @param property
         */

    }, {
        key: "createBasicIndex",
        value: function createBasicIndex(name) {
            var property = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : name;

            this.createIndex(name, function (obj, index) {
                DummyType.BasicIndexor(obj.getRaw(property), obj, index);
            });
        }

        /**
         * Clear any indeces of this object.
         *@type {DummyObject} obj
         */

    }, {
        key: "clearObjIndices",
        value: function clearObjIndices(obj) {
            obj.indexees.forEach(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 3),
                    index = _ref2[0],
                    val = _ref2[1],
                    subIndex = _ref2[2];

                subIndex.delete(obj.id);
                if (subIndex.size == 0) {
                    index.delete(val);
                }
            });
            obj.indexees = [];
        }

        /**
         * Run an object against the indeces.
         * @param {DummyObject} obj
         */

    }, {
        key: "index",
        value: function index(obj) {
            var _this = this;

            /*
            First, we should clear any indexes the object already has.
             */
            this.clearObjIndices(obj);
            /*
            Now go through our indexes, adding items.
            Indexing only makes sense if this object has loaded and has data.
            If it has not, then load it. The load method automatically indexes.
             */
            if (obj.hasLoaded) {
                this.indexors.forEach(function (indexor, name) {
                    indexor(obj, _this.indexes.get(name));
                });
            } else {
                obj.load();
            }
        }

        /**
         * Searches the specified index for
         * @param name
         * @param val
         * @return {Promise<DummyObject[]>}
         */

    }, {
        key: "searchIndexBasic",
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(name, val) {
                var index;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.indexes.has(name)) {
                                    _context.next = 9;
                                    break;
                                }

                                index = this.indexes.get(name);
                                //If the index does not have the requested value, return empty.

                                if (!index.has(val.valueOf())) {
                                    _context.next = 6;
                                    break;
                                }

                                return _context.abrupt("return", [].concat(_toConsumableArray(index.get(val.valueOf()))).map(function (_ref4) {
                                    var _ref5 = _slicedToArray(_ref4, 2),
                                        id = _ref5[0],
                                        o = _ref5[1];

                                    return o;
                                }));

                            case 6:
                                return _context.abrupt("return", []);

                            case 7:
                                _context.next = 10;
                                break;

                            case 9:
                                throw name + " has not been indexed.";

                            case 10:
                            case "end":
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function searchIndexBasic(_x2, _x3) {
                return _ref3.apply(this, arguments);
            }

            return searchIndexBasic;
        }()

        /**
         * Search the given index with a custom condition.
         * If the subIndex should be returned, conditioned should evaluate true.
         * @param {string} name
         * @param {function(*):bool} condition
         * @return {Promise<DummyObject[]>}
         */

    }, {
        key: "searchIndex",
        value: function () {
            var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(name, condition) {
                var index, matched;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.indexes.has(name)) {
                                    _context2.next = 7;
                                    break;
                                }

                                index = this.indexes.get(name);
                                //objects matching the condition

                                matched = [];
                                /**here, since there is a condition,
                                 we must iterate through all values to check for matches.
                                 */

                                [].concat(_toConsumableArray(index.keys())).forEach(function (val) {
                                    if (condition(val.valueOf())) {
                                        matched.push.apply(matched, _toConsumableArray([].concat(_toConsumableArray(index.get(val.valueOf()))).map(function (_ref7) {
                                            var _ref8 = _slicedToArray(_ref7, 2),
                                                id = _ref8[0],
                                                o = _ref8[1];

                                            return o;
                                        })));
                                    }
                                });
                                return _context2.abrupt("return", matched);

                            case 7:
                                throw name + " has not been indexed.";

                            case 8:
                            case "end":
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function searchIndex(_x4, _x5) {
                return _ref6.apply(this, arguments);
            }

            return searchIndex;
        }()

        /**
         * Search index for values within a range.
         * @param {string} name
         * @param {*} low
         * @param {*} high
         * @return {Promise<DummyObject[]>}
         */

    }, {
        key: "searchIndexRange",
        value: function () {
            var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(name, low, high) {
                var _this2 = this;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                return _context3.abrupt("return", new Promise(function (resolve, reject) {
                                    return _this2.searchIndex(name, function (val) {
                                        return low.valueOf() <= val.valueOf() && high.valueOf() >= val.valueOf();
                                    }).then(function (s) {
                                        resolve(s);
                                    }).catch(reject);
                                }));

                            case 1:
                            case "end":
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function searchIndexRange(_x6, _x7, _x8) {
                return _ref9.apply(this, arguments);
            }

            return searchIndexRange;
        }()

        /**
         * Create and return a new object of this type.
         * @param {number|undefined} id
         * The id of the object, used if exists on remote. Left blank if new.
         * @param {DummyObject} parent
         * @param {{}} data
         * The parent object to this. This is automatically set if an object creates a child from its reference.
         * @returns {DummyObject}
         */

    }, {
        key: "createObject",
        value: function createObject() {
            var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
            var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
            var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            var objectParams = { type: this, parent: parent };
            if (id) {
                objectParams.id = id;
            } else {
                objectParams.local = true;
                objectParams.id = -this.registry.size;
            }
            var obj = new DummyObject(objectParams);
            this.registry.set(objectParams.id, obj);
            obj.set(data);
            return obj;
        }
    }, {
        key: "has",


        /**
         * Returns whether this type has a given object.
         * @param id
         * @return {boolean}
         */
        value: function has(id) {
            return this.registry.has(id);
        }
    }, {
        key: "get",


        /**
         * Get an object of this type by id. Returns a promise, since it may require a server load.
         * @param {number} id
         * @param {DummyObject} parent Optional, the parent object calling get on its property.
         * @return {Promise<DummyObject, *>}
         */
        value: function get(id, parent) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                if (_this3.registry.has(id)) {
                    if (parent) {
                        _this3.registry.get(id).setParent(parent);
                    }
                    resolve(_this3.registry.get(id));
                } else {
                    var obj = _this3.createObject(id, parent);
                    obj.load().then(function () {
                        resolve(obj);
                    }).catch(function (err) {
                        reject(err);
                    });
                }
            });
        }

        /**
         * Set a prop map
         */

    }, {
        key: "setPropMap",
        value: function setPropMap(propMap) {
            this.propMap = propMap;
        }
    }], [{
        key: "BasicIndexor",
        value: function BasicIndexor(val, obj, index) {
            /**
             * Get the map of objects corresponding to the given value in index.
             * @type {Map<number, DummyObject>>}
             */
            obj.type.clearObjIndices(obj);

            var sub_index = void 0;
            if (index.has(val.valueOf())) {
                sub_index = index.get(val.valueOf());
            } else {
                sub_index = new Map();
                index.set(val.valueOf(), sub_index);
            }
            sub_index.set(obj.id.valueOf(), obj);
            obj.indexees.push([index, val.valueOf(), sub_index]);
        }
    }]);

    return DummyType;
}();

exports.DummyType = DummyType;
//# sourceMappingURL=DummyType.js.map