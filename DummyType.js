const DummyObject = require('./DummyObject').DummyObject;

exports.DummyType = (propMap, endPoint, registry = new Map()) => ({
    propMap,
    endPoint,
    /*
    A map storing references to all objects of this type through id.
     */
    registry,

    /**
     * Create and return a new object of this type.
     * @param {number|undefined} id
     * The id of the object, used if exists on remote. Left blank if new.
     * @param {DummyObject} parent
     * The parent object to this. This is automatically set if an object creates a child from its reference.
     * @returns {DummyObject}
     */
    createObject(id = undefined, parent = undefined) {
        let objectParams = {type: this, parent: parent};
        if (id) {
            objectParams.id = id;
        } else {
            objectParams.local = true;
            objectParams.id = -this.registry.size;
        }
        const obj = DummyObject(objectParams);
        this.registry.set(objectParams.id, obj);
        return obj;
    },
    /**
     * Returns whether this type has a given object.
     * @param id
     * @return {boolean}
     */
    has(id) {
        return registry.has(id);
    },
    /**
     * Get an object of this type by id. Returns a promise, since it may require a server load.
     * @param {number} id
     * @param {DummyObject} parent Optional, the parent object calling get on its property.
     * @return {Promise}
     */
    get(id, parent) {
        return new Promise((resolve, reject) => {
            if (registry.has(id)) {
                resolve(registry.get(id));
            } else {
                let obj = this.createObject(id, parent);
                obj.load()
                    .then(() => {
                        resolve(obj);
                    })
                    .catch((err) => {
                        reject(err);
                    })
                ;
            }
        })
    }
});