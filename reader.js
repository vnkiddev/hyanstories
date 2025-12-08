const STORAGE_KEY = "storytime-library";
const storiesContainer = document.getElementById("stories");
const emptyState = document.getElementById("empty-state");
const reader = document.getElementById("reader");
const closeReaderButton = document.getElementById("close-reader");
const readerTitle = document.getElementById("reader-title");
const pageContainer = document.getElementById("page-container");
const pageIndicator = document.getElementById("page-indicator");
const prevPageButton = document.getElementById("prev-page");
const nextPageButton = document.getElementById("next-page");
const modeManual = document.getElementById("mode-manual");
const modeAuto = document.getElementById("mode-auto");
const audioPlayer = document.getElementById("audio-player");

const AUTO_TURN_MS = 7000;

let stories = [];
let currentBook = null;
let currentPage = 1;
let pdfInstance = null;
let autoTurnTimer = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

document.addEventListener("DOMContentLoaded", () => {
  stories = loadStories();
  renderStories();
});

function loadStories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("Failed to read stories", err);
    return [];
  }
}

function renderStories() {
  storiesContainer.innerHTML = "";
  if (stories.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  stories.forEach((story, index) => {
    const card = document.createElement("article");
    card.className = "story-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", () => openReader(index));
    card.addEventListener("keypress", (e) => {
      if (e.key === "Enter") openReader(index);
    });

    const cover = document.createElement("img");
    cover.className = "story-card__cover";
    cover.src = story.cover;
    cover.alt = `${story.title} cover`;

    const body = document.createElement("div");
    body.className = "story-card__body";
    const title = document.createElement("h3");
    title.className = "story-card__title";
    title.textContent = story.title;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${story.pages} page${story.pages > 1 ? "s" : ""}`;

    body.appendChild(title);
    body.appendChild(meta);
    card.appendChild(cover);
    card.appendChild(body);
    storiesContainer.appendChild(card);
  });
}

async function openReader(index) {
  currentBook = stories[index];
  if (!currentBook) return;
  readerTitle.textContent = currentBook.title;
  reader.classList.remove("hidden");
  currentPage = 1;
  await loadPdf(currentBook.pdf);
  setModeManual();
  renderPage();
  audioPlayer.src = currentBook.audio;
}

function closeReader() {
  reader.classList.add("hidden");
  stopAutoTurn();
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
}

closeReaderButton.addEventListener("click", closeReader);
reader.addEventListener("click", (event) => {
  if (event.target === reader) closeReader();
});

audioPlayer.addEventListener("ended", stopAutoTurn);

async function loadPdf(pdfDataUrl) {
  pdfInstance = await pdfjsLib.getDocument({ url: pdfDataUrl }).promise;
}

async function renderPage() {
  if (!pdfInstance) return;
  const page = await pdfInstance.getPage(currentPage);
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport }).promise;
  pageContainer.innerHTML = "";
  pageContainer.appendChild(canvas);
  pageIndicator.textContent = `Page ${currentPage} of ${pdfInstance.numPages}`;
  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === pdfInstance.numPages;
}

function nextPage() {
  if (currentPage < pdfInstance.numPages) {
    currentPage += 1;
    renderPage();
  } else {
    stopAutoTurn();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage -= 1;
    renderPage();
  }
}

prevPageButton.addEventListener("click", prevPage);
nextPageButton.addEventListener("click", nextPage);

function setModeManual() {
  modeManual.classList.add("active");
  modeAuto.classList.remove("active");
  stopAutoTurn();
}

function setModeAuto() {
  modeManual.classList.remove("active");
  modeAuto.classList.add("active");
  startAutoTurn();
}

modeManual.addEventListener("click", setModeManual);
modeAuto.addEventListener("click", () => {
  if (!audioPlayer.src) return;
  setModeAuto();
});

audioPlayer.addEventListener("play", () => {
  if (modeAuto.classList.contains("active")) startAutoTurn();
});

audioPlayer.addEventListener("pause", stopAutoTurn);

audioPlayer.addEventListener("ended", () => {
  stopAutoTurn();
  currentPage = pdfInstance.numPages;
  renderPage();
});

function startAutoTurn() {
  stopAutoTurn();
  audioPlayer.play();
  autoTurnTimer = setInterval(() => {
    if (currentPage >= pdfInstance.numPages) {
      stopAutoTurn();
    } else {
      nextPage();
    }
  }, AUTO_TURN_MS);
}

function stopAutoTurn() {
  if (autoTurnTimer) {
    clearInterval(autoTurnTimer);
    autoTurnTimer = null;
  }
}

window.addEventListener("keydown", (event) => {
  if (reader.classList.contains("hidden")) return;
  if (event.key === "ArrowRight") nextPage();
  if (event.key === "ArrowLeft") prevPage();
  if (event.key === "Escape") closeReader();
});
