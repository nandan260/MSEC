export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  section: string;
  code: string;
  room: string;
  color: string;
  days: number[];
  time: string;
  students: number;
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  classId: string;
  score: number;
  attendance: number;
  trend: number;
  email: string;
  parent: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceSession {
  classId: string;
  date: string;
  records: Record<string, AttendanceStatus>;
}

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface Assignment {
  id: string;
  title: string;
  classId: string;
  due: string;
  maxMarks: number;
  description: string;
  status: 'Draft' | 'Published' | 'Closed' | string;
  files: StoredFile[];
}

export interface GradeHistory {
  previous: number | null;
  marks: number;
  reason: string;
  date: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  text: string;
  marks: number | null;
  status: 'Submitted' | 'Graded' | string;
  feedback?: string;
  history?: GradeHistory[];
}

export interface PracticeResponse {
  name: string;
  answers: string[];
  date: string;
}

export interface Assessment {
  id: string;
  title: string;
  classId: string;
  date: string;
  maxMarks: number;
  questions: string;
  type: 'Test' | 'Quiz' | string;
  responses?: PracticeResponse[];
}

export interface StudyMaterial {
  id: string;
  title: string;
  classId: string;
  type: string;
  description: string;
  date: string;
  files: StoredFile[];
}

export interface Announcement {
  id: string;
  title: string;
  classId: string;
  body: string;
  date: string;
}

export interface Doubt {
  id: string;
  studentId: string;
  title: string;
  body: string;
  classId: string;
  status: 'Open' | 'Resolved' | string;
  reply: string;
}

export interface ParentMessage {
  id: string;
  studentId: string;
  subject: string;
  body: string;
  date: string;
}

export interface LeaveRequest {
  id: string;
  type: string;
  start: string;
  end: string;
  reason: string;
  substitute?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
}

export interface TeacherTask {
  id: string;
  text: string;
  done: boolean;
  route: string;
}

export interface TeacherProfile {
  name: string;
  email: string;
  department: string;
  phone: string;
  bio: string;
  emailUpdates: boolean;
}

export interface AppState {
  version: number;
  profile: TeacherProfile;
  classes: ClassItem[];
  students: Student[];
  attendance: AttendanceSession[];
  assignments: Assignment[];
  submissions: Submission[];
  assessments: Assessment[];
  materials: StudyMaterial[];
  announcements: Announcement[];
  doubts: Doubt[];
  messages: ParentMessage[];
  leaves: LeaveRequest[];
  tasks: TeacherTask[];
  notificationsRead: boolean;
}

export interface Filters {
  classId: string;
  search: string;
  date: string;
  status: string;
  week: string;
  topic: string;
}
