const topicsList = document.querySelector("#topics-list");
const themeSelect = document.querySelector("#theme-select");
const topicSearch = document.querySelector("#topic-search");
const sidebar = document.querySelector("#sidebar");
const mobileMenuOpenButton = document.querySelector("#mobile-menu-open");
const mobileMenuCloseButton = document.querySelector("#mobile-menu-close");
const contentEyebrow = document.querySelector(".content__eyebrow");
const topicTitle = document.querySelector("#topic-title");
const topicDescription = document.querySelector("#topic-description");
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

const topicEntries = [];
const questionRenderers = {
  "pregunta abcd": renderAbcdQuestion,
  "pregunta verdadero-falso": renderTrueFalseQuestion,
  "completar frase": renderFillBlankQuestion,
  "relacionar": renderMatchingQuestion
};
const SECTION_PRIORITY = ["teoria", "resumen", "preguntas", "revisar errores"];
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
let quizState = null;
let quizTimerId = null;
let quizSessionSeed = null;

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

  return response.json();
}

function normalizeFailedQuestionsState(data) {
  return data && typeof data === "object" ? data : {};
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
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "quiz-option";
    optionButton.setAttribute("role", "listitem");
    optionButton.innerHTML = `
      <span class="quiz-option__radio" aria-hidden="true"></span>
      <span class="quiz-option__badge">${optionBadges[optionIndex] || option.id.toUpperCase()}</span>
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
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "quiz-option";
    optionButton.setAttribute("role", "listitem");
    optionButton.innerHTML = `
      <span class="quiz-option__radio" aria-hidden="true"></span>
      <span class="quiz-option__badge">${option.texto.charAt(0)}</span>
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

    hasCompleted = true;
    clearQuizTimer();
    quizState.correctCount += 1;
    quizState.answerStatuses[quizState.currentIndex] = "correct";
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-match__item";
    button.dataset.relationId = item.id;
    button.dataset.side = side;
    button.textContent = item.text;
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
    progressButton.addEventListener("click", async () => {
      try {
        setActiveTopic(themeIndex, topicIndex);
        const opened = await openTopicTargetSection(themeIndex, topicIndex, topic);

        if (!opened) {
          clearActiveSectionState();
          renderSections(topic);
        }
      } catch (error) {
        topicTitle.textContent = topic.title;
        topicDescription.textContent = error.message;
        hideAllContentModes();
      }
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
      level: topic.level ?? getTopicDepth(topic.title),
      hasChildren: topic.hasChildren ?? hasChildren
    };
  });
}

function isSelectableTopic(topic) {
  return Array.isArray(topic.sections) && topic.sections.length > 0 && !topic.hasChildren;
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

async function openTopicTargetSection(themeIndex, topicIndex, topic, startLabel = null) {
  const targetSection = findNextPendingSection(themeIndex, topicIndex, topic, startLabel);

  if (!targetSection) {
    return false;
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
  return topicEntries.find((entry) => entry.isSelectable && !entry.card.hidden) ?? null;
}

function applyTopicFilterVisibility(query) {
  const normalizedQuery = query.trim().toLowerCase();

  topicEntries.forEach((topicEntry) => {
    const topicMatches = topicEntry.title.toLowerCase().includes(normalizedQuery);
    const isVisible = normalizedQuery === "" || topicMatches;
    topicEntry.card.hidden = !isVisible;
  });
}

function restoreSidebarSelectionState() {
  topicEntries.forEach((entry) => {
    const isActiveTopic =
      activeEntry &&
      entry.themeIndex === activeEntry.themeIndex &&
      entry.topicIndex === activeEntry.topicIndex;

    entry.button.classList.toggle("is-active", Boolean(isActiveTopic));
    entry.button.setAttribute("aria-expanded", isActiveTopic ? "true" : "false");
    entry.sectionList.classList.toggle("is-open", Boolean(isActiveTopic));

    if (!Array.isArray(entry.sectionLinks)) {
      return;
    }

    entry.sectionLinks.forEach((link) => {
      const isActiveSection = activeSectionKey && link.dataset.sectionKey === activeSectionKey;
      link.classList.toggle("is-active", Boolean(isActiveSection));

      if (isActiveSection) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });
}

function refreshSidebarAfterQuestionStateChange() {
  buildSidebar();
  applyTopicFilterVisibility(topicSearch.value);
  restoreSidebarSelectionState();
}

function resetNavigationState() {
  topicEntries.length = 0;
  topicsList.innerHTML = "";
}

function renderSections(topic) {
  topicTitle.textContent = topic.title;
  topicDescription.textContent = topic.description || "Selecciona una sección desde el menú lateral para abrir su contenido aquí.";
  hideAllContentModes();

  if (!isSelectableTopic(topic)) {
    hideTopicProgress();
    topicDescription.textContent = "Este punto agrupa subtemas. Selecciona uno de los puntos hijos del menú lateral.";
    return;
  }

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }
}

function clearActiveSectionState() {
  activeSectionKey = null;

  topicEntries.forEach((entry) => {
    if (!Array.isArray(entry.sectionLinks)) {
      return;
    }

    entry.sectionLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
  });

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }
}

function setActiveSection(sectionKey) {
  activeSectionKey = sectionKey;

  topicEntries.forEach((entry) => {
    if (!Array.isArray(entry.sectionLinks)) {
      return;
    }

    entry.sectionLinks.forEach((link) => {
      const isActive = link.dataset.sectionKey === sectionKey;

      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }
}

function applyCompletionStateToSidebar() {
  topicEntries.forEach((entry) => {
    let completedSections = 0;
    const totalSections = Array.isArray(entry.sectionLinks) ? entry.sectionLinks.length : 0;

    if (Array.isArray(entry.sectionLinks)) {
      entry.sectionLinks.forEach((link) => {
        const isCompleted = Boolean(completionState[link.dataset.sectionKey]);
        const statusNode = link.querySelector(".topic-section-button__status");

        if (statusNode) {
          statusNode.hidden = !isCompleted;
        }

        if (isCompleted) {
          completedSections += 1;
        }
      });
    }

    entry.label.classList.toggle(
      "is-complete",
      totalSections > 0 && completedSections === totalSections
    );
    entry.isCompleted = totalSections > 0 && completedSections === totalSections;
  });

  const orderedEntries = [...topicEntries].sort(
    (left, right) => Number(Boolean(left.isCompleted)) - Number(Boolean(right.isCompleted))
  );

  orderedEntries.forEach((entry) => {
    topicsList.appendChild(entry.card);
  });

  if (activeEntry) {
    renderTopicProgress(activeEntry.themeIndex);
  }

  updateCompletionToggle();
}

function setActiveTopic(themeIndex, topicIndex) {
  const topic = syllabus[themeIndex].topics[topicIndex];
  if (!isSelectableTopic(topic)) {
    clearActiveSectionState();
    renderSections(topic);
    return;
  }

  activeEntry = { themeIndex, topicIndex };

  topicEntries.forEach((entry) => {
    const isActive = entry.themeIndex === themeIndex && entry.topicIndex === topicIndex;
    entry.button.classList.toggle("is-active", isActive);
    entry.button.setAttribute("aria-expanded", isActive ? "true" : "false");
    entry.sectionList.classList.toggle("is-open", isActive);
  });

  renderSections(topic);
  clearActiveSectionState();
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

  const orderedTopics = theme.topics
    .map((topic, topicIndex) => ({
      topic,
      topicIndex,
      isCompleted: isTopicComplete(activeThemeIndex, topicIndex, topic)
    }))
    .sort((left, right) => Number(left.isCompleted) - Number(right.isCompleted));

  orderedTopics.forEach(({ topic, topicIndex }) => {
    const card = document.createElement("section");
    card.className = "topic-card";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "topic-button";
    button.classList.toggle("is-branch", !isSelectableTopic(topic));
    button.style.paddingLeft = `${16 + (topic.level ?? 0) * 18}px`;
    button.setAttribute("aria-expanded", "false");

    if (isSelectableTopic(topic)) {
      button.addEventListener("click", async () => {
        try {
          setActiveTopic(activeThemeIndex, topicIndex);
          await openTopicTargetSection(activeThemeIndex, topicIndex, topic);
        } catch (error) {
          topicTitle.textContent = topic.title;
          topicDescription.textContent = error.message;
          hideAllContentModes();
        }
      });
    }

    const label = document.createElement("span");
    label.className = "topic-button__label";
    label.textContent = topic.title;

    const icon = document.createElement("span");
    icon.className = "topic-button__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = isSelectableTopic(topic) ? ">" : "";

    button.append(label, icon);

    const sectionList = document.createElement("div");
    sectionList.className = "topic-sections";
    const sectionLinks = [];

    if (isSelectableTopic(topic)) {
      topic.sections.forEach((section) => {
        if (!isSectionAvailable(activeThemeIndex, topicIndex, topic, section)) {
          return;
        }

        const sectionKey = getSectionKey(activeThemeIndex, topicIndex, section);
        const sectionLink = document.createElement("a");
        sectionLink.className = "topic-section-button";
        sectionLink.href = section.link;
        sectionLink.dataset.pageType = section.pageType;
        sectionLink.dataset.sectionKey = sectionKey;
        sectionLink.innerHTML =
          `<span class="topic-section-button__content">` +
            `<i class="${section.icon}" aria-hidden="true"></i>` +
            `<span class="topic-section-button__text">${section.label}</span>` +
          `</span>` +
          `<span class="topic-section-button__status" hidden>` +
            `<i class="fa-solid fa-circle-check" aria-hidden="true"></i>` +
          `</span>`;
        sectionLink.addEventListener("click", async (event) => {
          event.preventDefault();
          try {
            setActiveTopic(activeThemeIndex, topicIndex);
            if (section.pageType === "errors") {
              setCurrentSection(activeThemeIndex, topicIndex, topic, section);
              setActiveSection(sectionKey);
              await openSectionInPanel(topic, section);
              closeMobileMenu();
              return;
            }

            if (!hasSectionContent(section)) {
              const opened = await openTopicTargetSection(
                activeThemeIndex,
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

            setCurrentSection(activeThemeIndex, topicIndex, topic, section);
            setActiveSection(sectionKey);
            await openSectionInPanel(topic, section);
            closeMobileMenu();
          } catch (error) {
            topicTitle.textContent = topic.title;
            topicDescription.textContent = error.message;
            hideAllContentModes();
          }
        });
        sectionList.appendChild(sectionLink);
        sectionLinks.push(sectionLink);
      });
    }

    card.append(button);

    if (isSelectableTopic(topic)) {
      card.append(sectionList);
    }

    topicsList.appendChild(card);
    topicEntries.push({
      card,
      button,
      label,
      sectionList,
      sectionLinks,
      themeIndex: activeThemeIndex,
      topicIndex,
      title: topic.title,
      isSelectable: isSelectableTopic(topic)
    });
  });

  applyCompletionStateToSidebar();
}

function filterTopics(query) {
  applyTopicFilterVisibility(query);

  const firstVisibleEntry = findFirstSelectableEntry();

  if (firstVisibleEntry !== null) {
    setActiveTopic(firstVisibleEntry.themeIndex, firstVisibleEntry.topicIndex);
    return;
  }

  topicTitle.textContent = "Sin resultados";
  topicDescription.textContent = "No hay temas que coincidan con la búsqueda actual.";
  hideAllContentModes();
}

function syncSidebarForTheme(themeIndex) {
  activeThemeIndex = themeIndex;
  activeEntry = null;
  activeSectionKey = null;
  currentSection = null;
  buildSidebar();
  filterTopics(topicSearch.value);

  if (findFirstSelectableEntry() !== null) {
    return;
  }

  const firstSelectableEntry = topicEntries.find((entry) => entry.isSelectable) ?? null;

  if (firstSelectableEntry !== null) {
    setActiveTopic(firstSelectableEntry.themeIndex, firstSelectableEntry.topicIndex);
    return;
  }

  topicTitle.textContent = "Sin contenidos seleccionables";
  topicDescription.textContent = "No hay subtemas finales disponibles en el tema seleccionado.";
  hideAllContentModes();
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
  filterTopics(event.target.value);

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
