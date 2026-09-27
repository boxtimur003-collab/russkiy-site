/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */
let state = {
  mode: 'all',
  queue: [],
  index: 0,
  correct: 0,
  wrong: 0,
  answered: false,
  timeLeft: 60,
  timerId: null,
  isTimeMode: false
};

const QUESTIONS_PER_ROUND = 10;

/* =========================================================
   ФОН
   ========================================================= */
(function createBubbles() {
  const box = document.getElementById('bubbles');
  if (!box) return;
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 60 + Math.random() * 180;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = Math.random() * 100 + '%';
    b.style.top = Math.random() * 100 + '%';
    b.style.animationDelay = (Math.random() * 18) + 's';
    b.style.animationDuration = (14 + Math.random() * 10) + 's';
    box.appendChild(b);
  }
})();

/* =========================================================
   НАВИГАЦИЯ
   ========================================================= */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function backToMenu() {
  stopTimer();
  showScreen('menuScreen');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =========================================================
   МЕНЮ (создаём кнопки из words.js)
   ========================================================= */
function buildMenu() {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.onclick = () => startMode(cat.id);
    btn.innerHTML = `
      <span class="icon">${cat.icon}</span>
      <div class="title">${cat.title}</div>
      <div class="desc">${cat.desc}</div>
    `;
    grid.appendChild(btn);
  });
}

/* =========================================================
   СТАРТ
   ========================================================= */
function startMode(mode) {
  state.mode = mode;
  state.index = 0;
  state.correct = 0;
  state.wrong = 0;
  state.answered = false;
  state.isTimeMode = (mode === 'time');

  const source = state.isTimeMode ? WORDS.all : (WORDS[mode] || WORDS.all);

  if (state.isTimeMode) {
    state.queue = shuffle(source);
    state.timeLeft = 60;
  } else {
    const seen = new Set();
    const uniq = [];
    for (const item of shuffle(source)) {
      if (!seen.has(item.w)) {
        seen.add(item.w);
        uniq.push(item);
      }
    }
    state.queue = uniq.slice(0, Math.min(QUESTIONS_PER_ROUND, uniq.length));
  }

  const totalEl = document.getElementById('statTotal');
  if (totalEl) totalEl.textContent = state.isTimeMode ? '∞' : state.queue.length;

  const timerBox = document.getElementById('timerBox');
  if (timerBox) timerBox.style.display = state.isTimeMode ? 'inline' : 'none';

  showScreen('gameScreen');
  renderQuestion();

  if (state.isTimeMode) startTimer();
}

/* =========================================================
   ТАЙМЕР
   ========================================================= */
function startTimer() {
  updateTimerDisplay();
  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      stopTimer();
      finishGame();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('statTimer');
  if (el) el.textContent = state.timeLeft;
}

function stopTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
}

/* =========================================================
   ВЫБОР БУКВ
   ========================================================= */
const ALL_LETTERS = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.split('');

function buildChoices(correctAnswers) {
  const correctSet = new Set(correctAnswers);
  const set = new Set(correctAnswers);
  while (set.size < Math.max(4, correctSet.size + 3)) {
    set.add(ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]);
  }
  return shuffle([...set]);
}

/* =========================================================
   ОТРИСОВКА ВОПРОСА
   ========================================================= */
function renderQuestion() {
  state.answered = false;

  if (state.isTimeMode && state.index >= state.queue.length) {
    state.queue = state.queue.concat(shuffle(WORDS.all));
  }

  if (!state.isTimeMode && state.index >= state.queue.length) {
    finishGame();
    return;
  }

  const q = state.queue[state.index];

  const statQ = document.getElementById('statQ');
  if (statQ) statQ.textContent = state.index + 1;
  const statCorrect = document.getElementById('statCorrect');
  if (statCorrect) statCorrect.textContent = state.correct;

  const total = state.queue.length;
  const progressFill = document.getElementById('progressFill');
  if (progressFill) progressFill.style.width = Math.min(100, (state.index / total) * 100) + '%';

  const wordEl = document.getElementById('wordDisplay');
  if (!wordEl) return;
  wordEl.innerHTML = '';
  let blankIdx = 0;
  for (const ch of q.w) {
    if (ch === '_') {
      const span = document.createElement('span');
      span.className = 'blank';
      span.dataset.idx = blankIdx++;
      span.textContent = '_';
      wordEl.appendChild(span);
    } else {
      wordEl.appendChild(document.createTextNode(ch));
    }
  }

  const hintBox = document.getElementById('hintBox');
  if (hintBox) hintBox.textContent = q.h ? '💡 ' + q.h : '';

  const optionsBox = document.getElementById('optionsBox');
  if (!optionsBox) return;
  optionsBox.innerHTML = '';
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.classList.remove('show');

  const choices = buildChoices(q.a);
  choices.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = letter;
    btn.onclick = () => checkAnswer(btn, letter, q);
    optionsBox.appendChild(btn);
  });
}

/* =========================================================
   ПРОВЕРКА
   ========================================================= */
function checkAnswer(btn, letter, q) {
  if (state.answered) return;
  state.answered = true;

  const isCorrect = q.a.includes(letter);
  const options = document.querySelectorAll('.option');
  options.forEach(o => o.disabled = true);

  options.forEach(o => {
    if (q.a.includes(o.textContent)) o.classList.add('correct');
  });
  if (!isCorrect) btn.classList.add('wrong');

  const blanks = document.querySelectorAll('.word .blank');
  blanks.forEach((b, i) => {
    b.textContent = q.a[i] || q.a[0] || letter;
    b.classList.add(isCorrect ? 'filled-correct' : 'filled-wrong');
  });

  if (isCorrect) state.correct++;
  else state.wrong++;

  const statCorrect = document.getElementById('statCorrect');
  if (statCorrect) statCorrect.textContent = state.correct;
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.classList.add('show');
}

/* =========================================================
   СЛЕДУЮЩИЙ
   ========================================================= */
function nextQuestion() {
  state.index++;
  if (!state.isTimeMode && state.index >= state.queue.length) {
    finishGame();
  } else {
    renderQuestion();
  }
}

/* =========================================================
   ФИНАЛ
   ========================================================= */
function finishGame() {
  stopTimer();
  const total = state.correct + state.wrong;
  const percent = total ? Math.round((state.correct / total) * 100) : 0;

  const resCorrect = document.getElementById('resCorrect');
  if (resCorrect) resCorrect.textContent = state.correct;
  const resWrong = document.getElementById('resWrong');
  if (resWrong) resWrong.textContent = state.wrong;
  const resPercent = document.getElementById('resPercent');
  if (resPercent) resPercent.textContent = percent + '%';

  let title = 'Хорошо!';
  if (percent >= 90) title = 'Отлично! 🎉';
  else if (percent >= 70) title = 'Неплохо! 👍';
  else if (percent >= 50) title = 'Можно лучше 🙂';
  else title = 'Потренируйся ещё 💪';

  const resultTitle = document.getElementById('resultTitle');
  if (resultTitle) resultTitle.textContent = title;
  const resultSubtitle = document.getElementById('resultSubtitle');
  if (resultSubtitle) resultSubtitle.textContent = `Правильных ответов: ${state.correct} из ${total}`;

  showScreen('resultScreen');
}

function restart() {
  startMode(state.mode);
}

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
   ========================================================= */
window.addEventListener('DOMContentLoaded', () => {
  buildMenu();
});