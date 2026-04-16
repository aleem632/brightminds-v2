// ===== CONFIG =====
const API = "https://9x8r1qewma.execute-api.eu-west-1.amazonaws.com/prod";
const CLAUDE_API = "https://api.anthropic.com/v1/messages";

// ===== NAV =====
const nav = document.getElementById('nav');
if(nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));
function toggleMenu(){ document.getElementById('mobile-menu')?.classList.toggle('open'); }

// ===== HOMEWORK PAGE =====
let questions = [];
let submissions = JSON.parse(localStorage.getItem('bm_subs') || '[]');

async function loadHomework(){
  const grid = document.getElementById('hw-grid');
  if(!grid) return;
  grid.innerHTML = `<div class="empty-state"><div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  try{
    const res = await fetch(`${API}/questions`);
    questions = await res.json();
    if(!questions.length){
      grid.innerHTML = `<div class="empty-state">No homework yet — check back soon!</div>`;
      return;
    }
    grid.innerHTML = questions.map(q => buildHwCard(q)).join('');
  }catch(e){
    grid.innerHTML = `<div class="empty-state" style="color:var(--red)">Could not load homework. Please refresh the page.</div>`;
  }
}

function buildHwCard(q){
  const sub = submissions.find(s => s.questionId === q.id);
  return `<div class="hw-card" id="hwcard-${q.id}">
    <div class="hw-card-head" onclick="toggleHwCard('${q.id}')">
      <div class="hw-card-head-left">
        <span class="hw-card-title">${q.title}</span>
        <span class="badge badge-${q.level || 'medium'}">${q.level || 'medium'}</span>
        <span class="badge badge-${q.type}">${labelType(q.type)}</span>
        ${sub ? `<span class="badge badge-${sub.feedback ? 'graded' : 'pending'}">${sub.feedback ? 'graded ✓' : 'submitted'}</span>` : ''}
      </div>
      <span class="hw-toggle">▾</span>
    </div>
    <div class="hw-card-body">
      <div class="hw-label">Task</div>
      <div class="hw-prompt-box">${q.prompt}</div>
      <div id="hwbody-${q.id}">${buildAnswerArea(q, sub)}</div>
    </div>
  </div>`;
}

function labelType(t){
  return {writing:'Open writing', blank:'Fill in blank', mcq:'Multiple choice', truefalse:'True / False'}[t] || t;
}

function buildAnswerArea(q, sub){
  if(sub && sub.feedback) return buildFeedback(sub);
  if(sub) return `<div class="submitted-box">✓ Submitted! Your teacher will review and give feedback soon.</div>`;

  let answerHtml = '';
  if(q.type === 'writing'){
    answerHtml = `<div class="hw-label">Your answer</div>
      <textarea class="hw-input" id="ans-${q.id}" placeholder="Write your answer here…"></textarea>`;
  } else if(q.type === 'blank'){
    const parts = q.prompt.split(/\[BLANK\]/g);
    let sentence = '';
    parts.forEach((p,i) => {
      sentence += p;
      if(i < parts.length - 1) sentence += `<input class="blank-input" id="blank-${q.id}-${i}" placeholder="   ?" />`;
    });
    answerHtml = `<div class="hw-label">Fill in the blanks</div>
      <div class="blank-sentence">${sentence}</div>`;
  } else if(q.type === 'mcq'){
    const opts = q.options || [];
    answerHtml = `<div class="hw-label">Choose the correct answer</div>
      <div class="mcq-options">
        ${opts.map((o,i) => `<label class="mcq-option" id="mcqopt-${q.id}-${i}">
          <input type="radio" name="mcq-${q.id}" value="${o}" onchange="selectMcq('${q.id}',${i})"/> ${o}
        </label>`).join('')}
      </div>`;
  } else if(q.type === 'truefalse'){
    answerHtml = `<div class="hw-label">True or False?</div>
      <div class="tf-options">
        <button class="tf-btn" id="tf-true-${q.id}" onclick="selectTf('${q.id}','true')">✓ True</button>
        <button class="tf-btn" id="tf-false-${q.id}" onclick="selectTf('${q.id}','false')">✗ False</button>
      </div>`;
  }

  return `${answerHtml}
    <div class="hw-submit-row">
      <input class="hw-name-input" id="name-${q.id}" placeholder="Your name…" />
      <button class="btn btn-primary btn-sm" onclick="submitHw('${q.id}')">Submit answer</button>
    </div>
    <div id="hwmsg-${q.id}"></div>`;
}

function buildFeedback(sub){
  return `<div class="hw-feedback-box">
    <div class="hw-feedback-label">Your feedback</div>
    <div class="hw-feedback-body">${(sub.feedback||'').replace(/\n/g,'<br>')}</div>
    ${sub.grade ? `<div style="margin-top:14px;display:flex;align-items:baseline;gap:6px">
      <span class="hw-grade">${sub.grade}</span>
      <span style="font-size:14px;color:var(--ink3)">/ 10</span>
    </div>` : ''}
  </div>`;
}

function toggleHwCard(id){ document.getElementById('hwcard-'+id)?.classList.toggle('open'); }

function selectMcq(qid, idx){
  document.querySelectorAll(`[id^="mcqopt-${qid}-"]`).forEach((el,i) => el.classList.toggle('selected', i===idx));
}

function selectTf(qid, val){
  const t = document.getElementById('tf-true-'+qid);
  const f = document.getElementById('tf-false-'+qid);
  if(!t||!f) return;
  t.className = 'tf-btn' + (val==='true' ? ' selected-true' : '');
  f.className = 'tf-btn' + (val==='false' ? ' selected-false' : '');
}

function getAnswer(q){
  if(q.type==='writing') return document.getElementById('ans-'+q.id)?.value.trim() || '';
  if(q.type==='blank'){
    const parts = q.prompt.split(/\[BLANK\]/g);
    return parts.map((_,i) => i < parts.length-1 ? (document.getElementById(`blank-${q.id}-${i}`)?.value.trim()||'___') : '').join('').trim() ||
      Array.from({length: parts.length-1}, (_,i) => document.getElementById(`blank-${q.id}-${i}`)?.value.trim()||'').join(', ');
  }
  if(q.type==='mcq'){
    const sel = document.querySelector(`input[name="mcq-${q.id}"]:checked`);
    return sel ? sel.value : '';
  }
  if(q.type==='truefalse'){
    if(document.getElementById('tf-true-'+q.id)?.classList.contains('selected-true')) return 'True';
    if(document.getElementById('tf-false-'+q.id)?.classList.contains('selected-false')) return 'False';
    return '';
  }
  return '';
}

async function submitHw(qid){
  const q = questions.find(x => x.id === qid);
  const name = document.getElementById('name-'+qid)?.value.trim();
  const answer = getAnswer(q);
  const msgEl = document.getElementById('hwmsg-'+qid);
  if(!name){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please enter your name.</div>`; return; }
  if(!answer){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please answer the question first.</div>`; return; }

  const btn = document.querySelector(`#hwcard-${qid} .btn-primary`);
  if(btn){ btn.disabled = true; btn.textContent = 'Submitting…'; }

  try{
    const res = await fetch(`${API}/submit`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ studentName:name, assignmentId:qid, questionTitle:q.title, questionType:q.type, answer, correctAnswer: q.correctAnswer||null })
    });
    const data = await res.json();
    if(data.success){
      const sub = { id: Date.now(), questionId: qid, studentName: name, answer, feedback: null, grade: null };
      submissions.push(sub);
      localStorage.setItem('bm_subs', JSON.stringify(submissions));
      const body = document.getElementById('hwbody-'+qid);
      if(body) body.innerHTML = buildAnswerArea(q, sub);
    }
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Submit answer'; }
    if(msgEl) msgEl.innerHTML = `<div class="error-msg">Something went wrong. Please try again.</div>`;
  }
}

// ===== TEACHER DASHBOARD =====
let allSubmissions = [];
let allQuestions = [];

async function loadTeacher(){
  if(!document.getElementById('teacher-stats')) return;
  await Promise.all([fetchSubmissions(), fetchQuestions()]);
  renderStats();
  renderSubmissions();
  renderQuestions();
}

async function fetchSubmissions(){
  try{
    const res = await fetch(`${API}/submissions`);
    allSubmissions = await res.json();
  }catch(e){ allSubmissions=[]; }
}

async function fetchQuestions(){
  try{
    const res = await fetch(`${API}/questions`);
    allQuestions = await res.json();
  }catch(e){ allQuestions=[]; }
}

function renderStats(){
  const el = document.getElementById('teacher-stats');
  if(!el) return;
  const total = allSubmissions.length;
  const graded = allSubmissions.filter(s=>s.feedback).length;
  const avg = graded ? (allSubmissions.filter(s=>s.grade).reduce((a,s)=>a+parseFloat(s.grade||0),0)/graded).toFixed(1) : '—';
  el.innerHTML = `
    <div class="t-stat"><div class="t-stat-label">Submissions</div><div class="t-stat-val">${total}</div></div>
    <div class="t-stat"><div class="t-stat-label">Graded</div><div class="t-stat-val">${graded}</div></div>
    <div class="t-stat"><div class="t-stat-label">Pending</div><div class="t-stat-val">${total-graded}</div></div>
    <div class="t-stat"><div class="t-stat-label">Avg grade</div><div class="t-stat-val">${avg}</div></div>
  `;
}

function renderSubmissions(){
  const el = document.getElementById('teacher-subs');
  if(!el) return;
  if(!allSubmissions.length){ el.innerHTML=`<div class="empty-state">No submissions yet.</div>`; return; }
  const sorted = [...allSubmissions].sort((a,b)=> new Date(b.submittedAt)-new Date(a.submittedAt));
  el.innerHTML = sorted.map(sub => {
    const q = allQuestions.find(x=>x.id===sub.assignmentId);
    return `<div class="t-sub-card" id="tsub-${sub.id}">
      <div class="t-sub-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="t-sub-name">${sub.studentName}</span>
          <span class="badge badge-${q?.level||'medium'}">${q?.title||'Assignment'}</span>
          <span class="badge badge-${q?.type||'writing'}">${labelType(q?.type||'writing')}</span>
          <span class="badge badge-${sub.feedback?'graded':'pending'}">${sub.feedback?'graded ✓':'pending'}</span>
        </div>
        <span class="t-sub-date">${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}</span>
      </div>
      <div class="t-sub-answer">${sub.answer}</div>
      ${sub.feedback ? `
        <div class="hw-feedback-box">
          <div class="hw-feedback-label">AI Feedback</div>
          <div class="hw-feedback-body">${sub.feedback.replace(/\n/g,'<br>')}</div>
          ${sub.grade?`<div style="margin-top:10px;display:flex;align-items:baseline;gap:6px"><span class="hw-grade">${sub.grade}</span><span style="font-size:13px;color:var(--ink3)">/10</span></div>`:''}
        </div>
      ` : `
        <div id="tfb-${sub.id}" style="margin-bottom:10px"></div>
        <button class="btn btn-primary btn-sm" id="tbtn-${sub.id}" onclick="gradeWithAI('${sub.id}')">Grade with AI ✨</button>
      `}
    </div>`;
  }).join('');
}

async function gradeWithAI(subId){
  const sub = allSubmissions.find(s=>s.id===subId);
  const q = allQuestions.find(x=>x.id===sub?.assignmentId);
  const btn = document.getElementById('tbtn-'+subId);
  const fb = document.getElementById('tfb-'+subId);
  if(btn){ btn.disabled=true; btn.textContent='Grading…'; }
  if(fb) fb.innerHTML=`<div class="hw-feedback-box" style="margin-bottom:10px"><div class="hw-feedback-label" style="color:var(--teal)">AI is analysing…</div><div class="loading-dots" style="color:var(--teal)"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;

  const isAutoGrade = q?.type === 'mcq' || q?.type === 'truefalse';
  const system = isAutoGrade
    ? `You are an English teacher. The student answered a ${q.type} question.
Question: "${q.prompt}"
Correct answer: "${q.correctAnswer || 'Not specified'}"
Student answer: "${sub.answer}"
Check if the answer is correct. Respond ONLY as valid JSON: {"overall":"brief comment","correct":true,"grade":"8","positive":"what they did well"}`
    : `You are an experienced English teacher marking a student's homework.
Assignment: "${q?.title}" (${q?.level} level, type: ${q?.type})
Task: "${q?.prompt}"
Analyse the student's answer and give detailed feedback. Respond ONLY as valid JSON:
{"overall":"1-2 sentence comment","mistakes":[{"error":"exact error","correction":"corrected version","explanation":"why wrong"}],"positive":"one thing done well","grade":"7"}
Mistakes array: 0-3 items. Grade: number 1-10 as string.`;

  try{
    const res = await fetch(CLAUDE_API,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system,messages:[{role:'user',content:sub.answer}]})
    });
    const data = await res.json();
    const raw = (data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim();
    const p = JSON.parse(raw);

    let html = `${p.overall}\n\n`;
    if(p.mistakes?.length){
      html += `Mistakes to fix:\n`;
      p.mistakes.forEach((m,i)=>{ html+=`${i+1}. ❌ "${m.error}" → ✅ "${m.correction}"\n   ${m.explanation}\n`; });
    }
    if(p.correct !== undefined) html += `\n${p.correct ? '✅ Correct answer!' : '❌ Incorrect — see the correct answer above.'}\n`;
    html += `\n👍 Well done: ${p.positive}`;

    sub.feedback = html;
    sub.grade = p.grade;
    renderSubmissions();
    renderStats();
  }catch(e){
    if(fb) fb.innerHTML=`<div class="error-msg" style="margin-bottom:10px">Grading failed. Please try again.</div>`;
    if(btn){ btn.disabled=false; btn.textContent='Grade with AI ✨'; }
  }
}

function renderQuestions(){
  const el = document.getElementById('teacher-questions');
  if(!el) return;
  if(!allQuestions.length){ el.innerHTML=`<div class="empty-state">No questions yet. Add one above!</div>`; return; }
  el.innerHTML = allQuestions.map(q=>`
    <div class="t-sub-card">
      <div class="t-sub-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="t-sub-name">${q.title}</span>
          <span class="badge badge-${q.level||'medium'}">${q.level||'medium'}</span>
          <span class="badge badge-${q.type}">${labelType(q.type)}</span>
        </div>
        <button onclick="deleteQuestion('${q.id}')" style="font-size:12px;padding:5px 14px;border:1px solid var(--cream2);border-radius:50px;background:none;cursor:pointer;color:var(--ink3);font-family:inherit">Remove</button>
      </div>
      <div class="t-sub-answer" style="margin-top:8px">${q.prompt}</div>
      ${q.options ? `<div style="margin-top:8px;font-size:12px;color:var(--ink3)">Options: ${q.options.join(' | ')} — Correct: <strong>${q.correctAnswer}</strong></div>` : ''}
      ${q.correctAnswer && q.type==='truefalse' ? `<div style="margin-top:8px;font-size:12px;color:var(--ink3)">Correct answer: <strong>${q.correctAnswer}</strong></div>` : ''}
    </div>
  `).join('');
}

// Show/hide MCQ options builder based on type
function onTypeChange(){
  const type = document.getElementById('new-type')?.value;
  document.getElementById('mcq-builder-section').style.display = type==='mcq' ? 'block' : 'none';
  document.getElementById('tf-correct-section').style.display = type==='truefalse' ? 'block' : 'none';
  document.getElementById('correct-answer-section').style.display = type==='blank' ? 'block' : 'none';
}

async function addQuestion(){
  const title = document.getElementById('new-title')?.value.trim();
  const type = document.getElementById('new-type')?.value;
  const level = document.getElementById('new-level')?.value;
  const prompt = document.getElementById('new-prompt')?.value.trim();

  if(!title||!prompt){ alert('Please fill in the title and prompt.'); return; }

  let options = null, correctAnswer = null;
  if(type==='mcq'){
    options = Array.from({length:4},(_,i)=>document.getElementById(`mcq-opt-${i}`)?.value.trim()).filter(Boolean);
    correctAnswer = document.getElementById('mcq-correct')?.value.trim();
    if(options.length < 2){ alert('Please add at least 2 options.'); return; }
  }
  if(type==='truefalse'){
    correctAnswer = document.getElementById('tf-correct')?.value;
  }
  if(type==='blank'){
    correctAnswer = document.getElementById('blank-correct')?.value.trim();
    if(!prompt.includes('[BLANK]')){ alert('Please include [BLANK] in your prompt where the blank should go.'); return; }
  }

  const btn = document.getElementById('add-question-btn');
  if(btn){ btn.disabled=true; btn.textContent='Adding…'; }

  try{
    const res = await fetch(`${API}/questions`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, type, level, prompt, options, correctAnswer })
    });
    const data = await res.json();
    if(data.success){
      document.getElementById('new-title').value='';
      document.getElementById('new-prompt').value='';
      Array.from({length:4},(_,i)=>{ const el=document.getElementById(`mcq-opt-${i}`); if(el) el.value=''; });
      await fetchQuestions();
      renderQuestions();
      showTeacherTab('submissions');
    }
  }catch(e){
    alert('Failed to add question. Please try again.');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Add question'; }
  }
}

async function deleteQuestion(id){
  if(!confirm('Delete this question?')) return;
  allQuestions = allQuestions.filter(q=>q.id!==id);
  renderQuestions();
}

function showTeacherTab(tab){
  document.querySelectorAll('.t-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.t-panel').forEach(p=>p.style.display='none');
  document.getElementById('ttab-'+tab)?.classList.add('active');
  const panel = document.getElementById('tpanel-'+tab);
  if(panel) panel.style.display='block';
}

// Contact form
function submitContact(e){
  e.preventDefault();
  document.getElementById('contact-success').style.display='block';
  e.target.reset();
}

// Init
document.addEventListener('DOMContentLoaded',()=>{
  loadHomework();
  loadTeacher();
});
