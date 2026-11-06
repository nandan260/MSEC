# Connected teacher assistant

User requests implementation of a powerful assistant rather than further naming/proposals. Proceed with a configurable model connection; no credentials exist in environment. Reuse TypeScript frontend/backend and MSEC tokens. Work in existing feature checkout; other student changes stay untouched.

## Behavior
Chat supports follow-up conversation, dashboard-wide discovery and navigation, grounded student score/attendance/submission insights, explain-with-diagram lessons, quizzes, summaries of pasted/uploaded text, YouTube resources, real PPTX and XLSX downloads. Proactive student support cards derive from current browser records and open existing student dialogs. Navigation uses allowlisted routes and explicit clickable actions. No marks are changed by AI.

Model operates server-side using LangGraph model/tool loop with a bounded tool budget. Keys remain environment-only. Context comes from the existing browser records, clearly labeled browser snapshot/sample academic percentages. Never invent student scores, video URLs, or transcript summaries. YouTube search uses API when configured, otherwise clearly labeled YouTube search URLs. Summarization accepts supplied text, never claims to watch inaccessible videos.

Chat UI has scrollable transcript, pinned composer, tool activity, suggested tasks, lesson/diagram cards, resource links and exports. Mobile remains usable at 390px. No model configured or unavailable produces honest actionable setup/error states and retains input; record search/alerts remain usable. Structured model content is rendered through escaping and bounded SVG, never raw HTML or executable Mermaid.

## Architecture contract
GET /assistant/status -> {configured:boolean,model:string,tools:{youtube:boolean,web:boolean}}
POST /assistant/chat body {messages:Array<{role:'user'|'assistant',content:string}>,context:AppState,currentRoute:string,attachment?:{name:string,text:string}} -> {message:string,actions:Action[],cards:Card[],trace:string[],warnings:string[]}
Action = {type:'navigate',route:string,label:string} | {type:'student',id:string,label:string}
Card students = {kind:'students',title:string,rows:Array<{id:string,name:string,roll:string,score:number,attendance:number,trend:number,className:string,missing:number}>}
Card lesson = {kind:'lesson',title:string,summary:string,sections:Array<{title:string,body:string}>,diagram?:{nodes:Array<{id:string,label:string}>,edges:Array<{from:string,to:string,label?:string}>},slides:Array<{title:string,bullets:string[],notes?:string}>,quiz?:Array<{question:string,answer:string}>}
Card resources = {kind:'resources',title:string,items:Array<{title:string,url:string,description?:string}>,verified:boolean}
POST /assistant/export body {format:'xlsx'|'pptx',context:AppState,lesson?:lesson-card,studentIds?:string[]} -> binary file with appropriate MIME and Content-Disposition.
All errors JSON {error:string}; validation=400, model unavailable=503, upstream failure=502.
Public requests go via existing /api proxy. Frontend /api/assistant/...; backend /assistant/....

## Alternatives and decisions
Cloud-only blocks local providers; local-only requires a running model. Choose configurable OpenAI-compatible API with server-only AI_BASE_URL, AI_MODEL and AI_API_KEY, supporting hosted tool-capable models and local compatible endpoints. LangGraph orchestrates actual model/tool turns. PptxGenJS produces slides, ExcelJS produces typed workbook cells. Tools query actual snapshot, not model-generated records.

## Limits
No school database/authentication exists. This implementation does not claim institution-wide synchronized records or live deployed model verification without credentials. Text uploads only; unsupported binary/PDF files show clear error. Alerts are in-app derived insights, not background external notifications. No arbitrary shell/browser tools.
