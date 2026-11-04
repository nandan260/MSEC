import React, { useState } from 'react';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import DashboardHome from './components/Dashboard/DashboardHome';
import AuthScreen from './components/Auth/AuthScreen';
import { clearAuth } from './api';
import {
  AcademicPerformanceView,
  AttendanceView,
  AttendanceCalculatorView,
  TimetableView,
  AssignmentsView,
  NotesView,
  ExaminationsView,
  GpaCalculatorView,
  StudentProfileView,
  PlacementsView,
  ProjectsView,
  EventsView,
  LibraryView,
  CampusServicesView,
  NotificationsView,
  PerformanceAnalyticsView,
  FacultyDoubtPortalView
} from './components/Modules/ModuleViews';
import FacultyMentorView from './components/Modules/FacultyMentorView';
import FeesManagementView from './components/Modules/FeesManagementView';

const STUDENT_PROFILE = {
  name: 'Alex Kumar',
  identifier: '1MS21CS084',
  role: 'student',
  department: 'Computer Science & Engineering',
  semester: 6
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(STUDENT_PROFILE);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTitle, setActiveTitle] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
  };

  const handleSelectTab = (tabId, label) => {
    setActiveTab(tabId);
    setActiveTitle(label);
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(user) => {
      setCurrentUser(user);
      setActiveTab('dashboard');
      setActiveTitle('Dashboard');
    }} />;
  }

  const renderActiveView = () => {
    const role = currentUser.role;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onNavigate={handleSelectTab} userRole={role} />;
      case 'academics':
        return <AcademicPerformanceView userRole={role} />;
      case 'attendance':
        return <AttendanceView userRole={role} />;
      case 'attendance_calc':
        return <AttendanceCalculatorView userRole={role} />;
      case 'timetable':
        return <TimetableView userRole={role} />;
      case 'assignments':
        return <AssignmentsView userRole={role} />;
      case 'notes':
        return <NotesView userRole={role} />;
      case 'examinations':
        return <ExaminationsView userRole={role} />;
      case 'gpa_calc':
        return <GpaCalculatorView userRole={role} />;
      case 'profile':
        return <StudentProfileView userRole={role} />;
      case 'placements':
        return <PlacementsView userRole={role} />;
      case 'projects':
        return <ProjectsView userRole={role} />;
      case 'events':
        return <EventsView userRole={role} />;
      case 'library':
        return <LibraryView userRole={role} />;
      case 'services':
        return <CampusServicesView userRole={role} />;
      case 'notifications':
        return <NotificationsView userRole={role} />;
      case 'analytics':
        return <PerformanceAnalyticsView userRole={role} />;
      case 'doubts':
        return <FacultyDoubtPortalView userRole={role} />;
      case 'faculty_mentor':
        return <FacultyMentorView userRole={role} currentUser={currentUser} />;
      case 'fees':
        return <FeesManagementView userRole={role} currentUser={currentUser} />;
      default:
        return <DashboardHome onNavigate={handleSelectTab} userRole={role} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main-wrapper">
        <Navbar
          user={currentUser}
          activeTitle={activeTitle}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
        />
        <main className="content-area">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
