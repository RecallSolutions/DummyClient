const Dummy = require("../dist/src/index");
const DTypes = Dummy.propTypes;

Dummy.init('http://localhost:3000');


const TEACHER_TYPE = Dummy.createType('teacher', '/teacher');
TEACHER_TYPE.setPropMap({
    name: DTypes.primitive(),
})

const CLASS_TYPE = Dummy.createType('class', '/class', {
    name: DTypes.primitive(),
    teacher: DTypes.reference({type: TEACHER_TYPE}),
    grade: DTypes.primitive(),
    date: DTypes.primitive()
});
CLASS_TYPE.createBasicIndex('date');

const BASE_TYPE = Dummy.createType('base', '/base', {
    num: DTypes.primitive()
});
BASE_TYPE.createBasicIndex('num');

//Create many items to test scalability of search.
for (let x = 1; x < 100; x++) {
    BASE_TYPE.createObject(x, undefined, {num: x});
}

const teacher = TEACHER_TYPE.createObject(1, undefined, {name: "Cameron Davidson"});
const chemistry9 = CLASS_TYPE.createObject(1, undefined, {
    name: "Chemistry 9",
    teacher: 1,
    grade: 9,
    date: new Date('Jan 1 2018')
});
const chemistry10 = CLASS_TYPE.createObject(2, undefined, {
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
CLASS_TYPE.searchIndexRange('date', new Date('2018'), new Date('2020'))
    .then(classes => {
        Promise.all(classes.map(c => c.get('teacher')))
            .then(p => {
                console.dir(p);
            })
    });

//Demonstrates that this approach is scalable with large data sets.
BASE_TYPE.searchIndexRange('num', 0, 1000000)
    .then(results => console.dir(results.length));
