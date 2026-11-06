import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import DataCards from '../components/DataCards';
import ErrorCard from '../components/ErrorCard';
import Sheet from './Sheet';
import { attendanceTone } from './shared';
import './analytics.css';

// Chart geometry. The viewBox is about as wide as a phone card, so the 12px labels render at 12px.
const CHART_W = 300;
const CHART_H = 220;
const PAD_L = 40;
const PAD_R = 20;
const PAD_T = 28;
const PAD_B = 36;
const MIN_Y = 7.0;
const MAX_Y = 10.0;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

export default function PerformanceAnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    return apiRequest('/analytics')
      .then((res) => {
        if (id === requestId.current) setData(res);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  if (error && !data) {
    return (
      <div className="page analytics" data-qa="analytics-screen">
        <ErrorCard error={error} onRetry={load} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="page analytics" data-qa="analytics-screen">
        <div className="empty-state">Calculating academic performance metrics and visual analytics...</div>
      </div>
    );
  }

  // Visual chart coordinates. Values outside 7-10 are pinned to the plot edge so nothing leaves the chart.
  const sgpaList = data.sgpa_history || [];
  const getY = (val) => {
    const v = Math.min(MAX_Y, Math.max(MIN_Y, val));
    return CHART_H - PAD_B - ((v - MIN_Y) / (MAX_Y - MIN_Y)) * PLOT_H;
  };
  const getX = (idx) => PAD_L + (idx / Math.max(1, sgpaList.length - 1)) * PLOT_W;

  const sgpaPoints = sgpaList.map((s, idx) => `${getX(idx)},${getY(s.sgpa)}`).join(' ');
  const cgpaPoints = sgpaList.map((s, idx) => `${getX(idx)},${getY(s.cgpa)}`).join(' ');

  const attTone = data.overall_attendance_pct >= 85 ? 'good' : 'warn';
  const trendTone = data.trend.direction === 'Improvement' ? 'good' : data.trend.direction === 'Decline' ? 'bad' : '';

  return (
    <div className="page analytics" data-qa="analytics-screen">
      {/* Top Level Metric Cards */}
      <div className="stat-grid analytics__stats">
        <div className="stat-tile analytics__stat--lead">
          <strong>{Number(data.current_sgpa).toFixed(2)}</strong>
          <span>Current semester SGPA (Semester 6)</span>
        </div>
        <div className="stat-tile analytics__stat--lead">
          <strong>{Number(data.cumulative_cgpa).toFixed(2)}</strong>
          <span>Cumulative CGPA</span>
        </div>
        <div className="stat-tile">
          <strong className={`analytics__tone--${attTone}`}>{data.overall_attendance_pct}%</strong>
          <span>Lecture attendance (min 75%)</span>
        </div>
        <div className="stat-tile">
          <strong>{data.overall_marks_avg}%</strong>
          <span>Score average: {data.academic_standing}</span>
        </div>
      </div>

      {/* Improvement / Trend Diagnosis */}
      <div className="card analytics__trend">
        <div className="analytics__trend-head">
          <span className={`pill${trendTone ? ` pill--${trendTone}` : ''}`}>{data.trend.direction.toUpperCase()}</span>
          <span>{data.trend.label}</span>
        </div>
        <p className="analytics__note">
          Degree Standing: <strong>{data.academic_standing}</strong> | Total Completed Credits: <strong>128</strong>
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setShowReportModal(true)}>
          Generate Academic Performance Report
        </button>
      </div>

      {/* GRAPH 1: SEMESTER SGPA & CGPA PROGRESSION (SVG CHART) */}
      <div className="card analytics__chart-card">
        <h2 className="section-title">Semester-wise SGPA and Cumulative CGPA Progress</h2>
        <ul className="analytics__legend">
          <li><span className="analytics__swatch analytics__swatch--sgpa" />SGPA</li>
          <li><span className="analytics__swatch analytics__swatch--cgpa" />Cumulative CGPA</li>
          <li><span className="analytics__swatch analytics__swatch--line" />9.0 Distinction</li>
        </ul>
        <svg
          className="analytics__svg"
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          role="img"
          aria-label="SGPA and CGPA progression by semester"
        >
          {/* Horizontal Gridlines */}
          {[7.0, 8.0, 9.0, 10.0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line className={val === 9.0 ? 'analytics__grid--goal' : 'analytics__grid'} x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} />
                <text x={PAD_L - 8} y={y + 4} textAnchor="end">{val.toFixed(1)}</text>
              </g>
            );
          })}

          {/* X-Axis Semester Labels */}
          {sgpaList.map((s, idx) => (
            <text key={idx} className="analytics__x" x={getX(idx)} y={CHART_H - 12} textAnchor="middle">
              {s.semester}
            </text>
          ))}

          <polyline className="analytics__line--sgpa" points={sgpaPoints} />
          <polyline className="analytics__line--cgpa" points={cgpaPoints} />

          {/* Nodes and Values */}
          {sgpaList.map((s, idx) => {
            const x = getX(idx);
            const ySgpa = getY(s.sgpa);
            const yCgpa = getY(s.cgpa);
            return (
              <g key={idx}>
                <circle className="analytics__dot--sgpa" cx={x} cy={ySgpa} r="4.5" />
                <text className="analytics__val" x={x} y={ySgpa - 8} textAnchor="middle">
                  {s.sgpa.toFixed(2)}
                </text>
                <rect className="analytics__dot--cgpa" x={x - 3.5} y={yCgpa - 3.5} width="7" height="7" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* GRAPH 2: SUBJECT-WISE ATTENDANCE COMPARISON */}
      <div className="card analytics__chart-card">
        <div>
          <h2 className="section-title">Subject-wise Attendance Comparison</h2>
          <p className="analytics__note">Markers: 75% mandatory, 85% honors benchmark</p>
        </div>
        <div className="analytics__bars">
          {(data.subject_attendance || []).map((sub, idx) => {
            const tone = attendanceTone(sub.percentage);
            return (
              <div key={idx}>
                <div className="analytics__bar-head">
                  <span className="analytics__bar-name">{sub.code}: {sub.subject}</span>
                  <span className={`analytics__bar-pct analytics__tone--${tone}`}>
                    {sub.percentage}% <small>({sub.attended_classes + sub.od_classes}/{sub.total_classes} hrs)</small>
                  </span>
                </div>
                <div className="analytics__track">
                  <div className={`analytics__fill analytics__fill--${tone}`} style={{ width: `${Math.min(100, sub.percentage)}%` }} />
                  <div className="analytics__mark analytics__mark--75" />
                  <div className="analytics__mark analytics__mark--85" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRAPH 3: SUBJECT MARKS MASTERY */}
      <h2 className="section-title">Subject Marks Mastery (Current Semester)</h2>
      <DataCards
        rows={data.subject_marks || []}
        title={(m) => `${m.code}: ${m.subject}`}
        value={(m) => <span className="pill pill--good">{m.grade}</span>}
        meta={[
          { label: 'Total /100', render: (m) => <strong>{m.total_marks}</strong> },
          { label: 'Internal /30', render: (m) => m.internal_marks },
          { label: 'Lab /20', render: (m) => m.lab_marks },
          { label: 'External /50', render: (m) => m.external_marks },
        ]}
      />

      {/* Low Attendance Action Card */}
      <div className="card analytics__alerts">
        <div className="analytics__card-head">
          <h2 className="section-title">Attendance Risk & Recovery Plan</h2>
          <span className="pill pill--warn">Action Required</span>
        </div>
        {(!data.low_attendance_alerts || data.low_attendance_alerts.length === 0) ? (
          <div className="analytics__alert analytics__alert--good">
            <p>All course registrations comfortably exceed the institutional 85% attendance standard.</p>
          </div>
        ) : (
          data.low_attendance_alerts.map((al, idx) => (
            <div key={idx} className="analytics__alert">
              <div className="analytics__alert-head">
                <span>{al.code}: {al.subject}</span>
                <span>{al.percentage}%</span>
              </div>
              <p>{al.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Marks Improvement Action Card */}
      <div className="card analytics__alerts">
        <div className="analytics__card-head">
          <h2 className="section-title">Academic Marks Improvement Targets</h2>
          <span className="pill">Target &gt; 85%</span>
        </div>
        {(!data.marks_improvement_alerts || data.marks_improvement_alerts.length === 0) ? (
          <div className="analytics__alert analytics__alert--good">
            <p>Outstanding performance across all enrolled theory and laboratory subjects (All scores &ge; 80%).</p>
          </div>
        ) : (
          data.marks_improvement_alerts.map((al, idx) => (
            <div key={idx} className="analytics__alert analytics__alert--warn">
              <div className="analytics__alert-head">
                <span>{al.code}: {al.subject}</span>
                <span>Score: {al.total_marks}/100 ({al.grade})</span>
              </div>
              <p>{al.suggestion}</p>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ACADEMIC PERFORMANCE REPORT */}
      {showReportModal && (
        <Sheet title="Official Academic Performance & Evaluation Report" onClose={() => setShowReportModal(false)}>
          <p className="analytics__report-head">APEX INSTITUTE OF ENGINEERING AND TECHNOLOGY</p>
          <p className="analytics__note">Autonomous Institution | Approved by AICTE & Affiliated to University</p>
          <p className="analytics__report-head">STUDENT ACADEMIC APPRAISAL CARD</p>

          <dl className="data-card-meta analytics__report-meta">
            <div><dt>Student Name</dt><dd>{data.student.name}</dd></div>
            <div><dt>USN</dt><dd>{data.student.usn}</dd></div>
            <div><dt>Department</dt><dd>{data.student.department}</dd></div>
            <div><dt>Semester</dt><dd>Semester {data.student.semester} ({data.student.batch})</dd></div>
            <div><dt>Cumulative CGPA</dt><dd>{Number(data.cumulative_cgpa).toFixed(2)}</dd></div>
            <div><dt>Academic Standing</dt><dd>{data.academic_standing}</dd></div>
          </dl>

          <p className="analytics__report-head">Semester Grade Point History</p>
          <DataCards
            rows={data.sgpa_history || []}
            title={(s) => `Semester ${s.semester}`}
            value={(s) => <strong>{s.sgpa.toFixed(2)}</strong>}
            meta={[
              { label: 'Credits', render: (s) => s.credits },
              { label: 'Grade points', render: (s) => s.grade_points },
              { label: 'CGPA', render: (s) => s.cgpa.toFixed(2) },
            ]}
          />

          <p className="analytics__report-head">Current Semester Subject Assessment</p>
          <DataCards
            rows={data.subject_marks || []}
            title={(m) => `${m.code}: ${m.subject}`}
            value={(m) => m.grade}
            meta={[
              { label: 'Total /100', render: (m) => <strong>{m.total_marks}</strong> },
              { label: 'Internal /30', render: (m) => m.internal_marks + m.lab_marks },
              { label: 'External /50', render: (m) => m.external_marks },
            ]}
          />

          <p className="analytics__endorse">
            <strong>Faculty Advisor Endorsement: </strong>
            Student consistently demonstrates outstanding academic rigor and analytical proficiency. Eligible for honors graduation with continuous distinction track.
          </p>

          <div className="sticky-actions">
            <button type="button" className="btn" onClick={() => setShowReportModal(false)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
