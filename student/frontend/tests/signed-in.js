// Seeds a stored session so App renders signed in.
export const ALEX = {
  id: 1, email: 'student@college.edu', role: 'student', name: 'Alex Kumar',
  identifier: '1MS21CS084', department: 'Computer Science & Engineering', semester: 6, has_password: true,
};

export function signIn(user = ALEX) {
  localStorage.setItem('auth_token', 'test-token');
  localStorage.setItem('auth_user', JSON.stringify(user));
}
