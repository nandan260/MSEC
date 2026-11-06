import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/Shell/TopBar';
import BottomTabs from './components/Shell/BottomTabs';
import MoreScreen from './components/Shell/MoreScreen';
import './components/Shell/shell.css';
import AuthScreen from './screens/AuthScreen';
import SCREEN_COMPONENTS from './screens/index.js';
import { SCREENS, TABS, tabFor, pushScreen, popScreen } from './nav';
import { clearAuth, getUser } from './api';
import { useOnline } from './useOnline';
import { NotFoundScreen, OfflineScreen, OFFLINE_ENDPOINTS } from './screens/MobileStates';
import './screens/mobile-reference.css';
import './theme/responsive.css';

const STUDENT_PROFILE = {
  name: 'Alex Kumar',
  identifier: '1MS21CS084',
  role: 'student',
  department: 'Computer Science & Engineering',
  semester: 6
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getUser() || STUDENT_PROFILE);
  const [stack, setStack] = useState(['dashboard']);
  const online = useOnline();
  const [showSaved, setShowSaved] = useState(false);
  const [savedEndpoint, setSavedEndpoint] = useState('');
  const [motion, setMotion] = useState('tab');
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const navigate = useCallback((id) => {
    setShowSaved(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const next = pushScreen(stackRef.current, id);
    setMotion(TABS.includes(id) ? 'tab' : 'push');
    stackRef.current = next;
    setStack(next);
  }, []);

  const goBack = useCallback(() => {
    setShowSaved(false);
    const { stack: next, exit } = popScreen(stackRef.current);
    if (!exit) {
      setMotion('pop');
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
  const unknown = !Object.hasOwn(SCREENS, activeId);

  if (unknown) return <NotFoundScreen onNavigate={navigate} onBack={goBack} />;

  const renderActiveView = () => {
    if (activeId === 'more') {
      return <MoreScreen user={currentUser} onOpen={navigate} onLogout={handleLogout} />;
    }
    const Screen = SCREEN_COMPONENTS[activeId] || SCREEN_COMPONENTS.dashboard;
    if (activeId === 'dashboard') {
      return <Screen onNavigate={(id) => navigate(id)} userRole={role} />;
    }
    const params = new URLSearchParams(savedEndpoint.split('?')[1] || '');
    return <Screen userRole={role} currentUser={currentUser} onNavigate={navigate}
      initialView={showSaved ? params.get('view') : undefined}
      initialDay={showSaved ? Number(params.get('day')) || undefined : undefined}
      initialSemester={showSaved ? Number(params.get('semester')) || undefined : undefined} />;
  };

  const isTab = TABS.includes(activeId);
  const MONTH = { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' };
  const headerProps = activeId === 'dashboard'
    ? { variant: 'home', user: currentUser, unread: false,
        onBell: () => navigate('notifications'), onAvatar: () => navigate('profile') }
    : {
        variant: activeId === 'assistant' ? 'ai' : 'page',
        title: activeId === 'academics' ? 'Academics' : SCREENS[activeId].label,
        kicker: activeId === 'timetable' ? new Date().toLocaleDateString('en-GB', MONTH) : undefined,
        onBack: isTab ? undefined : goBack,
      };

  return (
    <>
      <TopBar key={`h-${activeId}`} {...headerProps} />
      <main key={activeId} className={`app-main app-main--${activeId} screen-anim screen-anim--${motion}`}>
        {!online && OFFLINE_ENDPOINTS[activeId] && !showSaved
          ? <OfflineScreen key={activeId} screenId={activeId} onShowSaved={(endpoint) => { setSavedEndpoint(endpoint || ''); setShowSaved(true); }} />
          : renderActiveView()}
      </main>
      <BottomTabs active={tabFor(activeId)} onSelect={navigate} />
    </>
  );
}
