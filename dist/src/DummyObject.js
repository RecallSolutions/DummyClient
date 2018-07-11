"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var index = require('./index');

/**
 * Create a new dummy object.
 * @param id
 * @param type
 * @param parent
 * @param local
 * @return {DummyObject}
 * @constructor
 */

var DummyObject = function () {
    function DummyObject(_ref) {
        var _ref$id = _ref.id,
            id = _ref$id === undefined ? undefined : _ref$id,
            _ref$version = _ref.version,
            version = _ref$version === undefined ? 0 : _ref$version,
            type = _ref.type,
            _ref$parent = _ref.parent,
            parent = _ref$parent === undefined ? undefined : _ref$parent,
            _ref$local = _ref.local,
            local = _ref$local === undefined ? false : _ref$local;

        _classCallCheck(this, DummyObject);

        this.id = id;
        this.version = version;
        /** @type {DummyType} */
        this.type = type;
        if (parent) {
            /** @type {DummyObject | undefined} **/
            this.setParent(parent);
        }
        /** @type {boolean}*/
        this.local = local;

        /**Whether this has loaded (even once)
         * @type {boolean}*/
        this.hasLoaded = false;

        //The properties for this object, limited to those in the typemap.
        this.saved = {};
        this.updated = {};

        /**
         * Subscriptions to this object. They will fire on every update, load, or set
         * Subscribing objects must provide functions, accepting this object as a parameter.
         * The object subscribing is used as a key.
         * @type {Map<Object, function(DummyObject)>}
         */
        this.subscriptions = new Map();

        /**
         * An array of all maps currently holding indexes to this object.
         * This is not normal form, but if this item is modified (by id) or deleted, it makes it easier to
         * update indices.
         * @type {[Map<*, Map<number, DummyObject>>, *, Map<number, DummyObject>][]}
         */
        this.indexees = [];
    }

    /**
     * Returns the fully qualified network path for this object.
     * If this has a parent, it will concatenate onto the parent's path.
     * @return {string}
     */


    _createClass(DummyObject, [{
        key: "getPath",
        value: function getPath() {
            var path = "";

            //If necessary, append this path onto that of the parent,
            //otherwise, assume this is root.
            if (this.parent) {
                path = this.parent.getPath();
            } else {
                path = index.getProxy();
            }
            path += this.type.endPoint;
            //Only add on a unique id if this is not a "local only" item,
            //that is, the server knows about it.
            if (!this.local) {
                path += "/" + this.id;
            }
            return path;
        }
    }, {
        key: "set",


        /**
         * Override updated, setting saved data to the parameter object.
         * @param {object} obj
         * @return {DummyObject}
         */
        value: function set(obj) {
            var _this = this;

            Object.keys(this.type.propMap).forEach(function (prop, func) {
                if (obj[prop] != undefined) {
                    _this.saved[prop] = obj[prop];
                    // /*
                    // If we are setting to a reference type, then
                    // we must be able to respond to changes in the reference.
                    // For example, if we reference an object that gets deleted,
                    // we must reload this object.
                    //
                    // Also, this adds the item to its cache.
                    //  */
                    // if (this.type.propMap[prop].reference) {
                    //     this.get(prop)
                    //         .then(object => {
                    //             object.type.index(object);
                    //             if (this.type.propMap[prop].subscribed) {
                    //                 object.subscribe(this, (updated) => {
                    //                     this.load();
                    //                 });
                    //             }
                    //         })
                    // } else if (this.type.propMap[prop].referenceArray) {
                    //     this.get(prop)
                    //         .then(objectArray => {
                    //             objectArray.forEach(o => {
                    //                 o.type.index(o);
                    //                 if (this.type.propMap[prop].subscribed) {
                    //                     o.subscribe(this, (updated) => {
                    //                         this.load();//Trigger an update
                    //                     });
                    //                 }
                    //             })
                    //         })
                    // }
                }
            });
            this.updated = {};
            this.type.index(this);
            this.notify();
            return this;
        }
    }, {
        key: "resolve",


        /**
         * Resolve the updates with the saved data, updates overwrite saved in the returned read only copy.
         * @return {{}}
         */
        value: function resolve() {
            return _extends({}, this.saved, this.updated);
        }
    }, {
        key: "get",


        /**
         * Get a property.
         * @param prop
         * @return {Promise<DummyObject, *> | *}
         */
        value: function get(prop) {
            var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this;

            return this.type.propMap[prop].get(this.resolve()[prop], parent);
        }
    }, {
        key: "getRaw",


        /**
         * Not recommended. Returns the direct value with no processing,
         * use only if sure it is okay.
         * @param prop
         * @return {*}
         */
        value: function getRaw(prop) {
            return this.resolve()[prop];
        }

        /**
         *
         * @param obj The updated properties.
         * @return {DummyObject}
         */

    }, {
        key: "update",
        value: function update(obj) {
            this.updated = _extends({}, this.updated, obj);
            this.notify();
            return this;
        }
    }, {
        key: "save",


        /**
         * Save the current state of this object to the server.
         * @return {Promise}
         */
        value: function save() {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                //Post or put this object based on the resolved version.
                index.getClient().post(_this2.getPath(), _this2.resolve(), function (err, res, body) {
                    //Only successful if there wasn't an error.
                    if (!err) {
                        //The server may have requested a changed id.
                        _this2.id = body.id || _this2.id;
                        _this2.load().then(resolve);
                    } else {
                        reject(err);
                    }
                });
            });
        }
    }, {
        key: "revert",


        /**
         * Remove any changes made to this object, reverting to the saved version.
         * Notifies all subscribed objects.
         * @return {DummyObject}
         */
        value: function revert() {
            this.updated = {};
            this.type.index(this);
            this.notify();
            return this;
        }
    }, {
        key: "load",


        /**
         * Loads data for this object from the server.
         * This will automatically overwrite local updates.
         * @return {Promise<DummyObject>}
         */
        value: function load() {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                /*
                Send a get request to the endpoint, and update this item with the returned data.
                 */
                index.getClient().get(_this3.getPath(), function (err, res, body) {
                    if (!err) {
                        _this3.hasLoaded = true;
                        /*
                        Remove this item from the registry, since its id may have changed.
                        In reality we should only do this if the id has been set...but this will enforce proper API practices.
                         */
                        _this3.type.registry.delete(_this3.id);
                        /*
                        Send the new data to the set method, where it will become the saved data.
                        If there is extraneous information, it will be filtered there.
                         */
                        _this3.set(body.data);
                        /*
                        The server may request the object to update its id.
                        For example, if this is a new object.
                         */
                        _this3.id = body.id;
                        _this3.version = body.version;
                        /*
                        Add this back to the registry with the updated (or unchanged) id.
                         */
                        _this3.type.registry.set(_this3.id, _this3);
                        /*
                        Index this object as needed.
                        We rerun the index because now information may have changed.
                         */
                        _this3.type.index(_this3);
                        /*
                        Subscribed objects need to know of the changes.
                         */
                        _this3.notify();
                        /*
                        Return the updated object. We send back object to allow chaining.
                         */
                        resolve(_this3);
                    } else {
                        reject(err);
                    }
                });
            });
        }
    }, {
        key: "del",
        value: function del() {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                index.getClient().del(_this4.getPath(), function (err, res, body) {
                    if (!err) {
                        /*
                        If this has been deleted, we must
                        clear any index references to this object,
                        and notify any subscribers.
                         */
                        _this4.type.clearObjIndices(_this4);
                        _this4.notify();
                        resolve();
                    } else {
                        reject();
                    }
                });
            });
        }
    }, {
        key: "dispatch",
        value: function dispatch(name) {
            var _this5 = this;

            var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            if (this.type.actions.has(name)) {
                index.getClient().post(this.getPath() + this.type.actions.get(name), data, function (err, res, body) {
                    _this5.load();
                });
            }
        }

        /**
         *
         * @param {DummyObject} parent
         */

    }, {
        key: "setParent",
        value: function setParent(parent) {
            var _this6 = this;

            this.parent = parent;
            parent.subscribe(this, function (updated) {
                _this6.load();
            });
        }

        /**
         * Subscribe to changes in this object.
         * @param {object} subscriber
         * @param {function(DummyObject):void} subscription
         */

    }, {
        key: "subscribe",
        value: function subscribe(subscriber, subscription) {
            this.subscriptions.set(subscriber, subscription);
        }
    }, {
        key: "notify",


        /**
         * Notify all subscribing objects with this.
         * Subscribed objects supply a function, which will be called.
         */
        value: function notify() {
            var _this7 = this;

            /*
            We iterate through the subscribing functions, notifying each of them.
             */
            [].concat(_toConsumableArray(this.subscriptions)).forEach(function (_ref2) {
                var _ref3 = _slicedToArray(_ref2, 2),
                    subscribed = _ref3[0],
                    subscription = _ref3[1];

                subscription(_this7);
            });
        }
    }]);

    return DummyObject;
}();

exports.DummyObject = DummyObject;
//# sourceMappingURL=DummyObject.js.map