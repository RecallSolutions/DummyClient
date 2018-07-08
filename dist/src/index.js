'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * @author Jay Mohile
 * @version 0.9.0
 */

// noinspection Annotator
var request = require('request-json');
require('babel-polyfill');
/*
Import Type and Object, separated into modules for scalability.
We export them to make them accessible through a single outside ui.
 */
var DummyType = require('./DummyType').DummyType;
exports.DummyType = DummyType;
var DummyObject = require('./DummyObject').DummyObject;
exports.DummyObject = DummyObject;

/**
 * The fully qualified base URL for all network requests.
 * @type string;
 * @example
 * http://example.com
 */
var API_PROXY = void 0;

/**
 * The network client that will be used for all network requests.
 */
var client = void 0;

/**
 * A registry of all types created.
 */
var TYPES_REGISTRY = new Map();

/**
 * Initialize the dummy client.
 * @param {string} API_PROXY The root domain for network activity.
 * @returns {void}
 **/
exports.init = function (API_PROXY) {
  exports.setProxy(API_PROXY);
  client = request.createClient(exports.getProxy());
};

/**
 * Get the root API proxy.
 * @return {string}
 */
exports.getProxy = function () {
  return API_PROXY;
};
/**
 * Set the root API proxy.
 * @param {string} proxy
 */
exports.setProxy = function (proxy) {
  API_PROXY = proxy;
};

/**
 * Get the network client.
 * @return {*}
 */
exports.getClient = function () {
  return client;
};

/**
 * Types of properties that an object can hold.
 * Primitives store and return a basic value,
 * references use an int id to get another object.
 * @type {{primitive: function(): {get(*, *): *}, reference: function({type: *}): {type: *, get(*=, *=): *}}}
 */
exports.propTypes = {
  /**
   * @return {{get(*, DummyObject): *}}
   */
  primitive: function primitive() {
    return {
      /**
       *
       * @template T
       * @param {T} val
       * @param {DummyObject} parent
       * @return {T}
       */
      get: function get(val, parent) {
        return val;
      }
    };
  },
  /**
   *
   * @param {DummyType} type
   * @param {boolean} subscribed
   * @return {{type: DummyType, subscribed: boolean, get(number, DummyObject): Promise<DummyObject, *>}}
   */
  reference: function reference(_ref) {
    var type = _ref.type,
        _ref$subscribed = _ref.subscribed,
        subscribed = _ref$subscribed === undefined ? false : _ref$subscribed;
    return {
      reference: true,
      type: type,
      subscribed: subscribed,
      /**
       *
       * @param {number} id
       * @param {DummyObject} parent
       * @return {Promise<DummyObject, *>}
       */
      get: function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(id) {
          var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  return _context.abrupt('return', type.get(id, parent));

                case 1:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));

        function get(_x2) {
          return _ref2.apply(this, arguments);
        }

        return get;
      }()
    };
  },

  /**
   * In many cases, and object will reference many objects in a single field.
   * For example, a month holding many days.
   * This type takes in an array of ids, and returns a promise when all of them resolve.
   *
   * @param {DummyType} type
   * @return {Promise<Promise<DummyObject,*>[]>}
   */
  referenceArray: function referenceArray(_ref3) {
    var type = _ref3.type;
    return {
      referenceArray: true,
      type: type,
      /**
       * Resolve all reference ids.
       * @param ids
       * @param parent {DummyObject}
       * @return {Promise<Promise<DummyObject>[]>}
       */
      get: function get(ids) {
        var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

        return Promise.all(ids.map(function (id) {
          return type.get(id, parent);
        }));
      }
    };
  }
};

/**
 * Create a new DummyType based on a typemap, with an API endpoint.
 * @param {{}} typeMap
 * @param {string} endPoint
 * @return {DummyType}
 */
exports.createType = function (name, endPoint, typeMap) {
  var type = new DummyType(typeMap, endPoint);
  TYPES_REGISTRY.set(name, type);
  return type;
};
//# sourceMappingURL=index.js.map