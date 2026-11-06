import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../dist/model.js';
import { insights, safeRoute, safeResourceURL, renderCard, snapshot } from '../dist/assistant.js';

test('support insights derive missing work and actual saved marks including zero', () => {
 const s = seedData(); s.assignments = [{id:'a',classId:s.students[0].classId,title:'A',due:'2000-01-01',status:'Published',maxMarks:20,description:'',files:[]}];
 s.submissions = [{id:'x',assignmentId:'a',studentId:s.students[0].id,marks:0,text:'',status:'Graded'}];
 const rows = insights(s); const first = rows.find(r=>r.id===s.students[0].id)!;
 assert.equal(first.missing,0); assert.deepEqual(first.grades,[{title:'A',marks:0,maxMarks:20}]);
 assert.equal(rows.find(r=>r.id===s.students.find(x=>x.classId===s.students[0].classId && x.id!==first.id)!.id)!.missing,1);
 s.assignments[0].status='Draft'; assert.equal(insights(s)[0].missing,0);
});
test('navigation and resource links allow only explicit safe destinations', () => {
 assert.equal(safeRoute('attendance'),'attendance');
 for(const s of ['javascript:alert(1)','//evil.com','students?x=1','__proto__']) assert.equal(safeRoute(s),null);
 assert.equal(safeResourceURL('https://www.youtube.com/watch?v=abc'),'https://www.youtube.com/watch?v=abc');
 for(const s of ['javascript:alert(1)','https://youtube.com.evil.test/x','http://youtube.com/x','https://user:pass@youtube.com/x']) assert.equal(safeResourceURL(s),null);
});
test('model cards escape markup and bounded diagrams never accept raw SVG', () => {
 const card:any={kind:'lesson',title:'<img src=x onerror=alert(1)>',summary:'<script>bad</script>',sections:[],slides:[],diagram:{nodes:[{id:'x',label:'</text><script>x</script>'}],edges:[]}};
 const html=renderCard(card,0); assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('role="img"'));
 card.diagram.nodes=Array.from({length:100},(_,i)=>({id:String(i),label:'node'})); assert.ok((renderCard(card,0).match(/<rect /g)||[]).length<=24);
 assert.ok(!renderCard({kind:'resources',title:'x',verified:false,items:[{title:'bad',url:'javascript:alert(1)'}]} as any,0).includes('href='));
});
test('snapshot excludes contact details but preserves real grade values',()=>{
 const s=seedData(); const data=JSON.stringify(snapshot(s)); assert.ok(!data.includes(s.profile.email)); assert.ok(!data.includes(s.students[0].email));
 assert.equal(snapshot(s).submissions[0].marks,s.submissions[0].marks);
});

test('attachment limit and in-flight source remain consistent; failed transport updates status', async()=>{
 const {bindAssistant,assistantView}=await import('../dist/assistant.js');
 const listeners:Record<string,Function>={};
 const originalDocument=globalThis.document, originalFetch=globalThis.fetch;
 const s=seedData();
 const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 let finish:(response:Response)=>void=()=>{};
 const requests:any[]=[];
 try {
 globalThis.document={addEventListener:(name:string,fn:Function)=>listeners[name]=fn,querySelector:()=>null} as any;
 globalThis.fetch=async (url:any,options:any)=>{
   if(String(url).endsWith('/status'))return requests.length>=3?Response.json({error:'Backend unreachable'},{status:503}):Response.json({configured:true,model:'test',tools:{}});
   requests.push(JSON.parse(options.body));
   if(requests.length===1)return await new Promise<Response>(resolve=>finish=resolve);
   if(requests.length===3)return Response.json({error:'Backend unreachable'},{status:503});
   throw new TypeError('Failed to fetch');
 };
 bindAssistant(()=>s,()=>{});await tick();
 await listeners.change({target:{id:'assistant-file',files:[new File(['x'.repeat(100001)],'oversize.txt')]}});
 assert.ok(assistantView(s).includes('up to 100 KB'));
 await listeners.change({target:{id:'assistant-file',files:[new File(['λ'.repeat(50000)],'source.txt')]}});
 listeners.input({target:{id:'assistant-input',value:'Summarize this'}});
 listeners.submit({target:{id:'assistant-form'},preventDefault(){}});
 await tick();
 assert.equal(new TextEncoder().encode(requests[0].attachment.text).length,100000);
 assert.ok(assistantView(s).includes('aria-label="Remove attachment" disabled'));
 listeners.click({target:{closest:()=>({dataset:{assistant:'remove-file'}})},preventDefault(){}});
 finish(Response.json({message:'Summary',cards:[],actions:[],trace:[],warnings:[]}));await tick();
 listeners.input({target:{id:'assistant-input',value:'Explain the source again'}});
 listeners.submit({target:{id:'assistant-form'},preventDefault(){}});await tick();
 assert.ok(requests[1].messages[0].content.includes('Attached source (source.txt):'));
 assert.ok(requests[1].messages[0].content.includes('λλλ'));
 assert.ok(assistantView(s).includes('Server unreachable'));
 assert.ok(assistantView(s).includes('Explain the source again'));
 listeners.click({target:{closest:()=>({dataset:{assistant:'retry'}})},preventDefault(){}});await tick();
 assert.ok(assistantView(s).includes('Connected'));
 listeners.submit({target:{id:'assistant-form'},preventDefault(){}});await tick();
 assert.ok(assistantView(s).includes('Server unreachable'));
 assert.ok(assistantView(s).includes('Explain the source again'));
 } finally {globalThis.document=originalDocument;globalThis.fetch=originalFetch;}
});

test('student notification entries separate sample support flags from actual saved grades',async()=>{
 const {studentNotifications}=await import('../dist/assistant.js');
 const s=seedData();s.students=s.students.slice(0,2);
 s.students[0].score=45;s.students[0].attendance=70;s.students[0].trend=-3;
 s.students[1].score=90;s.students[1].attendance=95;s.students[1].trend=2;
 s.assignments=[{id:'notify-a',classId:s.students[0].classId,title:'Trees',due:'2000-01-01',status:'Published',maxMarks:20,description:'',files:[]}];
 s.submissions=[{id:'notify-sub',assignmentId:'notify-a',studentId:s.students[0].id,marks:0,text:'',status:'Graded'}];
 const entries=studentNotifications(s);
 const support=entries.find(x=>x.studentId===s.students[0].id&&x.kind==='support')!;
 assert.ok(support.detail.includes('Sample score 45%'));assert.ok(support.detail.includes('sample attendance 70%'));assert.ok(support.detail.includes('Declining trend -3'));
 const grade=entries.find(x=>x.studentId===s.students[0].id&&x.kind==='grade')!;
 assert.equal(grade.detail,'Trees · Actual saved marks: 0/20');assert.ok(!grade.detail.includes('45'));
 const other=entries.filter(x=>x.studentId===s.students[1].id);
 assert.ok(!other.some(x=>x.kind==='grade'));
 if(s.students[1].classId===s.students[0].classId)assert.ok(other[0].detail.includes('1 overdue missing'));
 s.submissions=[];assert.ok(!studentNotifications(s).some(x=>x.kind==='grade'));
});

 test('large student cards disclose preview limit without discarding export selection',()=>{
 const rows=Array.from({length:105},(_,i)=>({id:'s'+i,name:'Student '+i,roll:String(i),score:70,attendance:80,trend:0,className:'CSE',missing:0}));
 const html=renderCard({kind:'students',title:'All students',rows},0);
 assert.ok(html.includes('Showing 100 of 105 students'));
 assert.equal((html.match(/data-action="student-detail"/g)||[]).length,100);
 assert.equal(rows.length,105);
 });

test('message formatting is readable while restricting links and preserving code literally',async()=>{
 const {formatMessage}=await import('../dist/assistant.js');
 const html=formatMessage('**Academic Score:** 64% <img src=x onerror=alert(1)> [Bad](javascript:alert(1)) [Invented](/navigate?route=students) [Students](#students) [Video](https://www.youtube.com/watch?v=abc)');
 assert.ok(html.includes('<strong>Academic Score:</strong>'));
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('href="/navigate'));
 assert.ok(html.includes('href="#students"'));assert.ok(!html.includes('href="https://www.youtube.com/watch?v=abc"'));
 const code=formatMessage('`**literal** <script>`\n```js\n**also literal** [bad](javascript:x) <img>\n```');
 assert.ok(code.includes('<code>**literal** &lt;script&gt;</code>'));
 assert.ok(code.includes('<pre><code>**also literal** [bad](javascript:x) &lt;img&gt;'));
 assert.ok(!code.includes('<strong>'));assert.ok(!code.includes('<a '));
});

test('directed lesson diagrams put BST parents above children and bound cyclic graphs',()=>{
 const lesson:any={kind:'lesson',title:'BST',summary:'',sections:[],slides:[],diagram:{nodes:[{id:'8',label:'8'},{id:'3',label:'3'},{id:'10',label:'10'}],edges:[{from:'8',to:'3'},{from:'8',to:'10'}]}};
 const html=renderCard(lesson,0);
 const y=[...html.matchAll(/<rect x="[^"]+" y="([^"]+)"/g)].map(x=>Number(x[1]));
 assert.equal(y.length,3);assert.ok(y[0]<y[1]&&y[0]<y[2]);assert.equal((html.match(/<polygon /g)||[]).length,2);
 lesson.diagram.edges=[{from:'8',to:'3'},{from:'3',to:'10'},{from:'10',to:'8'}];
 const cycle=renderCard(lesson,0);assert.ok(cycle.length<10000);assert.ok(!cycle.includes('NaN'));assert.equal((cycle.match(/<rect /g)||[]).length,3);
});

 test('model prose cannot make invented video links clickable without a resource tool',async()=>{
 const {formatMessage}=await import('../dist/assistant.js');
 assert.equal(formatMessage('[Watch](https://youtu.be/FAKEVIDEO01)'), 'Watch');
 });
