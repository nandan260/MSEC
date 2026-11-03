import type { AppState, AttendanceStatus, ClassItem, Student } from './types.js';

export const today = (): string => new Date().toLocaleDateString('en-CA');
export const uid = (): string => globalThis.crypto.randomUUID();
export const atRisk = (s: { score: number; attendance: number }): boolean => s.score < 60 || s.attendance < 75;

export function saveAttendance(
  state: AppState,
  classId: string,
  date: string,
  records: Record<string, AttendanceStatus>
): void {
  if (!state.classes.some((c) => c.id === classId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Choose a valid class and date.');
  }
  const valid: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];
  if (Object.values(records).some((v) => !valid.includes(v))) {
    throw new Error('Invalid attendance status.');
  }
  const row = state.attendance.find((x) => x.classId === classId && x.date === date);
  if (row) {
    row.records = { ...records };
  } else {
    state.attendance.push({ classId, date, records: { ...records } });
  }
}

export function gradeSubmission(state: AppState, id: string, value: string | number): void {
  const row = state.submissions.find((x) => x.id === id);
  if (!row) throw new Error('Submission not found.');
  const assignment = state.assignments.find((a) => a.id === row.assignmentId);
  if (!assignment) throw new Error('Assignment not found.');
  const n = Number(value);
  if (String(value).trim() === '' || !Number.isFinite(n) || n < 0 || n > assignment.maxMarks) {
    throw new Error(`Enter marks between 0 and ${assignment.maxMarks}.`);
  }
  row.marks = n;
  row.status = 'Graded';
}

export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let s = String(v ?? '');
          if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(',')
    )
    .join('\r\n');
}

export function seedData(): AppState {
  const classes: ClassItem[] = [
    { id: 'c1', name: 'Computer Science', subject: 'Data Structures', section: 'CSE · Semester III · A', code: 'CS301', room: 'Room 204', color: 'teal', days: [1, 2, 4], time: '09:00', students: 8 },
    { id: 'c2', name: 'Computer Science', subject: 'Database Systems', section: 'CSE · Semester V · B', code: 'CS502', room: 'Lab 03', color: 'purple', days: [1, 3, 5], time: '11:00', students: 6 },
    { id: 'c3', name: 'Information Science', subject: 'Python Programming', section: 'ISE · Semester III · A', code: 'IS303', room: 'Room 108', color: 'orange', days: [2, 3, 5], time: '14:00', students: 6 },
    { id: 'c4', name: 'Computer Science', subject: 'Design & Analysis of Algorithms', section: 'CSE · Semester V · A', code: 'CS501', room: 'Room 302', color: 'blue', days: [1, 4, 5], time: '15:00', students: 6 }
  ];

  const names = [
    'Aarav Sharma', 'Diya Patel', 'Arjun Rao', 'Ananya Reddy', 'Vihaan Kumar', 'Ishita Singh',
    'Aditya Nair', 'Meera Iyer', 'Rohan Das', 'Sara Khan', 'Karthik Raj', 'Nisha Menon',
    'Pranav Joshi', 'Aditi Gupta', 'Rahul Verma', 'Sneha Rao', 'Dev Shah', 'Pooja Nair',
    'Akash Gowda', 'Riya Jain', 'Siddharth Pai', 'Tanvi Bhat', 'Varun Shetty', 'Kavya Rao',
    'Nikhil Kumar', 'Priya Das'
  ];

  const students: Student[] = names.map((name, i) => ({
    id: 's' + (i + 1),
    name,
    roll: '1ME24CS' + String(i + 1).padStart(3, '0'),
    classId: i < 8 ? 'c1' : i < 14 ? 'c2' : i < 20 ? 'c3' : 'c4',
    score: [92, 88, 56, 94, 76, 81, 64, 89, 72, 93, 54, 86, 78][i % 13],
    attendance: [96, 94, 72, 98, 88, 91, 79, 95, 89, 97, 68, 94, 88][i % 13],
    trend: [4, 3, -5, 6, 2, 4, -2, 5][i % 8],
    email: name.toLowerCase().replace(' ', '.') + '@student.msec.edu',
    parent: 'Parent of ' + name
  }));

  const date = today();
  const plus = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA');
  };

  return {
    version: 1,
    profile: {
      name: 'Dr. Ananya Srinivas',
      email: 'ananya.s@msec.edu.in',
      department: 'Computer Science & Engineering',
      phone: '+91 98765 43210',
      bio: 'Making complex ideas simple, one class at a time.',
      emailUpdates: true
    },
    classes,
    students,
    attendance: [],
    assignments: [
      {
        id: 'a1',
        title: 'Binary trees & traversal techniques',
        classId: 'c1',
        due: plus(2),
        maxMarks: 100,
        description: 'Implement inorder, preorder and postorder traversal. Include complexity analysis and test cases.',
        status: 'Published',
        files: []
      },
      {
        id: 'a2',
        title: 'Database normalization case study',
        classId: 'c2',
        due: plus(4),
        maxMarks: 50,
        description: 'Normalize the given library database up to 3NF. Explain functional dependencies.',
        status: 'Published',
        files: []
      },
      {
        id: 'a3',
        title: 'Python mini project',
        classId: 'c3',
        due: plus(7),
        maxMarks: 100,
        description: 'Create a command-line task manager using files and exception handling.',
        status: 'Draft',
        files: []
      }
    ],
    submissions: [
      {
        id: 'sub1',
        assignmentId: 'a1',
        studentId: 's1',
        text: 'Implemented recursive and iterative tree traversals. Time: O(n), auxiliary space: O(h).',
        marks: null,
        status: 'Submitted'
      },
      {
        id: 'sub2',
        assignmentId: 'a1',
        studentId: 's2',
        text: 'Tree traversal solution with sample input and output. Inorder produces sorted keys for a BST.',
        marks: 88,
        status: 'Graded'
      },
      {
        id: 'sub3',
        assignmentId: 'a2',
        studentId: 's9',
        text: 'Library schema separated into Books, Members and Loans to remove partial and transitive dependencies.',
        marks: null,
        status: 'Submitted'
      }
    ],
    assessments: [
      {
        id: 'e1',
        title: 'Data Structures · Unit II',
        classId: 'c1',
        date: plus(5),
        maxMarks: 30,
        questions: '1. Explain binary search trees.\n2. Compare BFS and DFS.\n3. Analyze insertion complexity.',
        type: 'Test'
      },
      {
        id: 'e2',
        title: 'SQL fundamentals quiz',
        classId: 'c2',
        date: plus(8),
        maxMarks: 20,
        questions: '1. What is a primary key?\n2. Write a query using GROUP BY.',
        type: 'Quiz'
      }
    ],
    materials: [
      {
        id: 'm1',
        title: 'Trees & graphs — lecture notes',
        classId: 'c1',
        type: 'Notes',
        description: 'Tree terminology, traversal algorithms, graph representations and worked examples.',
        date,
        files: []
      },
      {
        id: 'm2',
        title: 'SQL joins — quick reference',
        classId: 'c2',
        type: 'Notes',
        description: 'INNER JOIN returns matching rows. LEFT JOIN retains all rows from the left table. CROSS JOIN produces a Cartesian product.',
        date,
        files: []
      }
    ],
    announcements: [
      {
        id: 'n1',
        title: 'Lab session: bring your laptops',
        classId: 'c1',
        body: 'Please bring a charged laptop for our hands-on session on binary search trees tomorrow.',
        date
      },
      {
        id: 'n2',
        title: 'Internal assessment schedule released',
        classId: 'all',
        body: 'Unit II assessments begin next week. Review the timetable and prepare your questions for our revision session.',
        date
      }
    ],
    doubts: [
      {
        id: 'd1',
        studentId: 's3',
        title: 'How do rotations balance an AVL tree?',
        body: 'I understand insertion in a BST, but when should we use a double rotation instead of a single rotation?',
        classId: 'c1',
        status: 'Open',
        reply: ''
      },
      {
        id: 'd2',
        studentId: 's10',
        title: 'Difference between WHERE and HAVING',
        body: 'Can we use aggregate functions in WHERE? Why do we need HAVING?',
        classId: 'c2',
        status: 'Open',
        reply: ''
      },
      {
        id: 'd3',
        studentId: 's16',
        title: 'Reading a file line by line',
        body: 'How do I avoid loading the entire file into memory?',
        classId: 'c3',
        status: 'Resolved',
        reply: 'Use a with statement and iterate over the file object: for line in file. This streams one line at a time.'
      }
    ],
    messages: [],
    leaves: [],
    tasks: [
      { id: 't1', text: 'Review Data Structures submissions', done: false, route: 'assignments' },
      { id: 't2', text: 'Prepare Unit II question paper', done: false, route: 'assessments' },
      { id: 't3', text: 'Share Python revision notes', done: true, route: 'materials' }
    ],
    notificationsRead: false
  };
}
