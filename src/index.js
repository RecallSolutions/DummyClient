/**
 * @author Jay Mohile
 * @version 0.9.0
 */

// noinspection Annotator
const request = require('request-json');
require('babel-polyfill');
/*
Import Type and Object, separated into modules for scalability.
We export them to make them accessible through a single outside ui.
 */
const DummyType = require('./DummyType').DummyType;
exports.DummyType = DummyType;
const DummyObject = require('./DummyObject').DummyObject;
exports.DummyObject = DummyObject;

/**
 * The fully qualified base URL for all network requests.
 * @type string;
 * @example
 * http://example.com
 */
let API_PROXY;

/**
 * The network client that will be used for all network requests.
 */
let client;

/**
 * A registry of all types created.
 */
const TYPES_REGISTRY = new Map();

/**
 * Initialize the dummy client.
 * @param {string} API_PROXY The root domain for network activity.
 * @returns {void}
 **/
exports.init = (API_PROXY) => {
    exports.setProxy(API_PROXY);
    client = request.createClient(exports.getProxy());
};

/**
 * Get the root API proxy.
 * @return {string}
 */
exports.getProxy = () => API_PROXY;
/**
 * Set the root API proxy.
 * @param {string} proxy
 */
exports.setProxy = (proxy) => {
    API_PROXY = proxy
};

/**
 * Get the network client.
 * @return {*}
 */
exports.getClient = () => client;

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
    primitive: () => ({
        /**
         *
         * @template T
         * @param {T} val
         * @param {DummyObject} parent
         * @return {T}
         */
        get(val, parent) {
            return val;
        }
    }),
    /**
     *
     * @param {DummyType} type
     * @param {boolean} subscribed
     * @param {boolean} ignoreParent
     * @return {{type: DummyType, subscribed: boolean, get(number, DummyObject): Promise<DummyObject, *>}}
     */
    reference: ({type, subscribed = false, ignoreParent = false, load = false}) => (
        {
            reference: true,
            type,
            subscribed,
            ignoreParent,
            load,
            /**
             *
             * @param {number} id
             * @param {DummyObject} parent
             * @return {Promise<DummyObject, *>}
             */
            async get(id, parent = undefined) {
                return type.get(id, this.ignoreParent ? undefined : parent)
            }
        }
    ),

    /**
     * In many cases, and object will reference many objects in a single field.
     * For example, a month holding many days.
     * This type takes in an array of ids, and returns a promise when all of them resolve.
     *
     * @param {DummyType} type
     * @param {boolean} ignoreParent
     * @return {Promise<Promise<DummyObject,*>[]>}
     */
    referenceArray: ({type, child = undefined, ignoreParent= false, load = false}) => ({
        referenceArray: true,
        type,
        child,
        ignoreParent,
        load,
        /**
         * Resolve all reference ids.
         * @param ids
         * @param parent {DummyObject}
         * @return {Promise<Promise<DummyObject>[]>}
         **/
        get(ids, parent = undefined) {
            return Promise.all(ids.map(id => type.get(id, this.ignoreParent ? undefined: parent)));
        }
    })
};


/**
 * Create a new DummyType based on a typemap, with an API endpoint.
 * @param {{}} typeMap
 * @param {string} endPoint
 * @return {DummyType}
 */
exports.createType = (name, endPoint, typeMap) => {
    const type = new DummyType(typeMap, endPoint);
    TYPES_REGISTRY.set(name, type);
    return type;
};