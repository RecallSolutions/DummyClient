/**
 * @author Jay Mohile
 * @version 0.9.0
 */

// noinspection Annotator
const request = require('request-json');
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
    primitive: () => ({
        get(val, parent) {
            return val;
        }
    }),

    reference: ({type}) => (
        {
            type,
            async get(id, parent) {
                return type.get(id, parent)
            }
        }
    )
};


/**
 * Create a new DummyType based on a typemap, with an API endpoint.
 * @param {{}} typeMap
 * @param {string} endPoint
 * @return {DummyType}
 */
exports.createType = (endPoint, typeMap) => {
    return DummyType(typeMap, endPoint);
};