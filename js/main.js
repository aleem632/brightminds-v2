// ===== CONFIG =====
const API = "https://9x8r1qewma.execute-api.eu-west-1.amazonaws.com/prod";

// ===== NAV =====
const nav = document.getElementById('nav');
if(nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));
function toggleMenu(){ document.getElementById('mobile-menu')?.classList.toggle('open'); }

// ===== STUDENT NAME =====
function getStudentName(qid){ return localStorage.getItem(`bm_name_${qid}`) || ''; }
function saveStudentName(qid, name){ localStorage.setItem(`bm_name_${qid}`, name); }

// ===== HOMEWORK PAGE =====
let questions = [];

async function loadHomework(){
  const grid = document.getElementById('hw-grid');
  if(!grid) return;
  grid.innerHTML = `<div class="empty-state"><div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  try{
    const res = await fetch(`${API}/questions`);
    questions = await res.json();
    if(!questions.length){ grid.innerHTML = `<div class="empty-state">No homework yet — check back soon!</div>`; return; }
    grid.innerHTML = questions.map(q => buildHwCard(q)).join('');
  }catch(e){
    grid.innerHTML = `<div class="empty-state" style="color:var(--red)">Could not load homework. Please refresh the page.</div>`;
  }
}

function buildHwCard(q){
  const savedName = getStudentName(q.id);
  const submitted = savedName ? localStorage.getItem(`bm_sub_${q.id}_${savedName}`) : null;
  const sub = submitted ? JSON.parse(submitted) : null;
  const isMulti = q.questions && q.questions.length > 0;

  return `<div class="hw-card" id="hwcard-${q.id}">
    <div class="hw-card-head" onclick="toggleHwCard('${q.id}')">
      <div class="hw-card-head-left">
        <span class="hw-card-title">${q.title}</span>
        <span class="badge badge-${q.level||'medium'}">${q.level||'medium'}</span>
        <span class="badge badge-${q.type}">${labelType(q.type)}</span>
        ${isMulti ? `<span class="badge badge-writing">${q.questions.length} questions</span>` : ''}
        ${sub ? `<span class="badge badge-graded">submitted ✓</span>` : ''}
      </div>
      <span class="hw-toggle">▾</span>
    </div>
    <div class="hw-card-body">
      <div id="hwbody-${q.id}">${isMulti ? buildMultiAnswerArea(q, sub) : buildSingleAnswerArea(q, sub)}</div>
    </div>
  </div>`;
}

function labelType(t){
  return {writing:'Open writing', blank:'Fill in blank', mcq:'Multiple choice', truefalse:'True / False'}[t] || t;
}

// ===== MULTI QUESTION ASSIGNMENT =====
function buildMultiAnswerArea(q, sub){
  if(sub) return `<div class="submitted-box">
    ✓ Submitted on ${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}
    <br/><br/><strong>Your answers:</strong><br/>${sub.answers.map((a,i)=>`${i+1}. ${a}`).join('<br/>')}
  </div>`;

  const questionsHtml = q.questions.map((question, idx) => {
    let inputHtml = '';
    if(q.type === 'truefalse'){
      inputHtml = `<div class="tf-options">
        <button class="tf-btn" id="tf-true-${q.id}-${idx}" onclick="selectTfMulti('${q.id}',${idx},'true')">✓ True</button>
        <button class="tf-btn" id="tf-false-${q.id}-${idx}" onclick="selectTfMulti('${q.id}',${idx},'false')">✗ False</button>
      </div>`;
    } else if(q.type === 'blank'){
      const parts = question.split(/\[BLANK\]/g);
      let sentence = '';
      parts.forEach((p,i) => {
        sentence += p;
        if(i < parts.length-1) sentence += `<input class="blank-input" id="blank-${q.id}-${idx}-${i}" placeholder="?" />`;
      });
      inputHtml = `<div class="blank-sentence">${sentence}</div>`;
    } else if(q.type === 'mcq'){
      const opts = question.options || [];
      inputHtml = `<div class="mcq-options">
        ${opts.map((o,i)=>`<label class="mcq-option" id="mcqopt-${q.id}-${idx}-${i}">
          <input type="radio" name="mcq-${q.id}-${idx}" value="${o}" onchange="selectMcqMulti('${q.id}',${idx},${i})"/> ${o}
        </label>`).join('')}
      </div>`;
    }

    return `<div style="margin-bottom:24px;padding:16px 20px;background:var(--cream);border-radius:var(--radius);border-left:3px solid var(--teal)">
      <div style="font-size:13px;font-weight:600;color:var(--teal);margin-bottom:10px">Question ${idx+1}</div>
      <div style="font-size:15px;color:var(--ink2);margin-bottom:12px">${q.type==='blank' ? '' : question.text || question}</div>
      ${inputHtml}
    </div>`;
  }).join('');

  return `${questionsHtml}
    <div class="hw-submit-row">
      <input class="hw-name-input" id="name-${q.id}" placeholder="Your name…" value="${getStudentName(q.id)}" />
      <button class="btn btn-primary btn-sm" onclick="submitMultiHw('${q.id}')">Submit all answers</button>
    </div>
    <div id="hwmsg-${q.id}"></div>`;
}

function selectTfMulti(qid, idx, val){
  const t = document.getElementById(`tf-true-${qid}-${idx}`);
  const f = document.getElementById(`tf-false-${qid}-${idx}`);
  if(!t||!f) return;
  t.className = 'tf-btn' + (val==='true' ? ' selected-true' : '');
  f.className = 'tf-btn' + (val==='false' ? ' selected-false' : '');
}

function selectMcqMulti(qid, idx, optIdx){
  document.querySelectorAll(`[id^="mcqopt-${qid}-${idx}-"]`).forEach((el,i) => el.classList.toggle('selected', i===optIdx));
}

function getMultiAnswers(q){
  return q.questions.map((question, idx) => {
    if(q.type === 'truefalse'){
      if(document.getElementById(`tf-true-${q.id}-${idx}`)?.classList.contains('selected-true')) return 'True';
      if(document.getElementById(`tf-false-${q.id}-${idx}`)?.classList.contains('selected-false')) return 'False';
      return '';
    } else if(q.type === 'blank'){
      const parts = question.split(/\[BLANK\]/g);
      return Array.from({length: parts.length-1}, (_,i) => document.getElementById(`blank-${q.id}-${idx}-${i}`)?.value.trim()||'').join(', ');
    } else if(q.type === 'mcq'){
      const sel = document.querySelector(`input[name="mcq-${q.id}-${idx}"]:checked`);
      return sel ? sel.value : '';
    }
    return '';
  });
}

async function submitMultiHw(qid){
  const q = questions.find(x => x.id === qid);
  const name = document.getElementById('name-'+qid)?.value.trim();
  const msgEl = document.getElementById('hwmsg-'+qid);
  if(!name){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please enter your name.</div>`; return; }

  const answers = getMultiAnswers(q);
  const unanswered = answers.filter(a => !a).length;
  if(unanswered > 0){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please answer all ${unanswered} remaining question(s).</div>`; return; }

  const btn = document.querySelector(`#hwcard-${qid} .btn-primary`);
  if(btn){ btn.disabled=true; btn.textContent='Submitting…'; }

  try{
    const res = await fetch(`${API}/submit`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        studentName: name,
        assignmentId: qid,
        questionTitle: q.title,
        questionType: q.type,
        answer: answers.join(' | '),
        answers: answers,
        correctAnswers: q.questions.map(x => x.correctAnswer || null)
      })
    });
    const data = await res.json();
    if(data.success){
      saveStudentName(qid, name);
      const sub = { answers, submittedAt: new Date().toISOString() };
      localStorage.setItem(`bm_sub_${qid}_${name}`, JSON.stringify(sub));
      const body = document.getElementById('hwbody-'+qid);
      if(body) body.innerHTML = buildMultiAnswerArea(q, sub);
    }
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Submit all answers'; }
    if(msgEl) msgEl.innerHTML = `<div class="error-msg">Something went wrong. Please try again.</div>`;
  }
}

// ===== SINGLE QUESTION (backwards compatible) =====
function buildSingleAnswerArea(q, sub){
  if(sub) return `<div class="submitted-box">
    ✓ Submitted on ${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}
    <br/><br/><strong>Your answer:</strong> ${sub.answer}
  </div>`;

  let answerHtml = '';
  if(q.type==='writing'){
    answerHtml = `<div class="hw-label">Your answer</div>
      <textarea class="hw-input" id="ans-${q.id}" placeholder="Write your answer here…"></textarea>`;
  } else if(q.type==='blank'){
    const parts = q.prompt.split(/\[BLANK\]/g);
    let sentence = '';
    parts.forEach((p,i) => {
      sentence += p;
      if(i < parts.length-1) sentence += `<input class="blank-input" id="blank-${q.id}-0-${i}" placeholder="?" />`;
    });
    answerHtml = `<div class="hw-label">Fill in the blanks</div><div class="blank-sentence">${sentence}</div>`;
  } else if(q.type==='mcq'){
    const opts = q.options||[];
    answerHtml = `<div class="hw-label">Choose the correct answer</div>
      <div class="mcq-options">${opts.map((o,i)=>`<label class="mcq-option" id="mcqopt-${q.id}-0-${i}">
        <input type="radio" name="mcq-${q.id}-0" value="${o}" onchange="selectMcqMulti('${q.id}',0,${i})"/> ${o}
      </label>`).join('')}</div>`;
  } else if(q.type==='truefalse'){
    answerHtml = `<div class="hw-label">True or False?</div>
      <div class="tf-options">
        <button class="tf-btn" id="tf-true-${q.id}-0" onclick="selectTfMulti('${q.id}',0,'true')">✓ True</button>
        <button class="tf-btn" id="tf-false-${q.id}-0" onclick="selectTfMulti('${q.id}',0,'false')">✗ False</button>
      </div>`;
  }

  return `<div class="hw-prompt-box" style="margin-bottom:16px">${q.prompt}</div>
    ${answerHtml}
    <div class="hw-submit-row">
      <input class="hw-name-input" id="name-${q.id}" placeholder="Your name…" value="${getStudentName(q.id)}" />
      <button class="btn btn-primary btn-sm" onclick="submitSingleHw('${q.id}')">Submit answer</button>
    </div>
    <div id="hwmsg-${q.id}"></div>`;
}

async function submitSingleHw(qid){
  const q = questions.find(x => x.id === qid);
  const name = document.getElementById('name-'+qid)?.value.trim();
  const msgEl = document.getElementById('hwmsg-'+qid);
  if(!name){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please enter your name.</div>`; return; }

  let answer = '';
  if(q.type==='writing') answer = document.getElementById('ans-'+q.id)?.value.trim()||'';
  else if(q.type==='blank'){
    const parts = q.prompt.split(/\[BLANK\]/g);
    answer = Array.from({length:parts.length-1},(_,i)=>document.getElementById(`blank-${q.id}-0-${i}`)?.value.trim()||'').join(', ');
  }
  else if(q.type==='truefalse'){
    if(document.getElementById(`tf-true-${q.id}-0`)?.classList.contains('selected-true')) answer='True';
    else if(document.getElementById(`tf-false-${q.id}-0`)?.classList.contains('selected-false')) answer='False';
  }
  else if(q.type==='mcq'){
    const sel = document.querySelector(`input[name="mcq-${q.id}-0"]:checked`);
    answer = sel ? sel.value : '';
  }

  if(!answer){ if(msgEl) msgEl.innerHTML = `<div class="error-msg">Please answer the question first.</div>`; return; }

  const btn = document.querySelector(`#hwcard-${qid} .btn-primary`);
  if(btn){ btn.disabled=true; btn.textContent='Submitting…'; }

  try{
    const res = await fetch(`${API}/submit`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ studentName:name, assignmentId:qid, questionTitle:q.title, questionType:q.type, answer, correctAnswer:q.correctAnswer||null })
    });
    const data = await res.json();
    if(data.success){
      saveStudentName(qid, name);
      const sub = { answer, submittedAt: new Date().toISOString() };
      localStorage.setItem(`bm_sub_${qid}_${name}`, JSON.stringify(sub));
      const body = document.getElementById('hwbody-'+qid);
      if(body) body.innerHTML = buildSingleAnswerArea(q, sub);
    }
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Submit answer'; }
    if(msgEl) msgEl.innerHTML = `<div class="error-msg">Something went wrong. Please try again.</div>`;
  }
}

function toggleHwCard(id){ document.getElementById('hwcard-'+id)?.classList.toggle('open'); }

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
  try{ const res = await fetch(`${API}/submissions`); allSubmissions = await res.json(); }catch(e){ allSubmissions=[]; }
}

async function fetchQuestions(){
  try{ const res = await fetch(`${API}/questions`); allQuestions = await res.json(); }catch(e){ allQuestions=[]; }
}

function renderStats(){
  const el = document.getElementById('teacher-stats');
  if(!el) return;
  const total = allSubmissions.length;
  el.innerHTML = `
    <div class="t-stat"><div class="t-stat-label">Total submissions</div><div class="t-stat-val">${total}</div></div>
    <div class="t-stat"><div class="t-stat-label">Assignments live</div><div class="t-stat-val">${allQuestions.length}</div></div>
    <div class="t-stat"><div class="t-stat-label">Students</div><div class="t-stat-val">${[...new Set(allSubmissions.map(s=>s.studentName))].length}</div></div>
    <div class="t-stat"><div class="t-stat-label">This week</div><div class="t-stat-val">${allSubmissions.filter(s=>{ const d=new Date(s.submittedAt); return (new Date()-d)<7*24*60*60*1000; }).length}</div></div>
  `;
}

function renderSubmissions(){
  const el = document.getElementById('teacher-subs');
  if(!el) return;
  if(!allSubmissions.length){ el.innerHTML=`<div class="empty-state">No submissions yet.</div>`; return; }
  const sorted = [...allSubmissions].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  el.innerHTML = sorted.map(sub => {
    const q = allQuestions.find(x=>x.id===sub.assignmentId);
    const isMulti = sub.answers && sub.answers.length > 0;
    let answersHtml = '';
    if(isMulti && q?.questions){
      answersHtml = q.questions.map((question, idx) => {
        const studentAnswer = sub.answers[idx] || '—';
        const correct = question.correctAnswer;
        const isCorrect = correct && studentAnswer.toLowerCase() === correct.toLowerCase();
        return `<div style="padding:8px 0;border-bottom:1px solid var(--cream2);font-size:13px">
          <span style="color:var(--ink3)">Q${idx+1}:</span> ${question.text||question}
          <br/><span style="color:var(--ink2)">Answer: <strong>${studentAnswer}</strong></span>
          ${correct ? `<span style="margin-left:8px;color:${isCorrect?'var(--green)':'var(--red)'}">${isCorrect?'✅ Correct':'❌ Wrong — correct: '+correct}</span>` : ''}
        </div>`;
      }).join('');
    } else {
      answersHtml = `<div style="font-size:14px"><strong>Answer:</strong> ${sub.answer}</div>
        ${q?.correctAnswer ? `<div style="margin-top:6px;font-size:13px;color:var(--teal)">✅ Correct answer: <strong>${q.correctAnswer}</strong></div>` : ''}`;
    }
    return `<div class="t-sub-card">
      <div class="t-sub-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="t-sub-name">${sub.studentName}</span>
          <span class="badge badge-${q?.level||'medium'}">${q?.title||'Assignment'}</span>
          <span class="badge badge-${q?.type||'writing'}">${labelType(q?.type||'writing')}</span>
        </div>
        <span class="t-sub-date">${new Date(sub.submittedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}</span>
      </div>
      <div class="t-sub-answer" style="margin-top:10px">${answersHtml}</div>
    </div>`;
  }).join('');
}

function renderQuestions(){
  const el = document.getElementById('teacher-questions');
  if(!el) return;
  if(!allQuestions.length){ el.innerHTML=`<div class="empty-state">No assignments yet. Add one above!</div>`; return; }
  el.innerHTML = allQuestions.map(q=>`
    <div class="t-sub-card">
      <div class="t-sub-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="t-sub-name">${q.title}</span>
          <span class="badge badge-${q.level||'medium'}">${q.level||'medium'}</span>
          <span class="badge badge-${q.type}">${labelType(q.type)}</span>
          ${q.questions ? `<span class="badge badge-writing">${q.questions.length} questions</span>` : ''}
        </div>
        <button onclick="deleteQuestion('${q.id}')" style="font-size:12px;padding:5px 14px;border:1px solid var(--cream2);border-radius:50px;background:none;cursor:pointer;color:var(--red);font-family:inherit">Delete</button>
      </div>
      ${q.questions ? `<div style="margin-top:10px;font-size:13px;color:var(--ink3)">${q.questions.map((x,i)=>`${i+1}. ${x.text||x}`).join('<br/>')}</div>` : `<div class="t-sub-answer" style="margin-top:8px">${q.prompt}</div>`}
    </div>
  `).join('');
}

// ===== ADD ASSIGNMENT (multiple questions) =====
let newQuestions = [];

function onTypeChange(){
  newQuestions = [];
  renderQuestionBuilder();
}

function renderQuestionBuilder(){
  const type = document.getElementById('new-type')?.value;
  const container = document.getElementById('questions-builder');
  if(!container) return;

  const questionsHtml = newQuestions.map((q, idx) => `
    <div style="background:var(--cream);border-radius:var(--radius);padding:14px 18px;margin-bottom:10px;border-left:3px solid var(--teal)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--teal)">Question ${idx+1}</span>
        <button onclick="removeQuestion(${idx})" style="font-size:11px;padding:3px 10px;border:1px solid var(--cream2);border-radius:50px;background:none;cursor:pointer;color:var(--red);font-family:inherit">Remove</button>
      </div>
      <div style="font-size:13px;color:var(--ink2)">${q.text||q}</div>
      ${q.correctAnswer ? `<div style="font-size:12px;color:var(--teal);margin-top:4px">✅ Correct: ${q.correctAnswer}</div>` : ''}
      ${q.options ? `<div style="font-size:12px;color:var(--ink3);margin-top:4px">Options: ${q.options.join(' | ')}</div>` : ''}
    </div>
  `).join('');

  let addHtml = '';
  if(type === 'truefalse'){
    addHtml = `
      <div class="form-group">
        <label class="form-label">Statement</label>
        <input class="form-control" id="q-text" placeholder="e.g. She go to school every day is correct English." />
      </div>
      <div class="form-group">
        <label class="form-label">Correct answer</label>
        <select class="form-control" id="q-correct">
          <option value="True">True</option>
          <option value="False">False</option>
        </select>
      </div>`;
  } else if(type === 'blank'){
    addHtml = `
      <div class="form-group">
        <label class="form-label">Sentence (use [BLANK] for gaps)</label>
        <input class="form-control" id="q-text" placeholder="e.g. Last [BLANK] I went on a [BLANK] to Egypt." />
      </div>
      <div class="form-group">
        <label class="form-label">Correct answer(s) — separate with comma</label>
        <input class="form-control" id="q-correct" placeholder="e.g. month, trip" />
      </div>`;
  } else if(type === 'mcq'){
    addHtml = `
      <div class="form-group">
        <label class="form-label">Question</label>
        <input class="form-control" id="q-text" placeholder="e.g. Which sentence is correct?" />
      </div>
      <div class="form-group">
        <label class="form-label">Options</label>
        <input class="form-control" id="q-opt-0" placeholder="Option A" style="margin-bottom:6px"/>
        <input class="form-control" id="q-opt-1" placeholder="Option B" style="margin-bottom:6px"/>
        <input class="form-control" id="q-opt-2" placeholder="Option C" style="margin-bottom:6px"/>
        <input class="form-control" id="q-opt-3" placeholder="Option D" />
      </div>
      <div class="form-group">
        <label class="form-label">Correct answer (type exact option text)</label>
        <input class="form-control" id="q-correct" placeholder="e.g. Option A text" />
      </div>`;
  } else if(type === 'writing'){
    addHtml = `
      <div class="form-group">
        <label class="form-label">Writing prompt</label>
        <textarea class="form-control form-control-textarea" id="q-text" placeholder="e.g. Write 5 sentences about your favourite food."></textarea>
      </div>`;
  }

  container.innerHTML = `
    ${questionsHtml}
    <div style="background:var(--white);border-radius:var(--radius);padding:16px 18px;border:1.5px dashed var(--cream2);margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:12px">ADD QUESTION ${newQuestions.length+1}</div>
      ${addHtml}
      <button class="btn btn-ghost btn-sm" onclick="addQuestionToList()">+ Add this question</button>
    </div>
  `;
}

function addQuestionToList(){
  const type = document.getElementById('new-type')?.value;
  const text = document.getElementById('q-text')?.value.trim();
  const correct = document.getElementById('q-correct')?.value.trim();
  if(!text){ alert('Please write the question first.'); return; }

  let questionObj = { text, correctAnswer: correct || null };

  if(type === 'blank'){
    if(!text.includes('[BLANK]')){ alert('Please include [BLANK] in your sentence.'); return; }
  }
  if(type === 'mcq'){
    const options = Array.from({length:4},(_,i)=>document.getElementById(`q-opt-${i}`)?.value.trim()).filter(Boolean);
    if(options.length < 2){ alert('Please add at least 2 options.'); return; }
    questionObj.options = options;
  }

  newQuestions.push(questionObj);
  renderQuestionBuilder();
}

function removeQuestion(idx){
  newQuestions.splice(idx, 1);
  renderQuestionBuilder();
}

async function addAssignment(){
  const title = document.getElementById('new-title')?.value.trim();
  const type = document.getElementById('new-type')?.value;
  const level = document.getElementById('new-level')?.value;

  if(!title){ alert('Please add a title.'); return; }
  if(newQuestions.length === 0){ alert('Please add at least one question.'); return; }

  const btn = document.getElementById('add-question-btn');
  if(btn){ btn.disabled=true; btn.textContent='Saving…'; }

  try{
    const res = await fetch(`${API}/assignments`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, type, level, questions: newQuestions })
    });
    const data = await res.json();
    if(data.success){
      document.getElementById('new-title').value='';
      newQuestions = [];
      renderQuestionBuilder();
      await fetchQuestions();
      renderQuestions();
      renderStats();
      alert(`Assignment "${title}" saved with ${newQuestions.length} questions!`);
      showTeacherTab('submissions');
    }
  }catch(e){
    alert('Failed to save. Please try again.');
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Save assignment'; }
  }
}

async function deleteQuestion(id){
  if(!confirm('Delete this assignment? This cannot be undone.')) return;
  try{
    const res = await fetch(`${API}/questions`,{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if(data.success){ allQuestions=allQuestions.filter(q=>q.id!==id); renderQuestions(); renderStats(); }
  }catch(e){ alert('Failed to delete. Please try again.'); }
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
  const typeSelect = document.getElementById('new-type');
  if(typeSelect){
    renderQuestionBuilder();
    typeSelect.addEventListener('change', () => {
      newQuestions = [];
      renderQuestionBuilder();
    });
  }
});
