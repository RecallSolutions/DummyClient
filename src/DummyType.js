const DummyObject = require('./DummyObject').DummyObject;

/**
 * Create a new Dummy Type Object.
 * @template P
 * @param {P} propMap
 * @param endPoint
 * @param registry
 * @return {DummyType}
 * @constructor
 */

class DummyType {

    constructor(propMap, endPoint) {
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
    static BasicIndexor(val, obj, index) {
        /**
         * Get the map of objects corresponding to the given value in index.
         * @type {Map<number, DummyObject>>}
         */
        obj.type.clearObjIndices(obj);

        let sub_index;
        if (index.has(val.valueOf())) {
            sub_index = index.get(val.valueOf());
        } else {
            sub_index = new Map()
            index.set(val.valueOf(), sub_index);
        }
        sub_index.set(obj.id, obj);
        obj.indexees.push([index, val.valueOf(), sub_index]);
    }

    createAction(name, endpoint) {
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
    createIndex(name, indexor) {
        this.indexes.set(name, new Map())
        this.indexors.set(name, indexor);
    }

    /**
     * Create an index where no additional validation is needed, simply uses property to index.
     * Should only be used for non reference properties.
     * @param name
     * @param property
     */
    createBasicIndex(name, property = name) {
        this.createIndex(name, (obj, index) => {
            DummyType.BasicIndexor(obj.getRaw(property), obj, index);
        });
    }

    /**
     * Clear any indeces of this object.
     *@type {DummyObject} obj
     */
    clearObjIndices(obj) {
        obj.indexees.forEach(([index, val, subIndex]) => {
            subIndex.delete(obj.id);
            if (subIndex.size == 0) {
                index.delete(val);
            }
        });
    }

    /**
     * Run an object against the indeces.
     * @param {DummyObject} obj
     */
    index(obj) {
        /*
        First, we should clear any indexes the object already has.
         */
        this.clearObjIndices(obj);
        /*
        Now go through our indexes, adding items.
        Indexing only makes sense if this object has loaded and has data.
        If it has not, then load it. The load method automatically indexes.
         */
        if(obj.hasLoaded){
            () => this.indexors.forEach(((indexor, name) => {
                indexor(obj, this.indexes.get(name))
            }));
        }else{
            obj.load()
        }
    }

    /**
     * Searches the specified index for
     * @param name
     * @param val
     * @return {Promise<DummyObject[]>}
     */
    async searchIndexBasic(name, val) {
        /*
        If the given index does not exist, throw an error.
         */
        if (this.indexes.has(name)) {
            const index = this.indexes.get(name);
            //If the index does not have the requested value, return empty.
            if (index.has(val.valueOf())) {
                //The index map contains ids and object. Filter only the objects.
                return [...index.get(val.valueOf())].map(([id, o]) => o);
            } else {
                return [];
            }
        } else {
            throw name + " has not been indexed."
        }
    }

    /**
     * Search the given index with a custom condition.
     * If the subIndex should be returned, conditioned should evaluate true.
     * @param {string} name
     * @param {function(*):bool} condition
     * @return {Promise<DummyObject[]>}
     */
    async searchIndex(name, condition) {
        //Throw error if requested index doesn't exist.
        if (this.indexes.has(name)) {
            const index = this.indexes.get(name);
            //objects matching the condition
            let matched = [];
            /**here, since there is a condition,
             we must iterate through all values to check for matches.
             */
            [...index.keys()].forEach((val) => {
                if (condition(val.valueOf())) {
                    matched.push(...[...index.get(val.valueOf())].map(([id, o]) => o));
                }
            });
            return matched;
        } else {
            throw name + " has not been indexed."
        }
    }

    /**
     * Search index for values within a range.
     * @param {string} name
     * @param {*} low
     * @param {*} high
     * @return {Promise<DummyObject[]>}
     */
    async searchIndexRange(name, low, high) {
        /*
        Just provide a simpler interface,
        while offloading to the search function.
         */
        return new Promise((resolve, reject) =>
            this.searchIndex(name, val => {
                return low.valueOf() <= val.valueOf() && high.valueOf() >= val.valueOf()
            })
                .then(s => {
                    resolve(s)
                })
                .catch(reject)
        );
    }

    /**
     * Create and return a new object of this type.
     * @param {number|undefined} id
     * The id of the object, used if exists on remote. Left blank if new.
     * @param {DummyObject} parent
     * @param {{}} data
     * The parent object to this. This is automatically set if an object creates a child from its reference.
     * @returns {DummyObject}
     */
    createObject(id = undefined, parent = undefined, data = {}) {
        let objectParams = {type: this, parent: parent};
        if (id) {
            objectParams.id = id;
        } else {
            objectParams.local = true;
            objectParams.id = -this.registry.size;
        }
        const obj = new DummyObject(objectParams);
        this.registry.set(objectParams.id, obj);
        obj.set(data);
        return obj;
    };

    /**
     * Returns whether this type has a given object.
     * @param id
     * @return {boolean}
     */
    has(id) {
        return this.registry.has(id);
    };

    /**
     * Get an object of this type by id. Returns a promise, since it may require a server load.
     * @param {number} id
     * @param {DummyObject} parent Optional, the parent object calling get on its property.
     * @return {Promise<DummyObject, *>}
     */
    get(id, parent) {
        return new Promise((resolve, reject) => {
            if (this.registry.has(id)) {
                if (parent) {
                    this.registry.get(id).setParent(parent);
                }
                resolve(this.registry.get(id));
            } else {
                let obj = this.createObject(id, parent);
                obj.load()
                    .then(() => {
                        resolve(obj);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        })
    }

    /**
     * Set a prop map
     */
    setPropMap(propMap) {
        this.propMap = propMap;
    }
}

exports.DummyType = DummyType;