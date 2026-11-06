import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/Shell/TopBar';
import BottomTabs from './components/Shell/BottomTabs';
import MoreScreen from './components/Shell/MoreScreen';
import './components/Shell/shell.css';
import AuthScreen from './screens/AuthScreen';
import SCREEN_COMPONENTS from './screens/index.js';
import { SCREENS, tabFor, pushScreen, popScreen } from './nav';
import { clearAuth } from './api';

const STUDENT_PROFILE = {
  name: 'Alex Kumar',
  identifier: '1MS21CS084',
  role: 'student',
  department: 'Computer Science & Engineering',
  semester: 6
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(STUDENT_PROFILE);
  const [stack, setStack] = useState(['dashboard']);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const navigate = useCallback((id) => {
    const next = pushScreen(stackRef.current, id);
    stackRef.current = next;
    setStack(next);
  }, []);

  const goBack = useCallback(() => {
    const { stack: next, exit } = popScreen(stackRef.current);
    if (!exit) {
      stackRef.current = next;
      setStack(next);
    }
    return exit;
  }, []);

  useEffect(() => {
    window.__msecNav = { navigate, goBack };
    return () => { delete window.__msecNav; };
  }, [navigate, goBack]);

  const handleLogout = () => {
    clearAuth();
    stackRef.current = ['dashboard'];
    setStack(['dashboard']);
    setCurrentUser(null);
  };

  // QA-only hook: ?screen=auth renders the auth screen. Excluded from the APK (mode android).
  const forceAuth = import.meta.env.MODE !== 'android'
    && new URLSearchParams(window.location.search).get('screen') === 'auth';

  if (!currentUser || forceAuth) {
    return <AuthScreen onLoginSuccess={(user) => {
      setCurrentUser(user);
      setStack(['dashboard']);
      if (forceAuth) window.history.replaceState(null, '', window.location.pathname);
    }} />;
  }

  const activeId = stack[stack.length - 1];
  const role = currentUser.role;

  const renderActiveView = () => {
    if (activeId === 'more') {
      return <MoreScreen onOpen={navigate} onLogout={handleLogout} />;
    }
    const Screen = SCREEN_COMPONENTS[activeId] || SCREEN_COMPONENTS.dashboard;
    if (activeId === 'dashboard') {
      return <Screen onNavigate={(id) => navigate(id)} userRole={role} />;
    }
    return <Screen userRole={role} currentUser={currentUser} onNavigate={navigate} />;
  };

  return (
    <>
      <TopBar
        title={SCREENS[activeId] ? SCREENS[activeId].label : 'Dashboard'}
        user={currentUser}
        unread={false}
        onBell={() => navigate('notifications')}
        onAvatar={() => navigate('profile')}
      />
      <main className="page app-main">{renderActiveView()}</main>
      <BottomTabs active={tabFor(activeId)} onSelect={navigate} />
    </>
  );
}
