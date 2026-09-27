// --- Client Application Logic for Awesome DIY Software --- //

let appData = {
  title: 'Awesome DIY Software',
  categories: [],
  stats: { totalProjects: 0, categoriesCount: 0, technologiesCount: 0, languages: [] }
};

let allProjects = [];
let activeFilters = {
  search: '',
  category: 'all',
  tech: 'all',
  difficulty: 'all',
  bookmarksOnly: false,
  sort: 'original'
};

let bookmarkedIds = new Set(JSON.parse(localStorage.getItem('diy_bookmarks') || '[]'));

// DOM Elements
const projectsGrid = document.getElementById('projects-grid');
const emptyState = document.getElementById('empty-state');
const visibleCountEl = document.getElementById('visible-count');
const activeFilterSummary = document.getElementById('active-filter-summary');
const categoryNavList = document.getElementById('category-nav-list');
const techFilterPills = document.getElementById('tech-filter-pills');
const searchInput = document.getElementById('global-search');
const clearSearchBtn = document.getElementById('clear-search');
const bookmarkBadge = document.getElementById('bookmark-badge');
const btnBookmarks = document.getElementById('btn-bookmarks');
const bookmarksBanner = document.getElementById('bookmarks-banner');
const savedCounterText = document.getElementById('saved-counter-text');
const btnClearBookmarks = document.getElementById('btn-clear-bookmarks');
const themeToggleBtn = document.getElementById('theme-toggle');
const sortSelect = document.getElementById('sort-select');
const difficultyFilter = document.getElementById('difficulty-filter');
const btnResetCategories = document.getElementById('btn-reset-categories');
const btnClearAllFilters = document.getElementById('btn-clear-all-filters');
const btnScrollTop = document.getElementById('btn-scroll-top');

// Modals
const modalSubmit = document.getElementById('modal-submit');
const btnAddProject = document.getElementById('btn-add-project');
const btnCloseSubmit = document.getElementById('btn-close-submit');
const btnCancelSubmit = document.getElementById('btn-cancel-submit');
const formSubmitProject = document.getElementById('form-submit-project');

const modalInspect = document.getElementById('modal-inspect');
const btnInspect = document.getElementById('btn-inspect');
const btnCloseInspect = document.getElementById('btn-close-inspect');
const rawReadmeCode = document.getElementById('raw-readme-code');
const rawTmplCode = document.getElementById('raw-tmpl-code');
const inspectorTabs = document.querySelectorAll('.inspector-tab');

// Views
const viewGridBtn = document.getElementById('view-grid');
const viewCompactBtn = document.getElementById('view-compact');

// Initialize App
async function initApp() {
  initTheme();
  initEventListeners();
  await loadData();
}

// Fetch structured data from server
async function loadData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    appData = await res.json();

    // Flatten all projects with index for original order
    allProjects = [];
    appData.categories.forEach(cat => {
      cat.items.forEach((item, idx) => {
        allProjects.push({
          ...item,
          categoryIcon: cat.icon,
          categoryId: cat.id,
          originalOrder: allProjects.length
        });
      });
    });

    renderStats();
    renderTechPills();
    renderCategorySidebar();
    updateBookmarkBadge();
    applyFilters();
  } catch (err) {
    console.error('Failed to load project data:', err);
    showToast('Failed to load data. Please check server.', 'error');
  }
}

// Animate Stats
function renderStats() {
  animateCounter('stat-total', appData.stats.totalProjects);
  animateCounter('stat-categories', appData.stats.categoriesCount);
  animateCounter('stat-techs', appData.stats.technologiesCount);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 25));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current;
  }, 30);
}

// Render Tech Pills
function renderTechPills() {
  techFilterPills.innerHTML = '<button class="pill active" data-filter="all">All</button>';
  
  // Sort languages by occurrence
  const langCounts = {};
  allProjects.forEach(p => {
    p.tags.forEach(t => {
      langCounts[t] = (langCounts[t] || 0) + 1;
    });
  });

  const sortedTechs = Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a]);

  sortedTechs.forEach(tech => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.filter = tech;
    btn.textContent = `${tech} (${langCounts[tech]})`;
    techFilterPills.appendChild(btn);
  });
}

// Render Category Sidebar
function renderCategorySidebar() {
  categoryNavList.innerHTML = '';
  
  // All category option
  const allItem = document.createElement('a');
  allItem.className = 'cat-item active';
  allItem.dataset.category = 'all';
  allItem.innerHTML = `
    <div class="cat-item-left">
      <span>🌐</span>
      <span>All Categories</span>
    </div>
    <span class="cat-badge">${allProjects.length}</span>
  `;
  allItem.addEventListener('click', (e) => {
    e.preventDefault();
    setCategoryFilter('all');
  });
  categoryNavList.appendChild(allItem);

  appData.categories.forEach(cat => {
    const item = document.createElement('a');
    item.className = 'cat-item';
    item.dataset.category = cat.name;
    item.innerHTML = `
      <div class="cat-item-left">
        <span>${cat.icon}</span>
        <span title="${cat.name}">${cat.name}</span>
      </div>
      <span class="cat-badge">${cat.items.length}</span>
    `;
    item.addEventListener('click', (e) => {
      e.preventDefault();
      setCategoryFilter(cat.name);
    });
    categoryNavList.appendChild(item);
  });
}

// Filter and Render Projects
function applyFilters() {
  let filtered = allProjects.filter(item => {
    // Bookmarks Filter
    if (activeFilters.bookmarksOnly && !bookmarkedIds.has(item.id)) {
      return false;
    }

    // Category Filter
    if (activeFilters.category !== 'all' && item.category !== activeFilters.category) {
      return false;
    }

    // Tech Stack Filter
    if (activeFilters.tech !== 'all' && !item.tags.includes(activeFilters.tech)) {
      return false;
    }

    // Difficulty Filter
    if (activeFilters.difficulty !== 'all' && item.difficulty !== activeFilters.difficulty) {
      return false;
    }

    // Search Query Filter
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCat && !matchTags) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  if (activeFilters.sort === 'name-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else if (activeFilters.sort === 'name-desc') {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  } else if (activeFilters.sort === 'category') {
    filtered.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    filtered.sort((a, b) => a.originalOrder - b.originalOrder);
  }

  renderProjects(filtered);
  updateFilterUI(filtered.length);
}

function renderProjects(items) {
  projectsGrid.innerHTML = '';
  visibleCountEl.textContent = items.length;

  if (items.length === 0) {
    projectsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  projectsGrid.style.display = 'grid';
  emptyState.style.display = 'none';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = item.id;

    const isBookmarked = bookmarkedIds.has(item.id);

    const tagsHtml = item.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="card-top">
        <div class="category-tag">
          <span>${item.categoryIcon || '🛠️'}</span>
          <span>${escapeHtml(item.category)}</span>
        </div>
        <div class="card-actions-quick">
          <button class="star-btn ${isBookmarked ? 'bookmarked' : ''}" title="${isBookmarked ? 'Remove Bookmark' : 'Save Project'}" data-action="star">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <h3 class="card-title">
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h3>

      <p class="card-desc">${item.description ? escapeHtml(item.description) : 'Step-by-step DIY implementation guide.'}</p>

      <div class="card-footer">
        <div class="card-tags">
          <div class="difficulty-indicator diff-${item.difficulty}">
            <span class="diff-dot"></span>
            <span>${item.difficulty}</span>
          </div>
          ${tagsHtml}
        </div>

        <div class="card-links">
          <button class="copy-btn" title="Copy Tutorial Link" data-action="copy-link" data-url="${escapeHtml(item.url)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="visit-link">
            <span>Visit</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </a>
        </div>
      </div>
    `;

    // Event listeners for card buttons
    const starBtn = card.querySelector('[data-action="star"]');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(item.id, item.title, starBtn);
    });

    const copyBtn = card.querySelector('[data-action="copy-link"]');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(item.url, 'Project link copied to clipboard!');
    });

    projectsGrid.appendChild(card);
  });
}

// Bookmarks Handling
function toggleBookmark(id, title, buttonEl) {
  if (bookmarkedIds.has(id)) {
    bookmarkedIds.delete(id);
    buttonEl.classList.remove('bookmarked');
    buttonEl.title = 'Save Project';
    showToast(`Removed "${title}" from saved list`, 'info');
  } else {
    bookmarkedIds.add(id);
    buttonEl.classList.add('bookmarked');
    buttonEl.title = 'Remove Bookmark';
    showToast(`Saved "${title}" to bookmarks! ⭐`, 'success');
  }
  localStorage.setItem('diy_bookmarks', JSON.stringify(Array.from(bookmarkedIds)));
  updateBookmarkBadge();

  if (activeFilters.bookmarksOnly) {
    applyFilters();
  }
}

function updateBookmarkBadge() {
  const count = bookmarkedIds.size;
  bookmarkBadge.textContent = count;
  savedCounterText.textContent = count;
}

// Filter UI update
function updateFilterUI(count) {
  const summaries = [];
  if (activeFilters.bookmarksOnly) summaries.push('Saved Bookmarks');
  if (activeFilters.category !== 'all') summaries.push(`Category: ${activeFilters.category}`);
  if (activeFilters.tech !== 'all') summaries.push(`Tech: ${activeFilters.tech}`);
  if (activeFilters.difficulty !== 'all') summaries.push(`Difficulty: ${activeFilters.difficulty}`);
  if (activeFilters.search) summaries.push(`Query: "${activeFilters.search}"`);

  if (summaries.length > 0) {
    activeFilterSummary.textContent = `(${summaries.join(' • ')})`;
  } else {
    activeFilterSummary.textContent = '';
  }

  // Update category sidebar active state
  document.querySelectorAll('.cat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.category === activeFilters.category);
  });

  // Update tech pills active state
  document.querySelectorAll('.tech-pills .pill').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === activeFilters.tech);
  });

  // Bookmarks Banner
  if (activeFilters.bookmarksOnly) {
    bookmarksBanner.style.display = 'flex';
    btnBookmarks.classList.add('btn-primary');
  } else {
    bookmarksBanner.style.display = 'none';
    btnBookmarks.classList.remove('btn-primary');
  }
}

function setCategoryFilter(category) {
  activeFilters.category = category;
  applyFilters();
}

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem('diy_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('diy_theme', next);
}

// Event Listeners
function initEventListeners() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Search input
  searchInput.addEventListener('input', (e) => {
    activeFilters.search = e.target.value.trim();
    clearSearchBtn.style.display = activeFilters.search ? 'block' : 'none';
    applyFilters();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    activeFilters.search = '';
    clearSearchBtn.style.display = 'none';
    applyFilters();
    searchInput.focus();
  });

  // Keyboard shortcut Ctrl+K and /
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Tech Pills Click
  techFilterPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    activeFilters.tech = pill.dataset.filter;
    applyFilters();
  });

  // Difficulty Filter Click
  difficultyFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;
    difficultyFilter.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilters.difficulty = btn.dataset.difficulty;
    applyFilters();
  });

  // Sort Select Change
  sortSelect.addEventListener('change', (e) => {
    activeFilters.sort = e.target.value;
    applyFilters();
  });

  // Reset Categories Button
  btnResetCategories.addEventListener('click', () => {
    setCategoryFilter('all');
  });

  // Clear All Filters in empty state
  btnClearAllFilters.addEventListener('click', () => {
    activeFilters = {
      search: '',
      category: 'all',
      tech: 'all',
      difficulty: 'all',
      bookmarksOnly: false,
      sort: 'original'
    };
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    difficultyFilter.querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.difficulty === 'all'));
    sortSelect.value = 'original';
    applyFilters();
  });

  // Bookmarks Toggle
  btnBookmarks.addEventListener('click', () => {
    activeFilters.bookmarksOnly = !activeFilters.bookmarksOnly;
    applyFilters();
  });

  // Clear All Bookmarks
  btnClearBookmarks.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all your saved bookmarks?')) {
      bookmarkedIds.clear();
      localStorage.removeItem('diy_bookmarks');
      updateBookmarkBadge();
      applyFilters();
      showToast('All bookmarks cleared.', 'info');
    }
  });

  // View Toggles
  viewGridBtn.addEventListener('click', () => {
    viewGridBtn.classList.add('active');
    viewCompactBtn.classList.remove('active');
    projectsGrid.classList.remove('compact-view');
  });

  viewCompactBtn.addEventListener('click', () => {
    viewCompactBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    projectsGrid.classList.add('compact-view');
  });

  // Scroll to Top
  btnScrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Brand click resets to home
  document.querySelector('.brand').addEventListener('click', () => {
    activeFilters = {
      search: '',
      category: 'all',
      tech: 'all',
      difficulty: 'all',
      bookmarksOnly: false,
      sort: 'original'
    };
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    difficultyFilter.querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.difficulty === 'all'));
    sortSelect.value = 'original';
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Modal: Submit Project
  btnAddProject.addEventListener('click', () => { modalSubmit.style.display = 'flex'; });
  btnCloseSubmit.addEventListener('click', () => { modalSubmit.style.display = 'none'; });
  btnCancelSubmit.addEventListener('click', () => { modalSubmit.style.display = 'none'; });

  formSubmitProject.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('input-title').value.trim();
    const url = document.getElementById('input-url').value.trim();
    const category = document.getElementById('select-category').value;
    const description = document.getElementById('input-desc').value.trim();

    try {
      const res = await fetch('/api/add-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, category, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit project');

      showToast('Project added to README.md successfully! 🎉', 'success');
      formSubmitProject.reset();
      modalSubmit.style.display = 'none';
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Modal: Inspect Files
  btnInspect.addEventListener('click', async () => {
    modalInspect.style.display = 'flex';
    try {
      const res = await fetch('/api/raw');
      const data = await res.json();
      rawReadmeCode.textContent = data.readme || 'No README found';
      rawTmplCode.textContent = data.tmpl || 'No template found';
    } catch (err) {
      rawReadmeCode.textContent = 'Error loading raw files';
    }
  });

  btnCloseInspect.addEventListener('click', () => { modalInspect.style.display = 'none'; });

  // Inspector Tabs
  inspectorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      inspectorTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-content-${target}`).classList.add('active');
    });
  });

  // Copy Code Buttons in Inspector
  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const text = document.getElementById(targetId).textContent;
      copyToClipboard(text, 'Raw code copied to clipboard!');
    });
  });

  // Backdrop click to close modals
  [modalSubmit, modalInspect].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
}

function closeAllModals() {
  modalSubmit.style.display = 'none';
  modalInspect.style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg, 'success');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(successMsg, 'success');
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
