const index = require('./index');

/**
 * Create a new dummy object.
 * @param id
 * @param type
 * @param parent
 * @param local
 * @return {DummyObject}
 * @constructor
 */
class DummyObject {

    constructor({id = undefined, type, parent = undefined, local = false}) {
        this.id = id;
        /** @type {DummyType} */
        this.type = type;
        /** @type {DummyObject | undefined} **/
        this.parent = parent;
        /** @type {boolean}*/
        this.local = local;

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
    getPath() {
        let path = "";

        //If necessary, append this path onto that of the parent,
        //otherwise, assume this is root.
        if (parent) {
            path = parent.getPath();
        } else {
            path = index.getProxy();
        }

        path += type.endPoint;
        //Only add on a unique id if this is not a "local only" item,
        //that is, the server knows about it.
        if (!local) {
            path += `/${id}`;
        }
        return path;
    };

    /**
     * Override updated, setting saved data to the parameter object.
     * @param {object} obj
     * @return {DummyObject}
     */
    set(obj) {
        let filtered = {};
        Object.keys(this.type.propMap).forEach(prop => {
            if (obj[prop]) {
                filtered[prop] = obj[prop];
            }
        });
        this.saved = {...this.saved, ...filtered};
        this.updated = {};
        this.type.index(this);
        this.notify();
        return this;
    };

    /**
     * Resolve the updates with the saved data, updates overwrite saved in the returned read only copy.
     * @return {{}}
     */
    resolve() {
        return {...this.saved, ...this.updated}
    };

    /**
     * Get a property.
     * @param prop
     * @return {Promise<DummyObject, *> | *}
     */
    get(prop) {
        return this.type.propMap[prop].get(this.resolve()[prop], this);
    };

    /**
     * Not recommended. Returns the direct value with no processing,
     * use only if sure it is okay.
     * @param prop
     * @return {*}
     */
    getRaw(prop){
        return this.resolve()[prop];
    }

    /**
     *
     * @param obj The updated properties.
     * @return {DummyObject}
     */
    update(obj) {
        this.updated = {...this.updated, ...obj};
        this.notify();
        return this;
    };

    /**
     * Save the current state of this object to the server.
     * @return {Promise}
     */
    save() {
        return new Promise((resolve, reject) => {
            //Post this object based on the resolved version.
            index.getClient()
                .post(this.getPath(), this.resolve(), (err, res, body) => {
                    //Only successful if there wasn't an error.
                    if (!err) {
                        //The server may have requested a changed id.
                        this.id = body.id || this.id;
                        this.load()
                            .then(resolve);
                    } else {
                        reject(err);
                    }
                });
        });
    };

    /**
     * Remove any changes made to this object, reverting to the saved version.
     * Notifies all subscribed objects.
     * @return {DummyObject}
     */
    revert() {
        this.updated = {};
        this.type.index(this);
        this.notify();
        return this;
    };

    /**
     * Loads data for this object from the server.
     * This will automatically overwrite local updates.
     * @return {Promise<DummyObject>}
     */
    load() {
        return new Promise((resolve, reject) => {
            index.getClient().get(this.getPath(), (err, res, body) => {
                if (!err) {
                    this.type.registry.delete(this.id);
                    this.set(body.data);
                    this.id = body.id;
                    this.type.registry.set(this.id, this);
                    this.type.index(this);
                    this.notify();
                    resolve(this)
                } else {
                    reject(err)
                }
            })
        })
    };

    /**
     * Subscribe to changes in this object.
     * @param {object} subscriber
     * @param {function(DummyObject):void} subscription
     */
    subscribe(subscriber, subscription) {
        this.subscriptions.set(subscriber, subscription);
    };

    /**
     * Notify all subscribing objects with this.
     * Subscribed objects supply a function, which will be called.
     */
    notify() {
        [...this.subscriptions].forEach(([subscribed, subscription]) => {
            subscription(this);
        });
    }
}

exports.DummyObject = DummyObject;