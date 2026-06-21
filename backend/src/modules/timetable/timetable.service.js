const { store } = require('../../shared/store/runtime-store');

const listTimetable = async () => store.timetable;

module.exports = {
  listTimetable,
};
