const Dummy = require("../index");
const DTypes = Dummy.propTypes;

Dummy.init('http://localhost:3000');

const DAY_TYPE = Dummy.createType('day', '/days', {
    date: DTypes.primitive
});
const CALENDAR_TYPE = Dummy.createType('calendar', '/calendars', {
    month: DTypes.primitive(),
    days: DTypes.referenceArray({type: DAY_TYPE}),
});

CALENDAR_TYPE.createBasicIndex('month');

const calendar = CALENDAR_TYPE.createObject(1).set({month: 1, days: [1, 2, 3]});

const calendar2 = CALENDAR_TYPE.createObject(2);
//calendar.set({month: 2});
calendar2.set({month: 3});

CALENDAR_TYPE.searchIndexRange('month', 0, 4)
    .then(s => {
        console.dir(s.map(o => o.getRaw('month')));
    })