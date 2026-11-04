# College Student Management Portal

A full-stack College Student Management Portal built with **React.js**, **Python Flask**, and **SQLite**.

---

## Technology Stack

- **Frontend**: React.js (Vite), Modular Components, Clean Light Theme, Responsive CSS.
- **Backend**: Python Flask REST API, CORS enabled.
- **Database**: SQLite (`student_portal.db`), initialized and seeded automatically.
- **API Communication**: Fetch API client connecting React frontend to Flask endpoints.

---

## Features & Navigation

Direct access to the student dashboard with a professional sidebar:

1. **Dashboard (Home)**:
   - Student Name, USN, Department, Semester
   - Overall Attendance Percentage (with eligibility badge)
   - Current SGPA & CGPA
   - Upcoming Examinations Table
   - Pending Assignments Table with interactive submission
   - Recent Announcements Feed
2. **Academic Performance**: Subject-wise CIE, SEE marks, and grades
3. **Attendance**: Course-level hours attended, totals, and percentage
4. **Attendance Calculator**: Interactive calculator for safe bunks or needed classes
5. **Timetable**: Day-wise lecture schedule with room and faculty details
6. **Assignments**: Assignment tracker with functional submission actions
7. **Notes & Study Materials**: Course documents with working download actions
8. **Examinations**: Exam schedule table and printable hall ticket
9. **SGPA & CGPA Calculator**: Editable course rows to project expected grades
10. **Student Profile**: Student academic records and emergency contact update form
11. **Placement & Career**: Active campus drives with apply actions
12. **Projects Hub**: Capstone and research projects with project registration
13. **Events & Clubs**: Symposiums and hackathons with registration
14. **Library**: Borrowed textbooks with due dates and loan renewal
15. **Campus Services**: Shuttle bus transit status and cafeteria dining information
16. **Notifications**: Institutional announcements and circulars
17. **Performance Analytics**: Semester SGPA progression and subject mastery tables
18. **Faculty Doubt Portal**: Interactive student-faculty Q&A submission

---

## Quick Start Guide

### 1. Start the Flask Backend
```bash
cd backend
python app.py
```
Backend runs at `http://localhost:5000`.

### 2. Run the React Frontend (Development Mode)
In a new terminal:
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:3000` (auto-proxies `/api` to Flask).

*Alternatively, Flask serves the built React app directly at `http://localhost:5000`.*
