const { store } = require('../../shared/store/runtime-store');

const listStudents = async ({ institutionId, parentId }) =>
  store.students.profiles.filter(
    (student) =>
      student.institution_id === institutionId && (!parentId || student.parent_id === parentId)
  );

const getStudent = async ({ institutionId, studentId }) => {
  const student = store.students.profiles.find(
    (item) => item.id === studentId && item.institution_id === institutionId
  );
  if (!student) {
    throw Object.assign(new Error('Student not found.'), { statusCode: 404 });
  }
  return student;
};

const getRoster = async ({ classId }) => store.students.teacherRoster[classId] || [];

const createStudent = async ({ institutionId, payload }) => {
  const nextId = `stu-${String(store.students.profiles.length + 1).padStart(3, '0')}`;
  const student = {
    id: nextId,
    institution_id: institutionId,
    parent_id: payload.parent_id || null,
    student_number:
      payload.student_number || `EDU-${new Date().getFullYear()}-${String(store.students.profiles.length + 1).padStart(4, '0')}`,
    first_name: payload.first_name,
    last_name: payload.last_name,
    full_name: `${payload.first_name} ${payload.last_name}`.trim(),
    class_id: payload.class_id,
    class_name: payload.class_name,
    level_code: payload.level_code,
    photo_url: payload.photo_url || null,
    attendance_percent: 0,
    balance_due: 0,
    next_exam: null,
  };
  store.students.profiles.push(student);
  return student;
};

module.exports = {
  listStudents,
  getStudent,
  getRoster,
  createStudent,
};
