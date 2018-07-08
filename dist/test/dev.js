'use strict';

var Dummy = require("../dist/src/index");
var DTypes = Dummy.propTypes;

Dummy.init('http://localhost:3000');

var TEACHER_TYPE = Dummy.createType('teacher', '/teacher');
TEACHER_TYPE.setPropMap({
    name: DTypes.primitive()
});

var CLASS_TYPE = Dummy.createType('class', '/class', {
    name: DTypes.primitive(),
    teacher: DTypes.reference({ type: TEACHER_TYPE }),
    grade: DTypes.primitive(),
    date: DTypes.primitive()
});
CLASS_TYPE.createBasicIndex('date');

var BASE_TYPE = Dummy.createType('base', '/base', {
    num: DTypes.primitive()
});
BASE_TYPE.createBasicIndex('num');

//Create many items to test scalability of search.
for (var x = 1; x < 100; x++) {
    BASE_TYPE.createObject(x, undefined, { num: x });
}

var teacher = TEACHER_TYPE.createObject(1, undefined, { name: "Cameron Davidson" });
var chemistry9 = CLASS_TYPE.createObject(1, undefined, {
    name: "Chemistry 9",
    teacher: 1,
    grade: 9,
    date: new Date('Jan 1 2018')
});
var chemistry10 = CLASS_TYPE.createObject(2, undefined, {
    name: "Chemistry 10",
    teacher: 1,
    grade: 10,
    date: new Date('dec 1 2019')
});

/**
 * Searches the classes for ones between 2018 and 2020.
 * Gets the teacher for each one, which as a reference, returns a promise.
 * Groups this array of promises together, and when all are loaded prints the results.
 */
CLASS_TYPE.searchIndexRange('date', new Date('2018'), new Date('2020')).then(function (classes) {
    Promise.all(classes.map(function (c) {
        return c.get('teacher');
    })).then(function (p) {
        console.dir(p);
    });
});

//Demonstrates that this approach is scalable with large data sets.
BASE_TYPE.searchIndexRange('num', 0, 1000000).then(function (results) {
    return console.dir(results.length);
});
//# sourceMappingURL=dev.js.map