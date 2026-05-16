const topicsList = document.querySelector("#topics-list");
const themeSelect = document.querySelector("#theme-select");
const topicSearch = document.querySelector("#topic-search");
const sidebar = document.querySelector("#sidebar");
const mobileMenuOpenButton = document.querySelector("#mobile-menu-open");
const mobileMenuCloseButton = document.querySelector("#mobile-menu-close");
const contentEyebrow = document.querySelector(".content__eyebrow") || { hidden: true, textContent: "" };
const topicTitle = document.querySelector("#topic-title") || { hidden: true, textContent: "" };
const topicDescription = document.querySelector("#topic-description") || { hidden: true, textContent: "" };
const topicSectionsBar = document.querySelector("#topic-sections-bar");
const topicProgress = document.querySelector("#topic-progress");
const topicProgressCount = document.querySelector("#topic-progress-count");
const topicProgressNav = document.querySelector("#topic-progress-nav");
const sectionToolbar = document.querySelector("#section-toolbar");
const contentViewer = document.querySelector("#content-viewer");
const contentViewerLabel = document.querySelector("#content-viewer-label");
const completionToggle = document.querySelector("#completion-toggle");
const contentFrame = document.querySelector("#content-frame");
const quizViewer = document.querySelector("#quiz-viewer");
const quizTimer = document.querySelector("#quiz-timer");
const quizQuestionTrack = document.querySelector("#quiz-question-track");
const quizIntroScreen = document.querySelector("#quiz-intro-screen");
const quizIntroDescription = document.querySelector("#quiz-intro-description");
const quizStartButton = document.querySelector("#quiz-start-button");
const quizReviewButton = document.querySelector("#quiz-review-button");
const quizQuestionScreen = document.querySelector("#quiz-question-screen");
const quizFeedbackScreen = document.querySelector("#quiz-feedback-screen");
const quizCompleteScreen = document.querySelector("#quiz-complete-screen");
const quizQuestionTitle = document.querySelector("#quiz-question-title");
const quizOptions = document.querySelector("#quiz-options");
const quizFeedbackStatus = document.querySelector("#quiz-feedback-status");
const quizFeedbackAnswerBlock = document.querySelector("#quiz-feedback-answer-block");
const quizFeedbackAnswer = document.querySelector("#quiz-feedback-answer");
const quizFeedbackOptionBlock = document.querySelector("#quiz-feedback-option-block");
const quizFeedbackOptionExplanation = document.querySelector("#quiz-feedback-option-explanation");
const quizFeedbackQuestionBlock = document.querySelector("#quiz-feedback-question-block");
const quizFeedbackQuestionExplanation = document.querySelector("#quiz-feedback-question-explanation");
const quizNextButton = document.querySelector("#quiz-next-button");
const quizCompleteSummary = document.querySelector("#quiz-complete-summary");
const quizCompleteErrors = document.querySelector("#quiz-complete-errors");
const quizCompleteErrorsList = document.querySelector("#quiz-complete-errors-list");
const quizRestartButton = document.querySelector("#quiz-restart-button");
const errorsViewer = document.querySelector("#errors-viewer");
const errorsCompleteErrors = document.querySelector("#errors-complete-errors");
const errorsCompleteErrorsList = document.querySelector("#errors-complete-errors-list");
const statisticsViewer = document.querySelector("#statistics-viewer");

const topicEntries = [];
const questionRenderers = {
  "pregunta abcd": renderAbcdQuestion,
  "pregunta verdadero-falso": renderTrueFalseQuestion,
  "completar frase": renderFillBlankQuestion,
  "relacionar": renderMatchingQuestion
};
const SECTION_PRIORITY = ["teoria", "resumen", "preguntas", "repaso", "revisar errores", "estadísticas", "estadisticas"];
const LAST_SECTION_COOKIE = "oposicion_last_section";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const QUIZ_QUESTION_COUNT = 20;
const QUIZ_TIME_PER_QUESTION = 30;
const COMPLETION_ENDPOINT = "progress.php";

let syllabus = [];
let activeEntry = null;
let activeThemeIndex = 0;
let activeSectionKey = null;
let currentSection = null;
let completionState = {};
let failedQuestionState = {};
let statsState = { topics: {} };
let quizState = null;
let quizTimerId = null;
let quizSessionSeed = null;
const expandedBranchKeys = new Set();

function isMobileLayout() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function openMobileMenu() {
  if (!isMobileLayout()) {
    return;
  }

  sidebar.classList.add("is-mobile-open");
  document.body.classList.add("is-mobile-menu-open");
  mobileMenuOpenButton.setAttribute("aria-expanded", "true");
}

function closeMobileMenu() {
  sidebar.classList.remove("is-mobile-open");
  document.body.classList.remove("is-mobile-menu-open");
  mobileMenuOpenButton.setAttribute("aria-expanded", "false");
}

function syncMobileMenuState() {
  if (!isMobileLayout()) {
    closeMobileMenu();
  }
}

function hideContentViewer() {
  contentViewer.hidden = true;
  contentFrame.removeAttribute("src");
}

function syncContentViewerVisibility() {
  contentViewer.hidden = !contentFrame.getAttribute("src");
}

function clearQuizTimer() {
  if (quizTimerId !== null) {
    window.clearInterval(quizTimerId);
    quizTimerId = null;
  }
}

function hideQuizViewer() {
  clearQuizTimer();
  quizViewer.hidden = true;
  quizState = null;
  quizIntroScreen.hidden = false;
  quizQuestionScreen.hidden = true;
  quizFeedbackScreen.hidden = true;
  quizCompleteScreen.hidden = true;
  quizOptions.innerHTML = "";
  quizCompleteErrors.hidden = true;
  quizCompleteErrorsList.innerHTML = "";
  quizIntroDescription.textContent = "Elige cómo quieres practicar. El tiempo empezará a contar en la primera pregunta.";
  quizReviewButton.disabled = false;
  quizQuestionTitle.textContent = "Selecciona una pregunta";
  quizTimer.textContent = formatSeconds(QUIZ_TIME_PER_QUESTION);
  quizQuestionTrack.innerHTML = "";
}

function hideErrorsViewer() {
  errorsViewer.hidden = true;
  errorsCompleteErrors.hidden = true;
  errorsCompleteErrorsList.innerHTML = "";
}

function hideStatisticsViewer() {
  statisticsViewer.hidden = true;
}

function hideTopicProgress() {
  topicProgress.hidden = true;
  topicProgressNav.innerHTML = "";
  topicProgressCount.textContent = "0/0";
}

function setTopicHeaderVisibility(isVisible) {
  contentEyebrow.hidden = !isVisible;
  topicTitle.hidden = !isVisible;
  topicDescription.hidden = !isVisible;
}

function setQuizLayoutState(isQuizView) {
  sectionToolbar.classList.toggle("is-quiz-layout", isQuizView);
}

function hideAllContentModes() {
  hideContentViewer();
  hideQuizViewer();
  hideErrorsViewer();
  hideStatisticsViewer();
}

function formatSeconds(value) {
  const seconds = Math.max(0, value);
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");
  return `${minutesPart}:${secondsPart}`;
}

function shuffleArray(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

async function loadJsonResource(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path} (${response.status})`);
  }

  return response.json();
}

async function fetchCompletionState() {
  const response = await fetch(COMPLETION_ENDPOINT, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el progreso (${response.status})`);
  }

  return response.json();
}

async function saveCompletionState(action, payload) {
  const response = await fetch(COMPLETION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      action,
      item: payload
    })
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar el progreso (${response.status})`);
  }

  const result = await response.json();
  syncProgressStateFromResponse(result);
  return result;
}

function normalizeFailedQuestionsState(data) {
  return data && typeof data === "object" ? data : {};
}

function normalizeStatsState(data) {
  if (!data || typeof data !== "object") {
    return { topics: {} };
  }

  const topics = data.topics && typeof data.topics === "object" ? data.topics : {};
  return { ...data, topics };
}

function syncProgressStateFromResponse(data) {
  if (!data || typeof data !== "object") {
    return;
  }

  if (data.items && typeof data.items === "object") {
    completionState = data.items;
  }

  if (data.failedQuestions && typeof data.failedQuestions === "object") {
    failedQuestionState = normalizeFailedQuestionsState(data.failedQuestions);
  }

  if (data.stats && typeof data.stats === "object") {
    statsState = normalizeStatsState(data.stats);
  }
}

function getQuestionStorageKey(sourceLink, question) {
  return JSON.stringify([
    sourceLink || "",
    question?.id ?? "",
    question?.enunciado ?? ""
  ]);
}

function buildFailedQuestionRecord(topic, section, question) {
  return {
    key: getQuestionStorageKey(section.link, question),
    sourceLink: section.link,
    topicTitle: topic.title,
    sectionLabel: section.label,
    questionData: question
  };
}

function getTopicQuestionSourceLink(topic) {
  if (!Array.isArray(topic?.sections)) {
    return "";
  }

  const questionSection = topic.sections.find((section) => section.pageType === "preguntas");
  return questionSection?.link || "";
}

function getTopicFailedQuestions(topic) {
  const sourceLink = getTopicQuestionSourceLink(topic);

  if (!sourceLink) {
    return [];
  }

  return Object.values(failedQuestionState).filter((entry) => entry?.sourceLink === sourceLink);
}

function hasTopicErrors(topic) {
  return getTopicFailedQuestions(topic).length > 0;
}

function setCookie(name, value, maxAgeSeconds = COOKIE_MAX_AGE) {
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ` +
    `max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const cookiePrefix = `${encodeURIComponent(name)}=`;
  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!cookieValue) {
    return null;
  }

  return decodeURIComponent(cookieValue.slice(cookiePrefix.length));
}

function updateQuizStats() {
  if (!quizState) {
    return;
  }

  quizTimer.textContent = formatSeconds(quizState.remainingSeconds);
  quizQuestionTrack.innerHTML = "";

  quizState.answerStatuses.forEach((status, index) => {
    const segment = document.createElement("span");
    segment.className = "quiz-progress-track__segment";

    if (status === "correct") {
      segment.classList.add("is-correct");
    } else if (status === "wrong") {
      segment.classList.add("is-wrong");
    } else if (quizState.hasStarted && index === quizState.currentIndex) {
      segment.classList.add("is-current");
    }

    quizQuestionTrack.appendChild(segment);
  });
}

function renderQuestion() {
  const currentQuestion = quizState.questions[quizState.currentIndex];
  const renderer = questionRenderers[currentQuestion.tipo];

  quizIntroScreen.hidden = true;
  quizQuestionScreen.hidden = false;
  quizFeedbackScreen.hidden = true;
  quizCompleteScreen.hidden = true;
  quizQuestionTitle.textContent = currentQuestion.enunciado;
  quizOptions.innerHTML = "";

  if (typeof renderer !== "function") {
    throw new Error(`Tipo de pregunta no soportado: ${currentQuestion.tipo}`);
  }

  renderer(currentQuestion);
  updateQuizStats();
}

function renderAbcdQuestion(question) {
  const optionBadges = ["A", "B", "C", "D"];
  const shuffledOptions = shuffleArray(question.opciones);

  shuffledOptions.forEach((option, optionIndex) => {
    const optionBadge = optionBadges[optionIndex] || option.id.toUpperCase();
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "quiz-option";
    optionButton.dataset.shortcut = optionBadge.toLowerCase();
    optionButton.setAttribute("role", "listitem");
    optionButton.innerHTML = `
      <span class="quiz-option__radio" aria-hidden="true"></span>
      <span class="quiz-option__badge">${optionBadge}</span>
      <span class="quiz-option__text">${option.texto}</span>
    `;
    optionButton.addEventListener("click", () => handleAnswerSelection(option));
    quizOptions.appendChild(optionButton);
  });
}

function renderTrueFalseQuestion(question) {
  const options = shuffleArray([
    {
      id: "verdadero",
      texto: "Verdadero",
      correcta: question.respuestaCorrecta === "verdadero"
    },
    {
      id: "falso",
      texto: "Falso",
      correcta: question.respuestaCorrecta === "falso"
    }
  ]);

  options.forEach((option) => {
    const optionBadge = option.texto.charAt(0);
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "quiz-option";
    optionButton.dataset.shortcut = optionBadge.toLowerCase();
    optionButton.setAttribute("role", "listitem");
    optionButton.innerHTML = `
      <span class="quiz-option__radio" aria-hidden="true"></span>
      <span class="quiz-option__badge">${optionBadge}</span>
      <span class="quiz-option__text">${option.texto}</span>
    `;
    optionButton.addEventListener("click", () => handleAnswerSelection(option));
    quizOptions.appendChild(optionButton);
  });
}

function normalizeFillBlankValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function renderFillBlankQuestion(question) {
  const expectedAnswer = String(question.respuesta || "").trim();
  const answerLength = expectedAnswer.length;
  const prompt = document.createElement("div");
  const inputShell = document.createElement("div");
  const hiddenInput = document.createElement("input");
  const boxes = document.createElement("div");
  let hasSubmitted = false;

  prompt.className = "quiz-fill-blank";

  inputShell.className = "quiz-fill-blank__input-shell";
  inputShell.tabIndex = 0;

  hiddenInput.type = "text";
  hiddenInput.className = "quiz-fill-blank__native-input";
  hiddenInput.autocomplete = "off";
  hiddenInput.autocapitalize = "none";
  hiddenInput.spellcheck = false;
  hiddenInput.maxLength = answerLength;
  hiddenInput.setAttribute("aria-label", "Respuesta");

  boxes.className = "quiz-fill-blank__boxes";

  function syncBoxes() {
    const characters = hiddenInput.value.toUpperCase().slice(0, answerLength).split("");
    boxes.innerHTML = "";

    for (let index = 0; index < answerLength; index += 1) {
      const box = document.createElement("span");
      box.className = "quiz-fill-blank__box";
      box.textContent = characters[index] || "";
      boxes.appendChild(box);
    }
  }

  function submitAnswer() {
    if (hasSubmitted) {
      return;
    }

    const typedValue = hiddenInput.value.trim();

    if (typedValue.length !== answerLength) {
      return;
    }

    hasSubmitted = true;
    handleAnswerSelection({
      texto: typedValue,
      correcta: normalizeFillBlankValue(typedValue) === normalizeFillBlankValue(expectedAnswer)
    });
  }

  hiddenInput.addEventListener("input", () => {
    hiddenInput.value = hiddenInput.value.slice(0, answerLength);
    syncBoxes();
    if (hiddenInput.value.length === answerLength) {
      submitAnswer();
    }
  });

  inputShell.addEventListener("click", () => {
    hiddenInput.focus();
  });

  inputShell.addEventListener("keydown", (event) => {
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
      hiddenInput.focus();
    }
  });

  inputShell.append(hiddenInput, boxes);
  prompt.append(inputShell);
  quizOptions.appendChild(prompt);
  syncBoxes();
  window.setTimeout(() => hiddenInput.focus(), 0);
}

function renderMatchingQuestion(question) {
  const relationPairs = shuffleArray(
    (Array.isArray(question.relaciones) ? question.relaciones : []).map((relation, index) => ({
      id: `relation-${index}`,
      izquierda: relation.izquierda,
      derecha: relation.derecha
    }))
  );
  const leftItems = shuffleArray(
    relationPairs.map((pair) => ({
      id: pair.id,
      text: pair.izquierda
    }))
  );
  const rightItems = shuffleArray(
    relationPairs.map((pair) => ({
      id: pair.id,
      text: pair.derecha
    }))
  );
  const container = document.createElement("div");
  const leftColumn = document.createElement("div");
  const rightColumn = document.createElement("div");
  let selectedLeftButton = null;
  let selectedRightButton = null;
  let matchedCount = 0;
  let isLocked = false;
  let hasCompleted = false;

  container.className = "quiz-match";
  leftColumn.className = "quiz-match__column";
  rightColumn.className = "quiz-match__column";

  function clearSelection() {
    if (selectedLeftButton) {
      selectedLeftButton.classList.remove("is-selected");
    }

    if (selectedRightButton) {
      selectedRightButton.classList.remove("is-selected");
    }

    selectedLeftButton = null;
    selectedRightButton = null;
  }

  function finishMatchingQuestion() {
    if (hasCompleted || !quizState) {
      return;
    }

    const question = quizState.questions[quizState.currentIndex];
    hasCompleted = true;
    clearQuizTimer();
    quizState.correctCount += 1;
    quizState.answerStatuses[quizState.currentIndex] = "correct";
    recordQuizAnswerStat({
      topic: quizState.topic,
      section: quizState.section,
      isCorrect: true,
      isCorrection: quizState.mode === "review"
    }).catch(() => {});
    if (quizState.mode === "review") {
      persistReviewQuestionSuccess(question).catch(() => {});
    }
    updateQuizStats();
    window.setTimeout(() => {
      goToNextQuestion();
    }, 250);
  }

  function evaluateSelection() {
    if (!selectedLeftButton || !selectedRightButton || isLocked) {
      return;
    }

    const isCorrectMatch = selectedLeftButton.dataset.relationId === selectedRightButton.dataset.relationId;

    if (isCorrectMatch) {
      selectedLeftButton.classList.remove("is-selected");
      selectedRightButton.classList.remove("is-selected");
      selectedLeftButton.classList.add("is-correct");
      selectedRightButton.classList.add("is-correct");
      selectedLeftButton.disabled = true;
      selectedRightButton.disabled = true;
      selectedLeftButton.dataset.matched = "true";
      selectedRightButton.dataset.matched = "true";
      matchedCount += 1;
      clearSelection();

      if (matchedCount === relationPairs.length) {
        finishMatchingQuestion();
      }

      return;
    }

    isLocked = true;
    selectedLeftButton.classList.add("is-wrong");
    selectedRightButton.classList.add("is-wrong");
    const hasExpired = penalizeQuestionTime(10);

    if (hasExpired) {
      return;
    }

    window.setTimeout(() => {
      if (selectedLeftButton) {
        selectedLeftButton.classList.remove("is-selected", "is-wrong");
      }

      if (selectedRightButton) {
        selectedRightButton.classList.remove("is-selected", "is-wrong");
      }

      clearSelection();
      isLocked = false;
    }, 2000);
  }

  function buildRelationButton(item, side) {
    const shortcutNumber = side === "left"
      ? leftItems.findIndex((candidate) => candidate.id === item.id && candidate.text === item.text) + 1
      : leftItems.length + rightItems.findIndex((candidate) => candidate.id === item.id && candidate.text === item.text) + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-match__item";
    button.dataset.relationId = item.id;
    button.dataset.side = side;
    button.dataset.shortcut = String(shortcutNumber);
    button.innerHTML = `
      <span class="quiz-match__item-content">
        <span class="quiz-option__badge">${shortcutNumber}</span>
        <span class="quiz-match__item-text">${item.text}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      if (isLocked || button.dataset.matched === "true") {
        return;
      }

      const currentSelectedButton = side === "left" ? selectedLeftButton : selectedRightButton;

      if (currentSelectedButton === button) {
        button.classList.remove("is-selected");

        if (side === "left") {
          selectedLeftButton = null;
        } else {
          selectedRightButton = null;
        }

        return;
      }

      if (currentSelectedButton) {
        currentSelectedButton.classList.remove("is-selected");
      }

      button.classList.add("is-selected");

      if (side === "left") {
        selectedLeftButton = button;
      } else {
        selectedRightButton = button;
      }

      evaluateSelection();
    });

    return button;
  }

  leftItems.forEach((item) => {
    leftColumn.appendChild(buildRelationButton(item, "left"));
  });

  rightItems.forEach((item) => {
    rightColumn.appendChild(buildRelationButton(item, "right"));
  });

  container.append(leftColumn, rightColumn);
  quizOptions.appendChild(container);
}

function penalizeQuestionTime(seconds) {
  if (!quizState || quizState.isFeedbackVisible) {
    return false;
  }

  quizState.remainingSeconds = Math.max(0, quizState.remainingSeconds - seconds);
  updateQuizStats();

  if (quizState.remainingSeconds === 0) {
    clearQuizTimer();
    handleTimeExpired();
    return true;
  }

  return false;
}

function startQuestionTimer() {
  clearQuizTimer();
  quizState.remainingSeconds = QUIZ_TIME_PER_QUESTION;
  updateQuizStats();

  quizTimerId = window.setInterval(() => {
    if (!quizState) {
      clearQuizTimer();
      return;
    }

    quizState.remainingSeconds -= 1;
    updateQuizStats();

    if (quizState.remainingSeconds <= 0) {
      clearQuizTimer();
      handleTimeExpired();
    }
  }, 1000);
}

function showFeedback({
  status,
  answerText,
  optionExplanation,
  questionExplanation,
  isCorrect,
  showAnswerBlock = true,
  showOptionExplanation = true
}) {
  quizQuestionScreen.hidden = true;
  quizFeedbackScreen.hidden = false;
  quizCompleteScreen.hidden = true;

  quizFeedbackStatus.textContent = status;
  quizFeedbackStatus.classList.toggle("is-correct", isCorrect);
  quizFeedbackStatus.classList.toggle("is-wrong", !isCorrect);
  quizFeedbackAnswerBlock.hidden = !showAnswerBlock;
  quizFeedbackOptionBlock.hidden = !showOptionExplanation;
  quizFeedbackAnswer.textContent = answerText;
  quizFeedbackOptionExplanation.textContent = optionExplanation;

  if (questionExplanation) {
    quizFeedbackQuestionBlock.hidden = false;
    quizFeedbackQuestionExplanation.textContent = questionExplanation;
  } else {
    quizFeedbackQuestionBlock.hidden = true;
    quizFeedbackQuestionExplanation.textContent = "";
  }
}

async function persistFailedQuestions(wrongQuestionRecords) {
  if (!Array.isArray(wrongQuestionRecords) || wrongQuestionRecords.length === 0) {
    return;
  }

  const uniqueQuestions = Array.from(
    new Map(wrongQuestionRecords.map((record) => [record.key, record])).values()
  );
  const result = await saveCompletionState("record_failed_questions", {
    questions: uniqueQuestions
  });
  failedQuestionState = normalizeFailedQuestionsState(result.failedQuestions);
  refreshSidebarAfterQuestionStateChange();
}

function refreshStatisticsPanelIfVisible() {
  if (!activeEntry || activeSectionKey !== getStatisticsSectionKey(activeEntry.themeIndex, activeEntry.topicIndex)) {
    return;
  }

  const topic = syllabus[activeEntry.themeIndex]?.topics?.[activeEntry.topicIndex];

  if (topic) {
    renderStatisticsPanel(topic);
  }
}

async function recordQuizAnswerStat({ topic, section, isCorrect, isCorrection = false }) {
  if (!topic || !section) {
    return;
  }

  await saveCompletionState("record_quiz_answer", {
    themeTitle: syllabus[activeEntry?.themeIndex ?? 0]?.title || "",
    topicTitle: topic.title,
    sectionLabel: section.label,
    sourceLink: section.link,
    isCorrect,
    isCorrection
  });
  refreshStatisticsPanelIfVisible();
}

async function recordQuizCompletionStat(topic, section) {
  if (!topic || !section) {
    return;
  }

  await saveCompletionState("record_quiz_completion", {
    themeTitle: syllabus[activeEntry?.themeIndex ?? 0]?.title || "",
    topicTitle: topic.title,
    sectionLabel: section.label,
    sourceLink: section.link
  });
  refreshStatisticsPanelIfVisible();
}

async function persistReviewQuestionSuccess(question) {
  const questionKey = question?.__failedQuestionKey || getQuestionStorageKey(quizState?.section?.link || "", question);
  const result = await saveCompletionState("mark_review_question_correct", {
    key: questionKey
  });
  failedQuestionState = normalizeFailedQuestionsState(result.failedQuestions);
  refreshSidebarAfterQuestionStateChange();
}

async function deleteFailedQuestion(questionKey, topic) {
  const result = await saveCompletionState("delete_failed_question", {
    key: questionKey
  });
  failedQuestionState = normalizeFailedQuestionsState(result.failedQuestions);
  refreshSidebarAfterQuestionStateChange();
  renderErrorsPanel(topic);
  refreshStatisticsPanelIfVisible();
}

function handleAnswerSelection(selectedOption) {
  if (!quizState || quizState.isFeedbackVisible) {
    return;
  }

  const question = quizState.questions[quizState.currentIndex];
  clearQuizTimer();

  quizState.isFeedbackVisible = true;
  const usesOptionExplanations = Array.isArray(question.opciones);
  const optionExplanation = usesOptionExplanations
    ? selectedOption.explicacion || ""
    : question.explicacion || "";

  if (selectedOption.correcta) {
    quizState.correctCount += 1;
    quizState.answerStatuses[quizState.currentIndex] = "correct";
    recordQuizAnswerStat({
      topic: quizState.topic,
      section: quizState.section,
      isCorrect: true,
      isCorrection: quizState.mode === "review"
    }).catch(() => {});
    if (quizState.mode === "review") {
      persistReviewQuestionSuccess(question).catch(() => {});
    }
    updateQuizStats();
    showFeedback({
      status: "Respuesta correcta",
      answerText: selectedOption.texto,
      optionExplanation,
      questionExplanation: "",
      isCorrect: true,
      showOptionExplanation: Boolean(optionExplanation)
    });
    return;
  }

  quizState.wrongCount += 1;
  quizState.answerStatuses[quizState.currentIndex] = "wrong";
  recordQuizAnswerStat({
    topic: quizState.topic,
    section: quizState.section,
    isCorrect: false,
    isCorrection: false
  }).catch(() => {});
  if (quizState.mode === "standard" && quizState.topic && quizState.section) {
    quizState.wrongQuestionRecords.push(
      buildFailedQuestionRecord(quizState.topic, quizState.section, question)
    );
  }
  quizState.wrongAnswers.push({
    questionText: question.enunciado,
    explanation: question.explicacion || optionExplanation || ""
  });
  updateQuizStats();
  showFeedback({
    status: "Respuesta incorrecta",
    answerText: selectedOption.texto,
    optionExplanation,
    questionExplanation: usesOptionExplanations ? question.explicacion || "" : "",
    isCorrect: false,
    showOptionExplanation: Boolean(optionExplanation)
  });
}

function handleTimeExpired() {
  if (!quizState || quizState.isFeedbackVisible) {
    return;
  }

  const question = quizState.questions[quizState.currentIndex];
  quizState.isFeedbackVisible = true;
  quizState.wrongCount += 1;
  quizState.answerStatuses[quizState.currentIndex] = "wrong";
  recordQuizAnswerStat({
    topic: quizState.topic,
    section: quizState.section,
    isCorrect: false,
    isCorrection: false
  }).catch(() => {});
  if (quizState.mode === "standard" && quizState.topic && quizState.section) {
    quizState.wrongQuestionRecords.push(
      buildFailedQuestionRecord(quizState.topic, quizState.section, question)
    );
  }
  quizState.wrongAnswers.push({
    questionText: question.enunciado,
    explanation: question.explicacion || ""
  });
  quizState.remainingSeconds = 0;
  updateQuizStats();

  showFeedback({
    status: "Tiempo agotado",
    answerText: "",
    optionExplanation: "",
    questionExplanation: question.explicacion || "",
    isCorrect: false,
    showAnswerBlock: false,
    showOptionExplanation: false
  });
}

function completeQuiz() {
  if (quizState?.mode === "standard") {
    persistFailedQuestions(quizState.wrongQuestionRecords).catch(() => {});
    recordQuizCompletionStat(quizState.topic, quizState.section).catch(() => {});
  }

  clearQuizTimer();
  quizQuestionScreen.hidden = true;
  quizFeedbackScreen.hidden = true;
  quizCompleteScreen.hidden = false;
  quizCompleteSummary.textContent =
    `Has completado ${quizState.totalQuestions} preguntas. ` +
    `Aciertos: ${quizState.correctCount}. Fallos: ${quizState.wrongCount}.`;

  if (quizState.wrongAnswers.length > 0) {
    quizCompleteErrors.hidden = false;
    quizCompleteErrorsList.innerHTML = "";

    quizState.wrongAnswers.forEach((item, index) => {
      const errorCard = document.createElement("article");
      errorCard.className = "quiz-complete-error";
      errorCard.innerHTML = `
        <p class="quiz-complete-error__question">${index + 1}. ${item.questionText}</p>
        <p class="quiz-complete-error__explanation">${item.explanation}</p>
      `;
      quizCompleteErrorsList.appendChild(errorCard);
    });
  } else {
    quizCompleteErrors.hidden = true;
    quizCompleteErrorsList.innerHTML = "";
  }
}

function goToNextQuestion() {
  if (!quizState) {
    return;
  }

  quizState.currentIndex += 1;
  quizState.isFeedbackVisible = false;

  if (quizState.currentIndex >= quizState.totalQuestions) {
    completeQuiz();
    return;
  }

  renderQuestion();
  startQuestionTimer();
}

function buildQuizSession(questionBank, options = {}) {
  const selectedQuestions = options.mode === "review"
    ? shuffleArray(questionBank)
    : shuffleArray(questionBank).slice(
        0,
        Math.min(QUIZ_QUESTION_COUNT, questionBank.length)
      );

  return {
    mode: options.mode || "standard",
    topic: options.topic || null,
    section: options.section || null,
    allQuestions: questionBank,
    questions: selectedQuestions,
    totalQuestions: selectedQuestions.length,
    currentIndex: 0,
    correctCount: 0,
    wrongCount: 0,
    answerStatuses: selectedQuestions.map(() => null),
    wrongAnswers: [],
    wrongQuestionRecords: [],
    remainingSeconds: QUIZ_TIME_PER_QUESTION,
    isFeedbackVisible: false,
    hasStarted: false
  };
}

function startQuizSession() {
  if (!quizState || quizState.hasStarted) {
    return;
  }

  quizState.hasStarted = true;
  renderQuestion();
  startQuestionTimer();
}

function getReviewQuestionBank() {
  return shuffleArray(
    Object.values(failedQuestionState)
      .map((entry) => ({
        ...(entry?.questionData || {}),
        __failedQuestionKey: entry?.key || ""
      }))
      .filter((question) => question && typeof question === "object")
  );
}

function renderQuizIntro() {
  const reviewQuestionCount = getReviewQuestionBank().length;
  quizIntroScreen.hidden = false;
  quizQuestionScreen.hidden = true;
  quizFeedbackScreen.hidden = true;
  quizCompleteScreen.hidden = true;
  quizIntroDescription.textContent = reviewQuestionCount > 0
    ? `Elige cómo quieres practicar. Tienes ${reviewQuestionCount} preguntas falladas pendientes de repaso.`
    : "Elige cómo quieres practicar. El tiempo empezará a contar en la primera pregunta.";
  quizReviewButton.disabled = reviewQuestionCount === 0;
}

function renderErrorsPanel(topic) {
  const failedQuestions = getTopicFailedQuestions(topic);

  hideContentViewer();
  hideQuizViewer();
  errorsViewer.hidden = false;
  errorsCompleteErrorsList.innerHTML = "";

  if (failedQuestions.length === 0) {
    errorsCompleteErrors.hidden = true;
    topicDescription.textContent = topic.description || "No hay preguntas falladas pendientes para este tema.";
    return;
  }

  errorsCompleteErrors.hidden = false;
  topicDescription.textContent = topic.description || "Consulta las preguntas falladas guardadas para este tema.";

  failedQuestions.forEach((item, index) => {
    const question = item?.questionData || {};
    const errorCard = document.createElement("article");
    errorCard.className = "quiz-complete-error";
    errorCard.innerHTML = `
      <p class="quiz-complete-error__question">${index + 1}. ${question.enunciado || ""}</p>
      <p class="quiz-complete-error__explanation">${question.explicacion || ""}</p>
      <div class="quiz-complete-error__actions">
        <button class="quiz-complete-error__button" type="button">Eliminar</button>
      </div>
    `;
    const deleteButton = errorCard.querySelector(".quiz-complete-error__button");
    deleteButton.addEventListener("click", async () => {
      deleteButton.disabled = true;

      try {
        await deleteFailedQuestion(item.key, topic);
      } catch (error) {
        deleteButton.disabled = false;
        topicDescription.textContent = error.message;
      }
    });
    errorsCompleteErrorsList.appendChild(errorCard);
  });
}

function getTopicStatsKey(themeTitle, topicTitle) {
  return JSON.stringify([themeTitle || "", topicTitle || ""]);
}

function getTopicStatsEntry(themeIndex, topic) {
  const themeTitle = syllabus[themeIndex]?.title || "";
  const topicTitle = topic?.title || "";
  return statsState.topics?.[getTopicStatsKey(themeTitle, topicTitle)] || null;
}

function formatStatisticsDate(value) {
  if (!value) {
    return "Sin registro";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatRelativeStatisticsTime(value) {
  if (!value) {
    return "Pendiente";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pendiente";
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `Hace ${Math.max(1, diffHours)} hora${Math.max(1, diffHours) === 1 ? "" : "s"}`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  return `Hace ${diffWeeks} semana${diffWeeks === 1 ? "" : "s"}`;
}

function getStatisticsSectionKeyName(section) {
  const normalizedLabel = normalizeSectionLabel(section?.label);

  if (section?.pageType === "preguntas" || normalizedLabel === "preguntas") {
    return "practicas";
  }

  if (normalizedLabel === "teoria") {
    return "teoria";
  }

  if (normalizedLabel === "resumen") {
    return "resumen";
  }

  return normalizedLabel;
}

function getStatisticsSectionDisplayName(sectionKey) {
  if (sectionKey === "teoria") {
    return "Teoría";
  }

  if (sectionKey === "resumen") {
    return "Resumen";
  }

  if (sectionKey === "practicas") {
    return "Prácticas";
  }

  return sectionKey;
}

function getTopicSectionStats(themeIndex, topic) {
  const topicStats = getTopicStatsEntry(themeIndex, topic);
  const lastCompletions = topicStats?.lastSectionCompletions || {};

  return (Array.isArray(topic?.sections) ? topic.sections : [])
    .filter((section) => {
      const sectionKey = getStatisticsSectionKeyName(section);
      return sectionKey === "teoria" || sectionKey === "resumen" || sectionKey === "practicas";
    })
    .map((section) => {
      const sectionKey = getStatisticsSectionKeyName(section);
      const currentCompletion = completionState[getSectionKey(themeIndex, activeEntry.topicIndex, section)] || null;
      const lastCompletion = lastCompletions[sectionKey] || null;
      const completedAt = currentCompletion?.completedAt || lastCompletion?.completedAt || null;

      return {
        key: sectionKey,
        label: getStatisticsSectionDisplayName(sectionKey),
        completedAt,
        isCompleted: Boolean(currentCompletion),
      };
    });
}

function renderStatisticsPanel(topic) {
  hideAllContentModes();
  statisticsViewer.hidden = false;
  topicDescription.textContent = topic.description || "";
  hideSectionToolbar();

  if (!activeEntry) {
    statisticsViewer.innerHTML = '<div class="statistics-viewer__empty"></div>';
    return;
  }

  const topicStats = getTopicStatsEntry(activeEntry.themeIndex, topic);
  const sectionStats = getTopicSectionStats(activeEntry.themeIndex, topic);
  const quizStats = topicStats?.quiz || {};
  const correctAnswers = Number(quizStats.correctAnswers || 0);
  const wrongAnswers = Number(quizStats.wrongAnswers || 0);
  const resolvedFailedQuestions = Number(quizStats.resolvedFailedQuestions || 0);
  const totalAnswers = Number(quizStats.totalAnswers || 0);
  const testsCompleted = Number(quizStats.testsCompleted || 0);
  const currentFailedQuestions = getTopicFailedQuestions(topic);
  const totalFailedQuestions = resolvedFailedQuestions + currentFailedQuestions.length;
  const reviewedButPendingQuestions = currentFailedQuestions.filter((entry) => Number(entry?.reviewCorrectCount || 0) > 0).length;
  const answeredBase = Math.max(1, totalAnswers);
  const correctPercent = Math.round((correctAnswers / answeredBase) * 100);
  const wrongPercent = Math.round((wrongAnswers / answeredBase) * 100);
  const correctedPercent = totalFailedQuestions > 0
    ? Math.min(100, Math.round((resolvedFailedQuestions / totalFailedQuestions) * 100))
    : 0;

  statisticsViewer.innerHTML = `
    <div class="statistics-dashboard">
      <section class="statistics-panel statistics-panel--hero">
        <div class="statistics-metric-card">
          <p class="statistics-panel__eyebrow">Tests completados</p>
          <p class="statistics-metric-card__value">${testsCompleted}</p>
        </div>
        <div class="statistics-metric-card">
          <p class="statistics-panel__eyebrow">Preguntas respondidas</p>
          <p class="statistics-metric-card__value">${totalAnswers}</p>
        </div>
        <div class="statistics-metric-card">
          <p class="statistics-panel__eyebrow">Aciertos</p>
          <p class="statistics-metric-card__value">${correctAnswers}</p>
          <p class="statistics-metric-card__meta">${correctPercent}%</p>
        </div>
        <div class="statistics-metric-card">
          <p class="statistics-panel__eyebrow">Fallos</p>
          <p class="statistics-metric-card__value">${wrongAnswers}</p>
          <p class="statistics-metric-card__meta">${wrongPercent}%</p>
        </div>
        <div class="statistics-metric-card">
          <p class="statistics-panel__eyebrow">Corregidas</p>
          <p class="statistics-metric-card__value">${resolvedFailedQuestions}</p>
          <p class="statistics-metric-card__meta">${correctedPercent}% de fallos</p>
        </div>
      </section>

      <section class="statistics-panel">
        <div class="statistics-panel__header">
          <div>
            <p class="statistics-panel__eyebrow">Secciones</p>
            <h3 class="statistics-panel__title">Fechas de completado</h3>
          </div>
        </div>
        <div class="statistics-section-grid">
          ${sectionStats.map((section) => `
            <article class="statistics-section-card ${section.isCompleted ? "is-completed" : ""}">
              <p class="statistics-section-card__title">Finalización de ${section.label === "Teoría" ? "la teoría" : section.label === "Resumen" ? "del resumen" : "las preguntas"}</p>
              <p class="statistics-section-card__time">${formatRelativeStatisticsTime(section.completedAt)}</p>
              <p class="statistics-section-card__date">${formatStatisticsDate(section.completedAt)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <div class="statistics-panel-grid">
        <section class="statistics-panel">
          <div class="statistics-panel__header">
            <div>
              <p class="statistics-panel__eyebrow">Resultados</p>
              <h3 class="statistics-panel__title">Aciertos y fallos</h3>
            </div>
          </div>
          <div class="statistics-bar-chart">
            <div class="statistics-bar-chart__track">
              <span class="statistics-bar-chart__segment is-correct" style="width:${correctPercent}%"></span>
              <span class="statistics-bar-chart__segment is-wrong" style="width:${wrongPercent}%"></span>
            </div>
            <div class="statistics-bar-chart__legend">
              <div class="statistics-bar-chart__legend-item">
                <span class="statistics-bar-chart__dot is-correct"></span>
                <span>Aciertos ${correctAnswers} (${correctPercent}%)</span>
              </div>
              <div class="statistics-bar-chart__legend-item">
                <span class="statistics-bar-chart__dot is-wrong"></span>
                <span>Fallos ${wrongAnswers} (${wrongPercent}%)</span>
              </div>
            </div>
          </div>
        </section>

        <section class="statistics-panel">
          <div class="statistics-panel__header">
            <div>
              <p class="statistics-panel__eyebrow">Correcciones</p>
              <h3 class="statistics-panel__title">% de preguntas corregidas</h3>
            </div>
          </div>
          <div class="statistics-correction">
            <div class="statistics-donut" style="--statistics-progress:${correctedPercent}%;">
              <div class="statistics-donut__inner">
                <strong>${correctedPercent}%</strong>
              </div>
            </div>
            <div class="statistics-correction__copy">
              <p>Total de preguntas falladas: <strong>${totalFailedQuestions}</strong></p>
              <p>Preguntas corregidas: <strong>${resolvedFailedQuestions}</strong></p>
              <p>Falladas y acertadas pero no corregidas: <strong>${reviewedButPendingQuestions}</strong></p>
              <p>Falladas pendientes: <strong>${currentFailedQuestions.length}</strong></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function isDisplaySectionCompleted(section) {
  if (!activeEntry || section.pageType === "errors" || section.pageType === "statistics") {
    return false;
  }

  return Boolean(completionState[section.sectionKey]);
}

function updateSectionBarActiveState() {
  Array.from(topicSectionsBar.querySelectorAll(".topic-sections-bar__button")).forEach((button) => {
    const isActive = Boolean(activeSectionKey) && button.dataset.sectionKey === activeSectionKey;
    button.classList.toggle("is-active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function renderTopicSectionsBar(themeIndex, topicIndex, topic) {
  if (!isSelectableTopic(topic)) {
    topicSectionsBar.hidden = true;
    topicSectionsBar.innerHTML = "";
    return;
  }

  topicSectionsBar.hidden = false;
  topicSectionsBar.innerHTML = "";

  getTopicSectionsForDisplay(themeIndex, topicIndex, topic).forEach((section) => {
    const button = document.createElement("button");
    const isCompleted = isDisplaySectionCompleted(section);
    button.type = "button";
    button.className = "topic-sections-bar__button";
    button.dataset.sectionKey = section.sectionKey;
    button.dataset.pageType = section.pageType;
    button.classList.toggle("is-completed", isCompleted);
    button.innerHTML = `
      <span class="topic-sections-bar__button-content">
        <i class="${section.displayIcon}" aria-hidden="true"></i>
        <span>${section.displayLabel}</span>
        <span class="topic-sections-bar__button-status" ${isCompleted ? "" : "hidden"}>
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        </span>
      </span>
    `;
    button.classList.toggle("is-disabled", section.pageType !== "statistics" && !isSectionAvailable(themeIndex, topicIndex, topic, section));
    button.addEventListener("click", async () => {
      try {
        if (section.pageType === "statistics") {
          hideSectionToolbar();
          setActiveSection(section.sectionKey);
          renderStatisticsPanel(topic);
          return;
        }

        if (section.pageType === "errors") {
          setCurrentSection(themeIndex, topicIndex, topic, section);
          setActiveSection(section.sectionKey);
          await openSectionInPanel(topic, section);
          return;
        }

        if (!hasSectionContent(section)) {
          const opened = await openTopicTargetSection(
            themeIndex,
            topicIndex,
            topic,
            section.label
          );

          if (!opened) {
            clearActiveSectionState();
            renderSections(topic);
          }

          return;
        }

        setCurrentSection(themeIndex, topicIndex, topic, section);
        setActiveSection(section.sectionKey);
        await openSectionInPanel(topic, section);
      } catch (error) {
        topicTitle.textContent = topic.title;
        topicDescription.textContent = error.message;
        hideAllContentModes();
      }
    });
    topicSectionsBar.appendChild(button);
  });

  updateSectionBarActiveState();
}

async function openQuizInPanel(topic, section) {
  if (!section.link || section.link === "#") {
    topicTitle.textContent = topic.title;
    topicDescription.textContent = topic.description || `La sección ${section.label} todavía no tiene cuestionario enlazado.`;
    hideAllContentModes();
    return;
  }

  const questionBank = await loadJsonResource(section.link);

  if (!Array.isArray(questionBank) || questionBank.length === 0) {
    throw new Error(`El cuestionario ${section.link} no contiene preguntas válidas.`);
  }

  topicTitle.textContent = topic.title;
  topicDescription.textContent =
    topic.description || "Responde el cuestionario y revisa la explicación de cada respuesta.";
  setTopicHeaderVisibility(false);
  setQuizLayoutState(true);

  hideContentViewer();
  quizViewer.hidden = false;
  quizSessionSeed = { topic, section, questionBank };
  quizState = buildQuizSession(questionBank, {
    mode: "standard",
    topic,
    section
  });
  renderQuizIntro();
  updateQuizStats();
}

async function openSectionInPanel(topic, section) {
  hideStatisticsViewer();
  hideErrorsViewer();
  setTopicHeaderVisibility(true);
  setQuizLayoutState(false);
  topicTitle.textContent = topic.title;

  if (section.pageType === "preguntas") {
    await openQuizInPanel(topic, section);
    return;
  }

  if (section.pageType === "errors") {
    renderErrorsPanel(topic);
    return;
  }

  if (!section.link || section.link === "#") {
    topicDescription.textContent = topic.description || `La sección ${section.label} todavía no tiene contenido enlazado.`;
    hideAllContentModes();
    return;
  }

  if (section.pageType === "html") {
    topicDescription.textContent = topic.description || `Mostrando la sección ${section.label} en el panel de lectura.`;
    hideQuizViewer();
    contentViewerLabel.textContent = `${section.label} · ${topic.title}`;
    contentFrame.src = section.link;
    syncContentViewerVisibility();
    return;
  }

  topicDescription.textContent = `El tipo de página ${section.pageType} todavía no está soportado.`;
  hideAllContentModes();
  hideSectionToolbar();
}

function renderTopicProgress(themeIndex) {
  const theme = syllabus[themeIndex];

  if (!theme || !Array.isArray(theme.topics)) {
    hideTopicProgress();
    return;
  }

  const selectableTopics = theme.topics
    .map((topic, topicIndex) => ({
      topic,
      topicIndex
    }))
    .filter(({ topic }) => isSelectableTopic(topic));

  if (selectableTopics.length === 0) {
    hideTopicProgress();
    return;
  }

  let completedCount = 0;
  topicProgress.hidden = false;
  topicProgressNav.innerHTML = "";

  selectableTopics.forEach(({ topic, topicIndex }) => {
    const isCompleted = isTopicComplete(themeIndex, topicIndex, topic);
    const isStarted = !isCompleted && isTopicStarted(themeIndex, topicIndex, topic);
    const isActive =
      activeEntry &&
      activeEntry.themeIndex === themeIndex &&
      activeEntry.topicIndex === topicIndex;
    const progressButton = document.createElement("button");

    if (isCompleted) {
      completedCount += 1;
    }

    progressButton.type = "button";
    progressButton.className = "topic-progress__item";
    progressButton.classList.toggle("is-completed", isCompleted);
    progressButton.classList.toggle("is-started", isStarted);
    progressButton.classList.toggle("is-active", isActive);
    progressButton.setAttribute("aria-label", topic.title);
    progressButton.title = topic.title;
    progressButton.addEventListener("click", () => {
      selectTopicAndOpenDefault(themeIndex, topicIndex).catch((error) => {
        topicTitle.textContent = topic.title;
        topicDescription.textContent = error.message;
        hideAllContentModes();
      });
    });
    topicProgressNav.appendChild(progressButton);
  });

  topicProgressCount.textContent = `${completedCount}/${selectableTopics.length}`;
}

function getSectionKey(themeIndex, topicIndex, section) {
  const theme = syllabus[themeIndex];
  const topic = theme?.topics?.[topicIndex];

  return JSON.stringify([
    theme?.title || "",
    topic?.title || "",
    section.label || "",
    section.pageType || "",
    section.link || "#"
  ]);
}

function getCurrentSectionPayload() {
  if (!currentSection) {
    return null;
  }

  return {
    key: currentSection.key,
    themeTitle: currentSection.themeTitle,
    topicTitle: currentSection.topicTitle,
    sectionLabel: currentSection.sectionLabel,
    pageType: currentSection.pageType,
    link: currentSection.link
  };
}

function hideSectionToolbar() {
  sectionToolbar.hidden = true;
  currentSection = null;
}

function updateCompletionToggle() {
  if (!currentSection) {
    hideSectionToolbar();
    return;
  }

  const isCompleted = Boolean(completionState[currentSection.key]);
  sectionToolbar.hidden = false;
  contentViewerLabel.textContent = `${currentSection.sectionLabel} · ${currentSection.topicTitle}`;
  const completionLabel = isCompleted
    ? "Desmarcar como completado"
    : "Marcar como completado";
  completionToggle.innerHTML = isCompleted
    ? '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i>'
    : '<i class="fa-solid fa-check" aria-hidden="true"></i>';
  completionToggle.setAttribute("aria-label", completionLabel);
  completionToggle.setAttribute("title", completionLabel);
  completionToggle.classList.toggle("is-completed", isCompleted);
}

function setCurrentSection(themeIndex, topicIndex, topic, section) {
  currentSection = {
    key: getSectionKey(themeIndex, topicIndex, section),
    themeIndex,
    topicIndex,
    themeTitle: syllabus[themeIndex].title,
    topicTitle: topic.title,
    sectionLabel: section.label,
    pageType: section.pageType,
    link: section.link || "#"
  };

  updateCompletionToggle();
  persistCurrentSection();
}

function getTopicCode(title) {
  const match = title.match(/^(\d+(?:\.\d+)*)\.?\s/);
  return match ? match[1] : null;
}

function getTopicDepth(title) {
  const code = getTopicCode(title);
  return code ? code.split(".").length - 1 : 0;
}

function annotateThemeTopics(topics) {
  return topics.map((topic, index) => {
    const code = getTopicCode(topic.title);
    const hasChildren = code
      ? topics.slice(index + 1).some((candidate) => {
          const candidateCode = getTopicCode(candidate.title);
          return candidateCode && candidateCode.startsWith(`${code}.`);
        })
      : false;

    return {
      ...topic,
      code,
      level: topic.level ?? getTopicDepth(topic.title),
      hasChildren: topic.hasChildren ?? hasChildren
    };
  });
}

function isSelectableTopic(topic) {
  return Array.isArray(topic.sections) && topic.sections.length > 0 && !topic.hasChildren;
}

function isDescendantTopicCode(candidateCode, ancestorCode) {
  return Boolean(candidateCode && ancestorCode && candidateCode.startsWith(`${ancestorCode}.`));
}

function getAncestorTopicCodes(topicCode) {
  if (!topicCode) {
    return [];
  }

  const parts = topicCode.split(".");
  const ancestors = [];

  for (let index = 1; index < parts.length; index += 1) {
    ancestors.push(parts.slice(0, index).join("."));
  }

  return ancestors;
}

function updateBranchVisibility() {
  const hasSearchQuery = topicSearch.value.trim() !== "";

  topicEntries.forEach((entry) => {
    const isHiddenByCollapsedBranch =
      !hasSearchQuery &&
      entry.ancestorCodes.some((ancestorCode) => !expandedBranchKeys.has(ancestorCode));
    entry.card.classList.toggle("is-collapsed-by-branch", isHiddenByCollapsedBranch);
  });
}

function isTopicComplete(themeIndex, topicIndex, topic) {
  if (!isSelectableTopic(topic)) {
    return false;
  }

  const completableSections = topic.sections.filter((section) => section.pageType !== "errors");

  if (completableSections.length === 0) {
    return false;
  }

  return completableSections.every((section) => {
    const sectionKey = getSectionKey(themeIndex, topicIndex, section);
    return Boolean(completionState[sectionKey]);
  });
}

function isTopicStarted(themeIndex, topicIndex, topic) {
  if (!isSelectableTopic(topic)) {
    return false;
  }

  return topic.sections
    .filter((section) => section.pageType !== "errors")
    .some((section) => {
    const sectionKey = getSectionKey(themeIndex, topicIndex, section);
    return Boolean(completionState[sectionKey]);
  });
}

function normalizeSectionLabel(label) {
  return String(label || "").trim().toLowerCase();
}

function getSectionDisplayLabel(section) {
  if (section?.pageType === "errors") {
    return "Repaso";
  }

  return section?.label || "";
}

function getSectionDisplayIcon(section) {
  const normalizedLabel = normalizeSectionLabel(section?.label);

  if (section?.pageType === "errors") {
    return "fa-solid fa-triangle-exclamation";
  }

  if (section?.pageType === "statistics") {
    return "fa-solid fa-chart-column";
  }

  if (normalizedLabel === "teoria") {
    return "fa-solid fa-book-open";
  }

  if (normalizedLabel === "resumen") {
    return "fa-solid fa-file-lines";
  }

  if (normalizedLabel === "preguntas") {
    return "fa-solid fa-circle-question";
  }

  return section?.icon || "fa-solid fa-folder";
}

function getStatisticsSectionKey(themeIndex, topicIndex) {
  return JSON.stringify([
    syllabus[themeIndex]?.title || "",
    syllabus[themeIndex]?.topics?.[topicIndex]?.title || "",
    "Estadísticas",
    "statistics"
  ]);
}

function getTopicSectionsForDisplay(themeIndex, topicIndex, topic) {
  const displayedSections = getSortedTopicSections(topic)
    .filter(({ section }) => isSectionAvailable(themeIndex, topicIndex, topic, section))
    .map(({ section }) => ({
      ...section,
      displayLabel: getSectionDisplayLabel(section),
      displayIcon: getSectionDisplayIcon(section),
      sectionKey: getSectionKey(themeIndex, topicIndex, section)
    }));

  displayedSections.push({
    label: "Estadísticas",
    displayLabel: "Estadísticas",
    displayIcon: getSectionDisplayIcon({ pageType: "statistics" }),
    pageType: "statistics",
    link: "#",
    sectionKey: getStatisticsSectionKey(themeIndex, topicIndex)
  });

  return displayedSections;
}

function hasSectionContent(section) {
  return Boolean(section?.link) && section.link !== "#";
}

function isSectionAvailable(themeIndex, topicIndex, topic, section) {
  if (section?.pageType === "errors") {
    return hasTopicErrors(topic);
  }

  return hasSectionContent(section);
}

function getSectionPriorityIndex(section) {
  return SECTION_PRIORITY.indexOf(normalizeSectionLabel(section?.label));
}

function getSortedTopicSections(topic) {
  if (!Array.isArray(topic?.sections)) {
    return [];
  }

  return topic.sections
    .map((section, index) => ({
      section,
      index,
      priorityIndex: getSectionPriorityIndex(section)
    }))
    .sort((left, right) => {
      const leftPriority = left.priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : left.priorityIndex;
      const rightPriority = right.priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : right.priorityIndex;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.index - right.index;
    });
}

function findNextPendingSection(themeIndex, topicIndex, topic, startLabel = null) {
  const sortedSections = getSortedTopicSections(topic);

  if (sortedSections.length === 0) {
    return null;
  }

  const normalizedStartLabel = normalizeSectionLabel(startLabel);
  const startIndex = normalizedStartLabel
    ? sortedSections.findIndex(({ section }) => normalizeSectionLabel(section.label) === normalizedStartLabel)
    : -1;
  const candidateSections = startIndex >= 0
    ? sortedSections.slice(startIndex + 1)
    : sortedSections;

  for (const { section } of candidateSections) {
    if (!isSectionAvailable(themeIndex, topicIndex, topic, section)) {
      continue;
    }

    const sectionKey = getSectionKey(themeIndex, topicIndex, section);

    if (!completionState[sectionKey]) {
      return section;
    }
  }

  return null;
}

async function openTopicStatistics(themeIndex, topicIndex, topic) {
  renderTopicSectionsBar(themeIndex, topicIndex, topic);
  hideSectionToolbar();
  setActiveSection(getStatisticsSectionKey(themeIndex, topicIndex));
  renderStatisticsPanel(topic);
  closeMobileMenu();
}

async function openTopicTargetSection(themeIndex, topicIndex, topic, startLabel = null) {
  const targetSection = findNextPendingSection(themeIndex, topicIndex, topic, startLabel);

  if (!targetSection) {
    await openTopicStatistics(themeIndex, topicIndex, topic);
    return true;
  }

  const sectionKey = getSectionKey(themeIndex, topicIndex, targetSection);
  setCurrentSection(themeIndex, topicIndex, topic, targetSection);
  setActiveSection(sectionKey);
  await openSectionInPanel(topic, targetSection);
  closeMobileMenu();
  return true;
}

function persistCurrentSection() {
  if (!currentSection?.key) {
    return;
  }

  setCookie(LAST_SECTION_COOKIE, currentSection.key);
}

function findSectionEntryByKey(targetKey) {
  for (let themeIndex = 0; themeIndex < syllabus.length; themeIndex += 1) {
    const theme = syllabus[themeIndex];

    for (let topicIndex = 0; topicIndex < theme.topics.length; topicIndex += 1) {
      const topic = theme.topics[topicIndex];

      if (!isSelectableTopic(topic) || !Array.isArray(topic.sections)) {
        continue;
      }

      for (const section of topic.sections) {
        if (getSectionKey(themeIndex, topicIndex, section) === targetKey) {
          return {
            themeIndex,
            topicIndex,
            topic,
            section
          };
        }
      }
    }
  }

  return null;
}

async function restoreLastVisitedSection() {
  const savedSectionKey = getCookie(LAST_SECTION_COOKIE);

  if (!savedSectionKey) {
    return false;
  }

  const savedEntry = findSectionEntryByKey(savedSectionKey);

  if (!savedEntry) {
    return false;
  }

  activeThemeIndex = savedEntry.themeIndex;
  buildThemeSelector();
  syncSidebarForTheme(savedEntry.themeIndex);
  setActiveTopic(savedEntry.themeIndex, savedEntry.topicIndex);
  setCurrentSection(savedEntry.themeIndex, savedEntry.topicIndex, savedEntry.topic, savedEntry.section);
  setActiveSection(savedSectionKey);
  await openSectionInPanel(savedEntry.topic, savedEntry.section);
  return true;
}

function findFirstSelectableEntry() {
  return topicEntries.find((entry) => entry.isSelectable && !entry.card.hidden && !entry.card.classList.contains("is-collapsed-by-branch")) ?? null;
}

function applyTopicFilterVisibility(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchedCodes = new Set(
    topicEntries
      .filter((topicEntry) => topicEntry.title.toLowerCase().includes(normalizedQuery))
      .map((topicEntry) => topicEntry.code)
      .filter(Boolean)
  );
  const visibleCodes = new Set();

  if (normalizedQuery === "") {
    topicEntries.forEach((topicEntry) => {
      topicEntry.card.hidden = false;
    });
    updateBranchVisibility();
    return;
  }

  matchedCodes.forEach((code) => {
    visibleCodes.add(code);
    getAncestorTopicCodes(code).forEach((ancestorCode) => {
      visibleCodes.add(ancestorCode);
      expandedBranchKeys.add(ancestorCode);
    });
  });

  topicEntries.forEach((topicEntry) => {
    topicEntry.card.hidden = !visibleCodes.has(topicEntry.code);
    topicEntry.card.classList.remove("is-collapsed-by-branch");
  });
}

function restoreSidebarSelectionState() {
  topicEntries.forEach((entry) => {
    const isActiveTopic =
      activeEntry &&
      entry.themeIndex === activeEntry.themeIndex &&
      entry.topicIndex === activeEntry.topicIndex;

    entry.button.classList.toggle("is-active", Boolean(isActiveTopic));
    const isExpandedBranch = entry.isBranch && expandedBranchKeys.has(entry.code);
    entry.button.classList.toggle("is-expanded", isExpandedBranch);
    entry.button.setAttribute("aria-expanded", isExpandedBranch ? "true" : "false");
  });

  updateBranchVisibility();
  updateSectionBarActiveState();
}

function refreshSidebarAfterQuestionStateChange() {
  buildSidebar();
  applyTopicFilterVisibility(topicSearch.value);
  restoreSidebarSelectionState();

  if (activeEntry) {
    const topic = syllabus[activeEntry.themeIndex]?.topics?.[activeEntry.topicIndex];

    if (topic && isSelectableTopic(topic)) {
      renderTopicSectionsBar(activeEntry.themeIndex, activeEntry.topicIndex, topic);
    }
  }
}

function resetNavigationState() {
  topicEntries.length = 0;
  topicsList.innerHTML = "";
}

function renderSections(topic) {
  topicTitle.textContent = topic.title;
  topicDescription.textContent = topic.description || "Selecciona una sección para abrir su contenido aquí.";
  hideAllContentModes();

  if (!isSelectableTopic(topic)) {
    topicSectionsBar.hidden = true;
    topicSectionsBar.innerHTML = "";
    hideTopicProgress();
    topicDescription.textContent = "Este punto agrupa subtemas. Selecciona uno de los puntos hijos del menú lateral.";
    return;
  }

  if (activeEntry) {
    renderTopicSectionsBar(activeEntry.themeIndex, activeEntry.topicIndex, topic);
    renderTopicProgress(activeEntry.themeIndex);
  }

  hideSectionToolbar();
}

function clearActiveSectionState() {
  activeSectionKey = null;
  updateSectionBarActiveState();

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }
}

function setActiveSection(sectionKey) {
  activeSectionKey = sectionKey;
  updateSectionBarActiveState();

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }
}

function applyCompletionStateToSidebar() {
  topicEntries.forEach((entry) => {
    const topic = syllabus[entry.themeIndex]?.topics?.[entry.topicIndex];
    entry.isCompleted = Boolean(topic) && isTopicComplete(entry.themeIndex, entry.topicIndex, topic);
    entry.label.classList.toggle("is-complete", entry.isCompleted);
  });

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }

  updateCompletionToggle();
}

function setActiveTopic(themeIndex, topicIndex) {
  const topic = syllabus[themeIndex].topics[topicIndex];

  if (!isSelectableTopic(topic)) {
    return;
  }

  activeEntry = { themeIndex, topicIndex };
  getAncestorTopicCodes(topic.code).forEach((ancestorCode) => {
    expandedBranchKeys.add(ancestorCode);
  });
  restoreSidebarSelectionState();

  renderSections(topic);
  clearActiveSectionState();
}

async function selectTopicAndOpenDefault(themeIndex, topicIndex) {
  const topic = syllabus[themeIndex]?.topics?.[topicIndex];

  if (!topic || !isSelectableTopic(topic)) {
    return;
  }

  setActiveTopic(themeIndex, topicIndex);
  await openTopicTargetSection(themeIndex, topicIndex, topic);
}

function buildThemeSelector() {
  themeSelect.innerHTML = "";

  syllabus.forEach((theme, themeIndex) => {
    const option = document.createElement("option");
    option.value = String(themeIndex);
    option.textContent = theme.title;
    themeSelect.appendChild(option);
  });

  themeSelect.value = String(activeThemeIndex);
}

function buildSidebar() {
  resetNavigationState();

  const theme = syllabus[activeThemeIndex];

  if (!theme) {
    return;
  }

  theme.topics.forEach((topic, topicIndex) => {
    const card = document.createElement("section");
    card.className = "topic-card";

    const button = document.createElement("button");
    const isBranch = Boolean(topic.hasChildren);
    button.type = "button";
    button.className = "topic-button";
    button.classList.toggle("is-branch", isBranch);
    button.style.paddingLeft = `${16 + (topic.level ?? 0) * 18}px`;
    button.setAttribute("aria-expanded", isBranch && expandedBranchKeys.has(topic.code) ? "true" : "false");
    button.addEventListener("click", () => {
      if (isBranch) {
        if (expandedBranchKeys.has(topic.code)) {
          expandedBranchKeys.delete(topic.code);
        } else {
          expandedBranchKeys.add(topic.code);
        }
        restoreSidebarSelectionState();
        return;
      }

      try {
        selectTopicAndOpenDefault(activeThemeIndex, topicIndex).catch((error) => {
          topicTitle.textContent = topic.title;
          topicDescription.textContent = error.message;
          hideAllContentModes();
        });
        closeMobileMenu();
      } catch (error) {
        topicTitle.textContent = topic.title;
        topicDescription.textContent = error.message;
        hideAllContentModes();
      }
    });

    const label = document.createElement("span");
    label.className = "topic-button__label";
    label.textContent = topic.title;

    const icon = document.createElement("span");
    icon.className = "topic-button__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = isBranch ? ">" : "";

    button.append(label, icon);
    card.append(button);
    topicsList.appendChild(card);
    topicEntries.push({
      card,
      button,
      label,
      themeIndex: activeThemeIndex,
      topicIndex,
      title: topic.title,
      code: topic.code || String(topicIndex),
      ancestorCodes: getAncestorTopicCodes(topic.code),
      isSelectable: isSelectableTopic(topic),
      isBranch
    });
  });

  applyCompletionStateToSidebar();
  restoreSidebarSelectionState();
}
function filterTopics(query, autoOpenFirst = true) {
  applyTopicFilterVisibility(query);

  const firstVisibleEntry = findFirstSelectableEntry();

  if (firstVisibleEntry !== null) {
    if (autoOpenFirst) {
      selectTopicAndOpenDefault(firstVisibleEntry.themeIndex, firstVisibleEntry.topicIndex).catch(() => {});
    }
    return;
  }

  if (query.trim() === "") {
    topicTitle.textContent = "Selecciona un tema";
    topicDescription.textContent = "Despliega un topic del menú lateral y elige un subtopic para ver sus secciones.";
    topicSectionsBar.hidden = true;
    topicSectionsBar.innerHTML = "";
    hideAllContentModes();
    hideTopicProgress();
    hideSectionToolbar();
    return;
  }

  topicTitle.textContent = "Sin resultados";
  topicDescription.textContent = "No hay temas que coincidan con la búsqueda actual.";
  topicSectionsBar.hidden = true;
  topicSectionsBar.innerHTML = "";
  hideAllContentModes();
  hideTopicProgress();
  hideSectionToolbar();
}

function syncSidebarForTheme(themeIndex) {
  activeThemeIndex = themeIndex;
  activeEntry = null;
  activeSectionKey = null;
  currentSection = null;
  expandedBranchKeys.clear();
  buildSidebar();
  filterTopics(topicSearch.value);

  if (findFirstSelectableEntry() !== null || topicEntries.some((entry) => entry.isSelectable)) {
    return;
  }

  topicTitle.textContent = "Sin contenidos seleccionables";
  topicDescription.textContent = "No hay subtemas finales disponibles en el tema seleccionado.";
  topicSectionsBar.hidden = true;
  topicSectionsBar.innerHTML = "";
  hideAllContentModes();
  hideTopicProgress();
  hideSectionToolbar();
}

async function loadSyllabus() {
  const data = await loadJsonResource("data/index.json");

  if (!Array.isArray(data.syllabus)) {
    throw new Error("El JSON no contiene una propiedad syllabus válida.");
  }

  syllabus = data.syllabus.map((theme) => ({
    ...theme,
    topics: annotateThemeTopics(theme.topics)
  }));
}

async function loadCompletionData() {
  const data = await fetchCompletionState();
  completionState = data.items && typeof data.items === "object" ? data.items : {};
  failedQuestionState = normalizeFailedQuestionsState(data.failedQuestions);
  statsState = normalizeStatsState(data.stats);
}

async function toggleCurrentSectionCompletion() {
  const payload = getCurrentSectionPayload();

  if (!payload) {
    return;
  }

  const isCompleted = Boolean(completionState[payload.key]);
  completionToggle.classList.add("is-busy");

  try {
    const result = await saveCompletionState(
      isCompleted ? "uncomplete" : "complete",
      payload
    );
    completionState = result.items && typeof result.items === "object" ? result.items : {};
    applyCompletionStateToSidebar();

    if (activeEntry) {
      const topic = syllabus[activeEntry.themeIndex]?.topics?.[activeEntry.topicIndex];

      if (topic && isSelectableTopic(topic)) {
        renderTopicSectionsBar(activeEntry.themeIndex, activeEntry.topicIndex, topic);
        setActiveSection(activeSectionKey);
      }
    }
  } finally {
    completionToggle.classList.remove("is-busy");
  }
}

async function init() {
  try {
    await Promise.all([loadSyllabus(), loadCompletionData()]);
    if (await restoreLastVisitedSection()) {
      return;
    }

    buildThemeSelector();
    syncSidebarForTheme(activeThemeIndex);
  } catch (error) {
    topicTitle.textContent = "Error al cargar el temario";
    topicDescription.textContent = error.message;
    hideAllContentModes();
    hideSectionToolbar();
  }
}

themeSelect.addEventListener("change", (event) => {
  const nextThemeIndex = Number.parseInt(event.target.value, 10);

  if (Number.isNaN(nextThemeIndex)) {
    return;
  }

  syncSidebarForTheme(nextThemeIndex);
});

mobileMenuOpenButton.addEventListener("click", () => {
  openMobileMenu();
});

mobileMenuCloseButton.addEventListener("click", () => {
  closeMobileMenu();
});

topicSearch.addEventListener("input", (event) => {
  filterTopics(event.target.value, !isMobileLayout());

  if (findFirstSelectableEntry() === null) {
    hideSectionToolbar();
  }
});

completionToggle.addEventListener("click", async (event) => {
  event.preventDefault();

  try {
    await toggleCurrentSectionCompletion();
  } catch (error) {
    topicDescription.textContent = error.message;
  }
});

quizNextButton.addEventListener("click", () => {
  goToNextQuestion();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || quizFeedbackScreen.hidden) {
  } else {
    event.preventDefault();
    goToNextQuestion();
    return;
  }

  if (!quizState || quizQuestionScreen.hidden || quizState.isFeedbackVisible) {
    return;
  }

  const question = quizState.questions?.[quizState.currentIndex];
  const questionType = question?.tipo;

  if (
    questionType !== "pregunta abcd" &&
    questionType !== "pregunta verdadero-falso" &&
    questionType !== "relacionar"
  ) {
    return;
  }

  const pressedKey = String(event.key || "").trim().toLowerCase();

  if (!pressedKey) {
    return;
  }

  const selector = questionType === "relacionar" ? ".quiz-match__item" : ".quiz-option";
  const targetOption = Array.from(quizOptions.querySelectorAll(selector)).find((button) => {
    return !button.disabled && button.dataset.shortcut === pressedKey;
  });

  if (!targetOption) {
    return;
  }

  event.preventDefault();
  targetOption.click();
});

quizStartButton.addEventListener("click", () => {
  if (!quizSessionSeed?.topic || !quizSessionSeed?.section || !Array.isArray(quizSessionSeed.questionBank)) {
    return;
  }

  quizState = buildQuizSession(quizSessionSeed.questionBank, {
    mode: "standard",
    topic: quizSessionSeed.topic,
    section: quizSessionSeed.section
  });
  startQuizSession();
});

quizReviewButton.addEventListener("click", () => {
  if (!quizSessionSeed?.topic || !quizSessionSeed?.section) {
    return;
  }

  const reviewQuestionBank = getReviewQuestionBank();

  if (reviewQuestionBank.length === 0) {
    renderQuizIntro();
    return;
  }

  quizState = buildQuizSession(reviewQuestionBank, {
    mode: "review",
    topic: quizSessionSeed.topic,
    section: quizSessionSeed.section
  });
  startQuizSession();
});

quizRestartButton.addEventListener("click", async () => {
  if (!quizSessionSeed) {
    return;
  }

  try {
    if (quizState?.mode === "review") {
      const reviewQuestionBank = getReviewQuestionBank();
      quizState = buildQuizSession(reviewQuestionBank, {
        mode: "review",
        topic: quizSessionSeed.topic,
        section: quizSessionSeed.section
      });
      renderQuizIntro();
      return;
    }

    await openQuizInPanel(quizSessionSeed.topic, quizSessionSeed.section);
  } catch (error) {
    topicTitle.textContent = quizSessionSeed.topic.title;
    topicDescription.textContent = error.message;
    hideAllContentModes();
  }
});

contentFrame.addEventListener("load", syncContentViewerVisibility);

window.addEventListener("resize", syncMobileMenuState);

init();



