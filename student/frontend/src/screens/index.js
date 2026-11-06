// Screen id -> component. Re-exports the current module files until each screen moves.
import DashboardHome from './DashboardScreen';
import AttendanceView from './AttendanceScreen';
import AttendanceCalculatorView from './AttendanceCalculatorScreen';
import AcademicPerformanceView from './AcademicsScreen';
import TimetableView from './TimetableScreen';
import AssignmentsView from './AssignmentsScreen';
import NotesView from './NotesScreen';
import ExaminationsView from './ExaminationsScreen';
import GpaCalculatorView from './GpaCalculatorScreen';
import PerformanceAnalyticsView from './PerformanceAnalyticsScreen';
import {
  StudentProfileView,
  PlacementsView,
  ProjectsView,
  EventsView,
  LibraryView,
  CampusServicesView,
  NotificationsView,
  FacultyDoubtPortalView,
} from '../components/Modules/ModuleViews';
import FacultyMentorView from '../components/Modules/FacultyMentorView';
import FeesManagementView from '../components/Modules/FeesManagementView';

const SCREEN_COMPONENTS = {
  dashboard: DashboardHome,
  academics: AcademicPerformanceView,
  attendance: AttendanceView,
  attendance_calc: AttendanceCalculatorView,
  timetable: TimetableView,
  assignments: AssignmentsView,
  notes: NotesView,
  examinations: ExaminationsView,
  gpa_calc: GpaCalculatorView,
  profile: StudentProfileView,
  placements: PlacementsView,
  projects: ProjectsView,
  events: EventsView,
  library: LibraryView,
  services: CampusServicesView,
  notifications: NotificationsView,
  analytics: PerformanceAnalyticsView,
  doubts: FacultyDoubtPortalView,
  faculty_mentor: FacultyMentorView,
  fees: FeesManagementView,
};

export default SCREEN_COMPONENTS;
