import React, { useState } from 'react';
import { apiRequest, setToken, setUser } from '../../api';

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>COLLEGE PORTAL</h1>
          <p>Student Management System</p>
        </div>

        <div className="auth-body">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${!isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(false); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(true); setError(''); }}
            >
              New Registration
            </button>
          </div>

          {error && <div className="alert-box alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>

            {isRegister && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="form-group">
                  <label>University Seat Number (USN)</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 1MS21CS084"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select
                    className="form-select"
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
                  <div className="form-group">
                    <label>Current Semester</label>
                    <select
                      className="form-select"
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

            <div className="form-group">
              <label>Institutional Email</label>
              <input
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}
            </button>
          </form>

          {!isRegister && (
            <div className="demo-credentials-box">
              <strong>Quick Demo Sign In:</strong>
              <div className="demo-btn-row">
                <button type="button" className="demo-btn" onClick={() => setDemoUser('student')}>
                  Student Demo (Alex Kumar)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
