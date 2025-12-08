const STORAGE_KEY = "storytime-library";
const storiesContainer = document.getElementById("stories");
const emptyState = document.getElementById("empty-state");
const storyForm = document.getElementById("story-form");
const clearButton = document.getElementById("clear-library");

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

let stories = [];

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

function saveStories() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

function renderStories() {
  storiesContainer.innerHTML = "";
  if (stories.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  stories.forEach((story) => {
    const card = document.createElement("article");
    card.className = "story-card";

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

async function handleFormSubmit(event) {
  event.preventDefault();
  const title = storyForm.title.value.trim();
  const pdfFile = storyForm.pdf.files[0];
  const audioFile = storyForm.audio.files[0];
  if (!title || !pdfFile || !audioFile) return;

  const pdfDataUrl = await readFileAsDataUrl(pdfFile);
  const audioDataUrl = await readFileAsDataUrl(audioFile);
  const cover = await renderCover(pdfDataUrl);

  stories.push({
    title,
    pdf: pdfDataUrl,
    audio: audioDataUrl,
    cover: cover.dataUrl,
    pages: cover.pageCount,
  });
  saveStories();
  renderStories();
  storyForm.reset();
}

storyForm.addEventListener("submit", handleFormSubmit);

clearButton.addEventListener("click", () => {
  if (!confirm("Clear all stored stories?")) return;
  stories = [];
  saveStories();
  renderStories();
});

async function renderCover(pdfDataUrl) {
  const pdf = await pdfjsLib.getDocument({ url: pdfDataUrl }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  const pageCount = pdf.numPages;
  return { dataUrl, pageCount };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
