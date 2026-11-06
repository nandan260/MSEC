import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import JSZip from '../../backend/node_modules/jszip/lib/index.js';

const frontend=fileURLToPath(new URL('../',import.meta.url));
const backend=fileURLToPath(new URL('../../backend/',import.meta.url));
let fail=false;
const lesson={title:'Binary search trees',summary:'A tree where smaller values go left and larger values go right.',sections:[{title:'Worked example',body:'Insert 8, then 3, then 10. 3 becomes the left child of 8; 10 becomes the right child.'}],diagram:{nodes:[{id:'root',label:'8 · root'},{id:'left',label:'3 · smaller'},{id:'right',label:'10 · larger'}],edges:[{from:'root',to:'left',label:'less than'},{from:'root',to:'right',label:'greater than'}]},slides:[{title:'What is a BST?',bullets:['Each node has up to two children.','Smaller keys go left; larger keys go right.']},{title:'Practice',bullets:['Insert 8, 3, and 10.','Draw the resulting tree.']}],quiz:[{question:'Where does 3 go relative to 8?',answer:'To the left, because 3 is smaller than 8.'}]};
const provider=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk;
 const body=JSON.parse(raw),last=body.messages.at(-1),user=[...body.messages].reverse().find(x=>x.role==='user')?.content||'';
 res.setHeader('Content-Type','application/json');
 if(fail){res.writeHead(500);res.end(JSON.stringify({error:{message:'Test upstream unavailable'}}));return;}
 let message;
 if(last.role==='tool')message={role:'assistant',content:'I used your saved browser records and tools. Review the results below.'};
 else if(/visual|slides|trees/i.test(user))message={role:'assistant',content:null,tool_calls:[{id:'call_lesson',type:'function',function:{name:'create_lesson',arguments:JSON.stringify(lesson)}}]};
 else if(/attendance/i.test(user))message={role:'assistant',content:null,tool_calls:[{id:'call_route',type:'function',function:{name:'navigate',arguments:'{"route":"attendance"}'}}]};
 else if(/youtube/i.test(user))message={role:'assistant',content:null,tool_calls:[{id:'call_video',type:'function',function:{name:'youtube_resources',arguments:'{"query":"binary search trees tutorial"}'}}]};
 else message={role:'assistant',content:null,tool_calls:[{id:'call_students',type:'function',function:{name:'student_insights',arguments:'{}'}}]};
 res.end(JSON.stringify({id:'test-only',choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}]}));
});
await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));
const providerPort=provider.address().port;
const processes=[];let browser;
function child(cmd,args,cwd,env){const p=spawn(cmd,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});processes.push(p);p.stderr.on('data',d=>process.stderr.write(d));return p;}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error(`Server not ready: ${url}`);}
try {
 child('node',['dist/index.js'],backend,{PORT:'18081',AI_BASE_URL:`http://127.0.0.1:${providerPort}/v1`,AI_MODEL:'test-model',AI_API_KEY:'test-key',YOUTUBE_API_KEY:''});
 child('python3',['scripts/dev-server.py','--port','14173'],frontend,{TEACHER_BACKEND_URL:'http://127.0.0.1:18081'});
 await ready('http://127.0.0.1:18081/health');await ready('http://127.0.0.1:14173');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome-stable',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:14173/#ai');
 await page.locator('.assistant-status.connected').waitFor();await page.locator('#msec-sp-root').waitFor({state:'detached',timeout:20000});
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 assert(await page.locator('#dialog button[data-action="student-detail"]').count()>0,'Bell includes student support and saved grade entries');
 await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 const send=async text=>{await page.locator('#assistant-input').fill(text);await page.locator('#assistant-form button[type="submit"]').click();await page.locator('.assistant-working').waitFor({state:'detached'});assert.equal(await page.locator('#assistant-error').innerText(),'');};
 await send('Show student spreadsheet');
 assert.equal(await page.locator('.assistant-card .assistant-student').count(),26);
 await page.locator('.assistant-card .assistant-student').first().click();assert(await page.getByRole('dialog').isVisible());await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 const excelEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download spreadsheet',exact:true}).click();const excel=await excelEvent;const excelZip=await JSZip.loadAsync(await (await import('node:fs/promises')).readFile(await excel.path()));
 assert(excelZip.file('xl/workbook.xml'));assert.match(await excelZip.file('xl/workbook.xml').async('string'),/Saved grades/);assert.match(await excelZip.file('xl/workbook.xml').async('string'),/Attendance/);assert((await excelZip.file('xl/worksheets/sheet1.xml').async('string')).includes('26')||(await excelZip.file('xl/sharedStrings.xml').async('string')).includes('Aditya'));
 await send('Explain binary search trees visually with slides');
 assert.equal(await page.locator('.assistant-diagram svg rect').count(),3);assert(await page.getByText('Worked example',{exact:true}).isVisible());
 const pptEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download PowerPoint',exact:true}).click();const ppt=await pptEvent;const pptZip=await JSZip.loadAsync(await (await import('node:fs/promises')).readFile(await ppt.path()));assert(pptZip.file('ppt/presentation.xml'));assert(pptZip.file('ppt/slides/slide2.xml'));
 await send('Find YouTube resources');assert(await page.locator('.assistant-resource').last().getAttribute('href').then(x=>x.startsWith('https://www.youtube.com/results?')));
 await send('Open attendance');await page.locator('.assistant-actions a[href="#attendance"]').click();await page.getByRole('heading',{name:'Attendance',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:14173/#ai');await page.locator('#assistant-input').waitFor();assert.equal(await page.locator('.assistant-diagram svg rect').count(),3,'Chat survives navigation');
 fail=true;await page.locator('#assistant-input').fill('Keep this message');await page.locator('#assistant-form button[type="submit"]').click();await page.locator('#assistant-error').filter({hasText:/./}).waitFor();assert.equal(await page.locator('#assistant-input').inputValue(),'Keep this message');fail=false;
 await page.locator('#assistant-file').setInputFiles({name:'lesson.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a text file')});assert.match(await page.locator('#assistant-error').innerText(),/not supported|Attach a TXT/);
 await mkdir(`${frontend}/artifacts`,{recursive:true});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  await page.setViewportSize(viewport);await page.waitForTimeout(300);
  const layout=await page.evaluate(()=>{const t=document.querySelector('#assistant-input').getBoundingClientRect();return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,inputBottom:t.bottom,inputWidth:t.width};});
  assert(layout.width<=viewport.width+1,'No horizontal page overflow');assert(layout.height<=viewport.height+1,'No vertical page overflow');assert(layout.inputBottom<=viewport.height,'Composer visible');assert(layout.inputWidth>180,'Composer usable');
  await page.screenshot({path:`${frontend}/artifacts/assistant-${viewport.width}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS assistant E2E: model/tool roundtrip, 26 student records, student dialog, navigation, diagrams, YouTube search, PPTX/XLSX ZIPs, retained input on failure, file validation, desktop/mobile layout, zero runtime errors.');
} finally {if(browser)await browser.close();for(const p of processes)p.kill('SIGTERM');provider.closeAllConnections();provider.close();}
