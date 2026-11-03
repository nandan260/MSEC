import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData, saveAttendance, gradeSubmission, toCSV, atRisk} from '../dist/model.js';
test('saving same class and date updates attendance instead of duplicating',()=>{const s=seedData();saveAttendance(s,'c1','2026-11-03',{s1:'Present'});saveAttendance(s,'c1','2026-11-03',{s1:'Absent'});assert.equal(s.attendance.filter(x=>x.classId==='c1'&&x.date==='2026-11-03').length,1);assert.equal(s.attendance.find(x=>x.date==='2026-11-03').records.s1,'Absent');});
test('grades require finite marks within assignment maximum',()=>{const s=seedData(); for(const value of ['', ' ', -1, 101, 'bad']) assert.throws(()=>gradeSubmission(s,'sub1',value));gradeSubmission(s,'sub1','0');assert.equal(s.submissions[0].marks,0);gradeSubmission(s,'sub1',88);assert.equal(s.submissions[0].marks,88);});
test('CSV quotes delimiters and neutralizes spreadsheet formulas',()=>{assert.equal(toCSV([['Name','Value'],['A, B','=SUM(1)']]),'"Name","Value"\r\n"A, B","\'=SUM(1)"');});
test('risk includes weak scores or low attendance',()=>{assert.equal(atRisk({score:58,attendance:95}),true);assert.equal(atRisk({score:90,attendance:70}),true);assert.equal(atRisk({score:90,attendance:95}),false);});
test('text-only resources do not require IndexedDB',async()=>{const {storeFiles}=await import('../dist/files.js');assert.deepEqual(await storeFiles([]),[]);});
