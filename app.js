const STORAGE_KEY = "haohao-a2b1-final-diagnostic-v1";

let questions = [];
let moduleReview = {};
let parts = {};
let answers = {};

const quizForm = document.getElementById("quizForm");
const results = document.getElementById("results");
const answeredCount = document.getElementById("answeredCount");
const progressBar = document.getElementById("progressBar");
const scoreButton = document.getElementById("scoreButton");
const resetButton = document.getElementById("resetButton");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pct(correct, total) {
  return total ? Math.round((correct / total) * 100) : 0;
}

function loadSavedAnswers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    answers = saved && typeof saved === "object" ? saved : {};
  } catch {
    answers = {};
  }
}

function saveAnswers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

function renderQuiz() {
  let html = "";
  let currentPart = "";

  questions.forEach((q) => {
    if (q.part !== currentPart) {
      currentPart = q.part;
      html += `
        <section class="part-heading">
          <h2>${escapeHtml(q.part)}</h2>
          <p>${escapeHtml(parts[q.part] || "")}</p>
        </section>
      `;
    }

    html += `
      <section class="question-card" id="qcard-${q.id}">
        <div class="meta-row">
          <span class="pill">${q.id} / ${questions.length}</span>
          <span class="pill module">${escapeHtml(q.module)}</span>
          <span class="pill">${escapeHtml(q.topic)}</span>
        </div>
        <h3>${escapeHtml(q.question)}</h3>
        <div class="options">
          ${q.options
            .map((option, index) => {
              const inputId = `q${q.id}-${index}`;
              const checked = answers[q.id] === option ? "checked" : "";
              return `
                <label class="option ${checked ? "is-selected" : ""}" for="${inputId}">
                  <input id="${inputId}" type="radio" name="q${q.id}" value="${escapeHtml(option)}" ${checked} />
                  <span>${escapeHtml(option)}</span>
                </label>
              `;
            })
            .join("")}
        </div>
        <div class="feedback hidden" id="feedback-${q.id}"></div>
      </section>
    `;
  });

  quizForm.innerHTML = html;
  updateProgress();
}

function updateProgress() {
  const answered = Object.keys(answers).filter((id) => answers[id]).length;
  const percent = pct(answered, questions.length);
  answeredCount.textContent = answered;
  progressBar.style.width = `${percent}%`;
}

function updateSelectedStyles(input) {
  const group = document.querySelectorAll(`input[name="${input.name}"]`);
  group.forEach((item) => item.closest(".option").classList.remove("is-selected"));
  input.closest(".option").classList.add("is-selected");
}

function collectStats() {
  const moduleStats = {};
  const partStats = {};
  const wrongQuestions = [];
  let score = 0;

  questions.forEach((q) => {
    if (!moduleStats[q.module]) {
      moduleStats[q.module] = {
        correct: 0,
        total: 0,
        wrong: [],
        topics: new Set(),
      };
    }
    if (!partStats[q.part]) {
      partStats[q.part] = { correct: 0, total: 0 };
    }

    moduleStats[q.module].total += 1;
    partStats[q.part].total += 1;

    const selected = answers[q.id] || "";
    const isCorrect = selected === q.answer;

    if (isCorrect) {
      score += 1;
      moduleStats[q.module].correct += 1;
      partStats[q.part].correct += 1;
    } else {
      moduleStats[q.module].wrong.push(q.id);
      moduleStats[q.module].topics.add(q.topic);
      wrongQuestions.push({ ...q, selected });
    }
  });

  return { score, moduleStats, partStats, wrongQuestions };
}

function renderFeedback(wrongQuestions) {
  const wrongIds = new Set(wrongQuestions.map((q) => q.id));

  questions.forEach((q) => {
    const card = document.getElementById(`qcard-${q.id}`);
    const feedback = document.getElementById(`feedback-${q.id}`);
    const selected = answers[q.id] || "";
    const isWrong = wrongIds.has(q.id);

    card.classList.toggle("is-correct", !isWrong);
    card.classList.toggle("is-wrong", isWrong);
    feedback.classList.remove("hidden");

    if (isWrong) {
      feedback.innerHTML = `
        <p class="wrong-text">未答对</p>
        <p><b>你的答案：</b>${selected ? escapeHtml(selected) : "未作答"}</p>
        <p><b>正确答案：</b>${escapeHtml(q.answer)}</p>
        <p>${escapeHtml(q.explanation)}</p>
        <p><b>复习：</b>${escapeHtml(q.review)}</p>
      `;
    } else {
      feedback.innerHTML = `
        <p class="correct-text">答对了</p>
        <p>${escapeHtml(q.explanation)}</p>
      `;
    }
  });
}

function scoreMessage(score) {
  if (score >= 45) return "非常稳，B1 方向已经很清楚。";
  if (score >= 38) return "基础不错，几个模块再补一下就更扎实。";
  if (score >= 30) return "已经有不少积累，建议按下面的模块集中复习。";
  return "先别急，照着建议模块回炉一轮，再做一次会更清楚。";
}

function moduleScoreCards(moduleStats) {
  return Object.entries(moduleStats)
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN", { numeric: true }))
    .map(([module, stat]) => {
      const percent = pct(stat.correct, stat.total);
      const wrong = stat.wrong.length
        ? `<p>错题：${stat.wrong.join("、")}</p>`
        : `<p class="correct-text">本模块全对</p>`;

      return `
        <article class="score-item">
          <header>
            <span>${escapeHtml(module)}</span>
            <span>${stat.correct}/${stat.total}</span>
          </header>
          <div class="progress-track"><span style="width:${percent}%"></span></div>
          <p>${percent}%</p>
          ${wrong}
        </article>
      `;
    })
    .join("");
}

function partScoreCards(partStats) {
  return Object.entries(partStats)
    .map(([part, stat]) => {
      const percent = pct(stat.correct, stat.total);
      return `
        <article class="score-item">
          <header>
            <span>${escapeHtml(part)}</span>
            <span>${stat.correct}/${stat.total}</span>
          </header>
          <div class="progress-track"><span style="width:${percent}%"></span></div>
          <p>${escapeHtml(parts[part] || "")} · ${percent}%</p>
        </article>
      `;
    })
    .join("");
}

function reviewRecommendations(moduleStats) {
  const weakModules = Object.entries(moduleStats)
    .map(([module, stat]) => ({
      module,
      stat,
      percent: pct(stat.correct, stat.total),
      topics: Array.from(stat.topics),
    }))
    .filter((item) => item.percent < 75)
    .sort((a, b) => a.percent - b.percent);

  if (!weakModules.length) {
    return `<p class="correct-text">所有 Modulo 都在 75% 以上，可以进入下一阶段练习。</p>`;
  }

  return `
    <ul class="review-list">
      ${weakModules
        .map(
          ({ module, percent, topics }) => `
            <li>
              <p><b>${escapeHtml(module)} · ${percent}%</b></p>
              <p>${escapeHtml(moduleReview[module] || "建议回看本模块课件和错题。")}</p>
              <p class="muted">薄弱点：${escapeHtml(topics.join("；") || "综合复习")}</p>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function wrongQuestionList(wrongQuestions) {
  if (!wrongQuestions.length) {
    return `<p class="correct-text">没有错题，漂亮。</p>`;
  }

  return `
    <div class="wrong-list">
      ${wrongQuestions
        .map(
          (q) => `
            <article class="wrong-item">
              <h4>${q.id}. ${escapeHtml(q.question)}</h4>
              <p><b>${escapeHtml(q.module)}</b> · ${escapeHtml(q.topic)}</p>
              <p><b>你的答案：</b>${q.selected ? escapeHtml(q.selected) : "未作答"}</p>
              <p><b>正确答案：</b>${escapeHtml(q.answer)}</p>
              <p>${escapeHtml(q.explanation)}</p>
              <p><b>复习：</b>${escapeHtml(q.review)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function gradeQuiz() {
  const { score, moduleStats, partStats, wrongQuestions } = collectStats();
  const total = questions.length;
  const percent = pct(score, total);
  const unanswered = total - Object.keys(answers).filter((id) => answers[id]).length;

  renderFeedback(wrongQuestions);

  results.classList.remove("hidden");
  results.innerHTML = `
    <div class="score-hero">
      <h2>结果</h2>
      <div class="score-number">${score} / ${total}</div>
      <div class="progress-track"><span style="width:${percent}%"></span></div>
      <p class="score-note">${percent}% · ${scoreMessage(score)}</p>
      ${
        unanswered
          ? `<p class="warning-text">还有 ${unanswered} 道题未作答，未作答按错误计算。</p>`
          : ""
      }
    </div>

    <h3>各 Parte 得分</h3>
    <div class="score-grid">${partScoreCards(partStats)}</div>

    <h3>各 Modulo 得分</h3>
    <div class="score-grid">${moduleScoreCards(moduleStats)}</div>

    <h3>建议复习模块</h3>
    ${reviewRecommendations(moduleStats)}

    <h3>错题解析</h3>
    ${wrongQuestionList(wrongQuestions)}
  `;

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetQuiz() {
  if (!window.confirm("确定要清空本次答题记录吗？")) return;
  answers = {};
  localStorage.removeItem(STORAGE_KEY);
  results.classList.add("hidden");
  renderQuiz();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

quizForm.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
  const id = input.name.replace("q", "");
  answers[id] = input.value;
  saveAnswers();
  updateSelectedStyles(input);
  updateProgress();
});

scoreButton.addEventListener("click", gradeQuiz);
resetButton.addEventListener("click", resetQuiz);

fetch("questions.json?v=20260608-q9")
  .then((response) => response.json())
  .then((data) => {
    questions = data.questions || [];
    moduleReview = data.module_review || {};
    parts = data.parts || {};
    loadSavedAnswers();
    renderQuiz();
  })
  .catch(() => {
    quizForm.innerHTML =
      '<section class="question-card"><h2>题库加载失败</h2><p>请确认 questions.json 和 index.html 在同一个目录中。</p></section>';
  });
