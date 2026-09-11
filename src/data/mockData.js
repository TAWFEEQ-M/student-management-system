export const initialStudents = [
  { id: "CSE001", name: "Arun Kumar", email: "arun@example.com", phone: "9876543210", dateOfBirth: "2005-04-12", gender: "Male", department: "CSE", year: "2nd Year", section: "A", address: "Bengaluru", admissionYear: "2024", attendance: 92 },
  { id: "CSE002", name: "Rahul Raj", email: "rahul@example.com", phone: "9876543211", dateOfBirth: "2005-08-22", gender: "Male", department: "CSE", year: "2nd Year", section: "A", address: "Mysuru", admissionYear: "2024", attendance: 86 },
  { id: "CSE003", name: "Aisha Mohammed", email: "aisha@example.com", phone: "9876543212", dateOfBirth: "2005-01-18", gender: "Female", department: "CSE", year: "2nd Year", section: "B", address: "Kochi", admissionYear: "2024", attendance: 95 },
  { id: "ECE001", name: "Vijay Kumar", email: "vijay@example.com", phone: "9876543213", dateOfBirth: "2004-11-03", gender: "Male", department: "ECE", year: "3rd Year", section: "A", address: "Chennai", admissionYear: "2023", attendance: 74 },
  { id: "EEE001", name: "Priya Sharma", email: "priya@example.com", phone: "9876543214", dateOfBirth: "2006-02-14", gender: "Female", department: "EEE", year: "1st Year", section: "A", address: "Hyderabad", admissionYear: "2025", attendance: 89 },
  { id: "CSE005", name: "Neha Singh", email: "neha@example.com", phone: "9876543215", dateOfBirth: "2003-09-09", gender: "Female", department: "CSE", year: "4th Year", section: "B", address: "Pune", admissionYear: "2022", attendance: 78 },
];

export const initialSubjects = [
  { code: "CS201", name: "Data Structures", faculty: "Dr. Kumar", credits: 4, semester: "3", department: "CSE" },
  { code: "CS202", name: "Database Management", faculty: "Prof. Ahmed", credits: 4, semester: "4", department: "CSE" },
  { code: "CS203", name: "Operating Systems", faculty: "Dr. Priya", credits: 4, semester: "5", department: "CSE" },
  { code: "CS204", name: "Computer Networks", faculty: "Prof. Raj", credits: 3, semester: "5", department: "CSE" },
];

export const initialMarks = {
  CSE001: { test1: 23, test2: 25, assignment: 9 },
  CSE002: { test1: 20, test2: 22, assignment: 8 },
  CSE003: { test1: 25, test2: 24, assignment: 10 },
  ECE001: { test1: 18, test2: 19, assignment: 7 },
  EEE001: { test1: 21, test2: 23, assignment: 9 },
  CSE005: { test1: 19, test2: 20, assignment: 8 },
};

export const initialAttendance = {
  "2026-09-01": { CS201: { CSE001: true, CSE002: true, CSE003: true, ECE001: false, EEE001: true, CSE005: true }, CS202: { CSE001: true, CSE002: false, CSE003: true, ECE001: true, EEE001: true, CSE005: true } },
  "2026-09-03": { CS201: { CSE001: true, CSE002: true, CSE003: true, ECE001: false, EEE001: true, CSE005: false }, CS203: { CSE001: true, CSE002: true, CSE003: true, ECE001: true, EEE001: true, CSE005: true } },
  "2026-09-05": { CS202: { CSE001: true, CSE002: true, CSE003: true, ECE001: false, EEE001: true, CSE005: true }, CS204: { CSE001: false, CSE002: true, CSE003: true, ECE001: true, EEE001: true, CSE005: true } },
  "2026-09-08": { CS201: { CSE001: true, CSE002: false, CSE003: true, ECE001: false, EEE001: true, CSE005: true }, CS202: { CSE001: true, CSE002: true, CSE003: true, ECE001: false, EEE001: true, CSE005: false } },
  "2026-09-11": { CS201: { CSE001: true, CSE002: true, CSE003: true, ECE001: false, EEE001: true, CSE005: true } },
};

const examTypes = ["Internal Assessment 1", "Internal Assessment 2", "Assignment", "Model Examination", "Semester Examination"];
export const examMaxMarks = {
  "Internal Assessment 1": { test1: 25, test2: 25, assignment: 10 },
  "Internal Assessment 2": { test1: 25, test2: 25, assignment: 10 },
  Assignment: { assignment: 10 },
  "Model Examination": { test1: 25, test2: 25, assignment: 10, practical: 20 },
  "Semester Examination": { final: 100 },
};
export const initialAssessmentMarks = Object.fromEntries(initialStudents.map((student, studentIndex) => [
  student.id,
  Object.fromEntries(initialSubjects.map((subject, subjectIndex) => [
    subject.code,
    Object.fromEntries(examTypes.map((exam, examIndex) => {
      const base = 58 + ((studentIndex * 7 + subjectIndex * 5 + examIndex * 3) % 32);
      return [exam, { test1: Math.round(base * 0.22), test2: Math.round(base * 0.23), assignment: Math.round(base * 0.09), practical: Math.round(base * 0.16), final: Math.round(base * 0.75) }];
    })),
  ])),
]));

export { examTypes };
