const libraryList = document.getElementById('library-list');
const bookTitle = document.getElementById('book-title');
const pageStatus = document.getElementById('page-status');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageNumber = document.getElementById('page-number');
const totalPages = document.getElementById('total-pages');
const zoomSlider = document.getElementById('zoom-slider');
const zoomLabel = document.getElementById('zoom-label');
const pageFrame = document.getElementById('page-frame');
const readerShell = document.getElementById('reader-shell');
const canvas = document.getElementById('page-canvas');
const helperText = document.getElementById('helper-text');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let pdfDoc = null;
let currentPage = 1;
let renderTask = null;
let activeBookId = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';

const books = [
  {
    id: 'moonlight-carousel',
    title: 'Moonlight Carousel',
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    meta: 'Playful research ride • 14 pages',
  },
  {
    id: 'pastel-pond',
    title: 'Pastel Pond',
    url: 'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf',
    meta: 'Gentle shapes • 2 pages',
  },
  {
    id: 'cloudy-castle',
    title: 'Cloudy Castle',
    url: 'https://www.orimi.com/pdf-test.pdf',
    meta: 'Light adventure • 1 page',
  },
];

function init() {
  populateLibrary();
  attachEvents();
}

function populateLibrary() {
  books.forEach((book) => {
    const item = document.createElement('li');
    item.className = 'library__item';
    item.tabIndex = 0;
    item.dataset.bookId = book.id;

    const title = document.createElement('p');
    title.className = 'library__title';
    title.textContent = book.title;

    const meta = document.createElement('p');
    meta.className = 'library__meta';
    meta.textContent = book.meta;

    item.append(title, meta);
    item.addEventListener('click', () => selectBook(book));
    item.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectBook(book);
      }
    });

    libraryList.appendChild(item);
  });
}

function attachEvents() {
  prevBtn.addEventListener('click', () => changePage(-1));
  nextBtn.addEventListener('click', () => changePage(1));
  zoomSlider.addEventListener('input', () => {
    zoomLabel.textContent = `${Math.round(Number(zoomSlider.value) * 100)}%`;
    renderPage(true);
  });

  window.addEventListener('resize', debounce(() => renderPage(true), 150));

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen';
  });

  document.addEventListener('keydown', (event) => {
    if (!pdfDoc) return;
    if (event.key === 'ArrowRight') changePage(1);
    if (event.key === 'ArrowLeft') changePage(-1);
    if (event.key === 'f' || event.key === 'F') toggleFullscreen();
  });
}

async function selectBook(book) {
  if (book.id === activeBookId) return;

  setActiveLibraryItem(book.id);
  helperText.textContent = 'Loading pages with stardust...';
  bookTitle.textContent = book.title;
  pageStatus.textContent = 'Preparing your cozy pages.';
  currentPage = 1;
  activeBookId = book.id;
  prevBtn.disabled = true;
  nextBtn.disabled = true;

  try {
    await loadPdf(book.url);
    totalPages.textContent = pdfDoc.numPages;
    pageStatus.textContent = 'Single-page mode: only the current page is rendered.';
    helperText.textContent = 'Use arrows or the slider to explore gently.';
    renderPage();
  } catch (error) {
    console.error('Error loading PDF', error);
    helperText.textContent = 'Something went wrong loading this PDF. Please try another book.';
    pageStatus.textContent = 'Load failed.';
    pageNumber.textContent = '—';
    totalPages.textContent = '—';
  }
}

async function loadPdf(url) {
  if (renderTask) {
    await cancelRender();
  }
  if (pdfDoc) {
    pdfDoc.destroy();
    pdfDoc = null;
  }

  const loadingTask = pdfjsLib.getDocument({
    url,
    withCredentials: false,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
    cMapPacked: true,
    disableAutoFetch: true,
  });

  pdfDoc = await loadingTask.promise;
}

function computeScale(viewport) {
  const containerWidth = pageFrame.clientWidth || readerShell.clientWidth || viewport.width;
  const fitScale = containerWidth / viewport.width;
  return fitScale * Number(zoomSlider.value);
}

async function renderPage(skipAnimation = false) {
  if (!pdfDoc) return;

  if (renderTask) {
    await cancelRender();
  }

  const page = await pdfDoc.getPage(currentPage);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = computeScale(baseViewport);
  const viewport = page.getViewport({ scale });

  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport,
  };

  renderTask = page.render(renderContext);

  try {
    await renderTask.promise;
    pageNumber.textContent = currentPage;
    totalPages.textContent = pdfDoc.numPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= pdfDoc.numPages;
    if (!skipAnimation) {
      pageFrame.classList.add('turn');
      setTimeout(() => pageFrame.classList.remove('turn'), 240);
    }
  } catch (error) {
    if (error?.name !== 'RenderingCancelledException') {
      console.error('Render error', error);
      helperText.textContent = 'Unable to draw this page. Try resizing or reloading the book.';
    }
  } finally {
    renderTask = null;
  }
}

async function cancelRender() {
  if (!renderTask) return;
  try {
    await renderTask.cancel();
  } catch (error) {
    /* ignore */
  }
  renderTask = null;
}

function changePage(delta) {
  if (!pdfDoc) return;
  const next = currentPage + delta;
  if (next < 1 || next > pdfDoc.numPages) return;
  currentPage = next;
  helperText.textContent = 'Drawing just this page for you...';
  renderPage();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    readerShell.requestFullscreen?.();
    fullscreenBtn.textContent = 'Exit Fullscreen';
  } else {
    document.exitFullscreen?.();
    fullscreenBtn.textContent = 'Enter Fullscreen';
  }
}

function setActiveLibraryItem(id) {
  const items = libraryList.querySelectorAll('.library__item');
  items.forEach((item) => {
    item.classList.toggle('active', item.dataset.bookId === id);
  });
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

document.addEventListener('DOMContentLoaded', init);
