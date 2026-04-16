// ===== CONFIG =====
const API = "https://9x8r1qewma.execute-api.eu-west-1.amazonaws.com/prod";

// ===== NAV =====
const nav = document.getElementById('nav');
if(nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));
function toggleMenu(){ document.getElementById('mobile-menu')?.classList.toggle('open'); }

// ===== STUDENT NAME =====
function getStudentName(qid){
  return localStorage.getItem(`bm_name_${qid}`) || '';
}
function saveStudentName(qid, name){
  localStorage.setItem(`bm_name_${qid}`, name);
}

// ===== HOMEWORK PAGE =====
let questions = [];

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
  // Check if THIS student already submitted — based on their saved name
  const savedName = getStudentName(q.id);
  const submitted = savedName ? localStorage.getItem(`bm_sub_${q.id}_${savedName}`) : null;
  const sub = submitted ? JSON.parse(submitted) : null;

  return `<div class="hw-card" id="hwcard-${q.id}">
    <div class="hw-card-head" onclick="toggleHwCard('${q.id}')">
      <div class="hw-card-head-left">
        <span class="hw-card-title">${q.title}</span>
        <span class="badge badge-${q.level || 'medium'}">${q.level || 'medium'}</span>
        <span class="badge badge-${q.type}">${labelType(q.type)}</span>
        ${sub ? `<span class="badge badge-graded">submitted ✓</span>` : ''}
      </div>
      <span class="hw-toggle">▾</span>
    </div>
    <div class="hw-card-body">
      <div class="hw-label">Task</div>
      <div class="hw-prompt-box">${q.type === 'blank' ? q.prompt.replace(/\[BLANK\]/g, '____') : q.prompt}</div>
      <div id="hwbody-${q.id}">${buildAnswerArea(q, sub)}</div>
    </div>
  </div>`;
}

function labelType(t){
  return {writing:'Open writing', blank:'Fill in blank', mcq:'Multiple choice', truefalse:'True / False'}[t] || t;
}

function buildAnswerArea(q, sub){
  if(sub) return `<div class="submitted-box">
    ✓ Submitted on ${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}
    <br/><br/><strong>Your answer:</strong> ${sub.answer}
  </div>`;

  let answerHtml = '';
  if(q.type === 'writing'){
    answerHtml = `<div class="hw-label">Your answer</div>
      <textarea class="hw-input" id="ans-${q.id}" placeholder="Write your answer here…"></textarea>`;
  } else if(q.type === 'blank'){
    const parts = q.prompt.split(/\[BLANK\]/g);
    let sentence = '';
    parts.forEach((p,i) => {
      sentence += p;
      if(i < parts.length - 1) sentence += `<input class="blank-input" id="blank-${q.id}-${i}" placeholder="?" />`;
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
      <input class="hw-name-input" id="name-${q.id}" placeholder="Your name…" value="${getStudentName(q.id)}" />
      <button class="btn btn-primary btn-sm" onclick="submitHw('${q.id}')">Submit answer</button>
    </div>
    <div id="hwmsg-${q.id}"></div>`;
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
    return Array.from({length: parts.length-1}, (_,i) => document.getElementById(`blank-${q.id}-${i}`)?.value.trim()||'').join(', ');
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
      body: JSON.stringify({
        studentName: name,
        assignmentId: qid,
        questionTitle: q.title,
        questionType: q.type,
        answer,
        correctAnswer: q.correctAnswer || null
      })
    });
    const data = await res.json();
    if(data.success){
      // Save per student per question — other students won't see this
      saveStudentName(qid, name);
      const sub = { answer, submittedAt: new Date().toISOString() };
      localStorage.setItem(`bm_sub_${qid}_${name}`, JSON.stringify(sub));
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
  const el2 = document.getElementById('teacher-stats');
  if(!el2) return;
  el.innerHTML = `
    <div class="t-stat"><div class="t-stat-label">Total submissions</div><div class="t-stat-val">${total}</div></div>
    <div class="t-stat"><div class="t-stat-label">Questions live</div><div class="t-stat-val">${allQuestions.length}</div></div>
    <div class="t-stat"><div class="t-stat-label">Students</div><div class="t-stat-val">${[...new Set(allSubmissions.map(s=>s.studentName))].length}</div></div>
    <div class="t-stat"><div class="t-stat-label">This week</div><div class="t-stat-val">${allSubmissions.filter(s=>{ const d=new Date(s.submittedAt); const now=new Date(); return (now-d) < 7*24*60*60*1000; }).length}</div></div>
  `;
}

function renderSubmissions(){
  const el = document.getElementById('teacher-subs');
  if(!el) return;
  if(!allSubmissions.length){ el.innerHTML=`<div class="empty-state">No submissions yet.</div>`; return; }
  const sorted = [...allSubmissions].sort((a,b)=> new Date(b.submittedAt)-new Date(a.submittedAt));
  el.innerHTML = sorted.map(sub => {
    const q = allQuestions.find(x=>x.id===sub.assignmentId);
    return `<div class="t-sub-card">
      <div class="t-sub-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="t-sub-name">${sub.studentName}</span>
          <span class="badge badge-${q?.level||'medium'}">${q?.title||'Assignment'}</span>
          <span class="badge badge-${q?.type||'writing'}">${labelType(q?.type||'writing')}</span>
        </div>
        <span class="t-sub-date">${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}</span>
      </div>
      <div class="t-sub-answer"><strong>Answer:</strong> ${sub.answer}</div>
      ${q?.correctAnswer ? `<div style="margin-top:8px;font-size:13px;color:var(--teal)">✅ Correct answer: <strong>${q.correctAnswer}</strong></div>` : ''}
    </div>`;
  }).join('');
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
        <button onclick="deleteQuestion('${q.id}')" style="font-size:12px;padding:5px 14px;border:1px solid var(--cream2);border-radius:50px;background:none;cursor:pointer;color:var(--red);font-family:inherit">Delete</button>
      </div>
      <div class="t-sub-answer" style="margin-top:8px">${q.prompt}</div>
      ${q.options ? `<div style="margin-top:8px;font-size:12px;color:var(--ink3)">Options: ${q.options.join(' | ')} — Correct: <strong>${q.correctAnswer}</strong></div>` : ''}
      ${q.correctAnswer && q.type==='truefalse' ? `<div style="margin-top:8px;font-size:12px;color:var(--ink3)">Correct answer: <strong>${q.correctAnswer}</strong></div>` : ''}
    </div>
  `).join('');
}

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
      alert('Question added successfully!');
    }
  }catch(e){
    alert('Failed to add question. Please try again.');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Add question'; }
  }
}

async function deleteQuestion(id){
  if(!confirm('Delete this question? This cannot be undone.')) return;
  try{
    const res = await fetch(`${API}/questions`, {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if(data.success){
      allQuestions = allQuestions.filter(q=>q.id!==id);
      renderQuestions();
      renderStats();
    }
  }catch(e){
    alert('Failed to delete. Please try again.');
  }
}

function showTeacherTab(tab){
  document.querySelectorAll('.t-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.t-panel').forEach(p=>p.style.display='none');
  document.getElementById('ttab-'+tab)?.classList.add('active');
  const panel = document.getElementById('tpanel-'+tab);
  if(panel) panel.style.display='block';
}

function submitContact(e){
  e.preventDefault();
  document.getElementById('contact-success').style.display='block';
  e.target.reset();
}

document.addEventListener('DOMContentLoaded',()=>{
  loadHomework();
  loadTeacher();
});
