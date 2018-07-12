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

    constructor({id = undefined, version = 0, type, parent = undefined, local = false}) {
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
        this.hasLoaded = false

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
        if (this.parent) {
            path = this.parent.getPath();
        } else {
            path = index.getProxy();
        }
        path += this.type.endPoint;
        //Only add on a unique id if this is not a "local only" item,
        //that is, the server knows about it.
        if (!this.local) {
            path += `/${this.id}`;
        }
        return path;
    };

    /**
     * Override updated, setting saved data to the parameter object.
     * @param {object} obj
     * @return {DummyObject}
     */
    set(obj) {
        Object.keys(this.type.propMap).forEach((prop, func) => {
            if (obj[prop] != undefined) {
                const mappedProp = this.type.propMap[prop];
                this.saved[prop] = obj[prop]

                //Special actions may be needed to properly manage referenced objects.
                if (mappedProp.reference || mappedProp.referenceArray) {
                    //The refernce may request that it is loaded.
                    if (mappedProp.load) {
                        mappedProp.get(obj[prop], this);
                    }
                }
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
    get(prop, parent = this) {
        return this.type.propMap[prop].get(this.resolve()[prop], parent);
    };

    /**
     * Not recommended. Returns the direct value with no processing,
     * use only if sure it is okay.
     * @param prop
     * @return {*}
     */
    getRaw(prop) {
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
            //Post or put this object based on the resolved version.
            index.getClient().post(this.getPath(), this.resolve(), (err, res, body) => {
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
            /*
            Send a get request to the endpoint, and update this item with the returned data.
             */
            index.getClient().get(this.getPath(), (err, res, body) => {
                if (!err) {
                    this.hasLoaded = true;
                    /*
                    Remove this item from the registry, since its id may have changed.
                    In reality we should only do this if the id has been set...but this will enforce proper API practices.
                     */
                    this.type.registry.delete(this.id);
                    /*
                    Send the new data to the set method, where it will become the saved data.
                    If there is extraneous information, it will be filtered there.
                     */
                    this.set(body.data);
                    /*
                    The server may request the object to update its id.
                    For example, if this is a new object.
                     */
                    this.id = body.id;
                    this.version = body.version;
                    /*
                    Add this back to the registry with the updated (or unchanged) id.
                     */
                    this.type.registry.set(this.id, this);
                    /*
                    Index this object as needed.
                    We rerun the index because now information may have changed.
                     */
                    this.type.index(this);
                    /*
                    Subscribed objects need to know of the changes.
                     */
                    this.notify();
                    /*
                    Return the updated object. We send back object to allow chaining.
                     */
                    resolve(this)
                } else {
                    reject(err)
                }
            })
        })
    };

    del() {
        return new Promise((resolve, reject) => {
            index.getClient().del(this.getPath(), (err, res, body) => {
                if (!err) {
                    /*
                    If this has been deleted, we must
                    clear any index references to this object,
                    and notify any subscribers.
                     */
                    this.type.clearObjIndices(this);
                    this.notify();
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    dispatch(name, data = {}) {
        if (this.type.actions.has(name)) {
            index.getClient().post(this.getPath() + this.type.actions.get(name), data, (err, res, body) => {
                this.load();
            });
        }
    }

    /**
     *
     * @param {DummyObject} parent
     */
    setParent(parent) {
        this.parent = parent;
        parent.subscribe(this, updated => {
            this.load();
        });
    }

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
        /*
        We iterate through the subscribing functions, notifying each of them.
         */
        [...this.subscriptions].forEach(([subscribed, subscription]) => {
            subscription(this);
        });
    }
}

exports.DummyObject = DummyObject;