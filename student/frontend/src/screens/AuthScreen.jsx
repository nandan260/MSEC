import React, { useState } from 'react';
import './auth.css';
import { apiRequest, setToken, setUser } from '../api';

export default function AuthScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('student@college.edu');
  const [password, setPassword] = useState('student123');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [semester, setSemester] = useState('6');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const payload = {
          email,
          password,
          role,
          name,
          identifier,
          department,
          semester: role === 'student' ? parseInt(semester, 10) : 0
        };
        const data = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToken(data.token);
        setUser(data.user);
        onLoginSuccess(data.user);
      } else {
        const payload = { email, password, role };
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setToken(data.token);
        setUser(data.user);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (demoRole) => {
    setRole(demoRole);
    if (demoRole === 'student') {
      setEmail('student@college.edu');
      setPassword('student123');
    } else if (demoRole === 'faculty') {
      setEmail('faculty@college.edu');
      setPassword('faculty123');
    } else if (demoRole === 'admin') {
      setEmail('admin@college.edu');
      setPassword('admin123');
    }
  };

  return (
    <div className="auth-screen" data-qa="auth-screen">
      <div className="auth-screen__card card">
        <div className="auth-screen__brand">
          <img className="auth-screen__emblem" src="/favicon.svg" alt="" width="56" height="56" />
          <h1 className="auth-screen__title">MS Engineering College</h1>
          <p className="auth-screen__sub">Student Management System</p>
        </div>

        <div className="auth-screen__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`auth-screen__tab ${!isRegister ? 'is-active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`auth-screen__tab ${isRegister ? 'is-active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            New Registration
          </button>
        </div>

        {error && <div className="auth-screen__error" role="alert">{error}</div>}

        <form className="auth-screen__form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="field">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div className="field">
                <label htmlFor="auth-usn">University Seat Number (USN)</label>
                <input
                  id="auth-usn"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 1MS21CS084"
                />
              </div>

              <div className="field">
                <label htmlFor="auth-dept">Department</label>
                <select
                  id="auth-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Science & Engineering">Information Science & Engineering</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>

              {role === 'student' && (
                <div className="field">
                  <label htmlFor="auth-sem">Current Semester</label>
                  <select
                    id="auth-sem"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="field">
            <label htmlFor="auth-email">Institutional Email</label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@college.edu"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button type="submit" className="btn btn-primary auth-screen__submit" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        {!isRegister && (
          <div className="auth-screen__demo">
            <strong>Quick Demo Sign In</strong>
            <button type="button" className="btn" onClick={() => setDemoUser('student')}>
              Student Demo (Alex Kumar)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
