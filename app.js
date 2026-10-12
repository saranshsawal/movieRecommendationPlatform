/**
 * Saransh's Movie Recommendation Platform
 * Built for College Project Demonstration
 * 100% Offline • Dynamic Weight Normalization • Local Storage Watchlist
 */

// ============================================================================
// State Management
// ============================================================================
const state = {
  movies: [],
  metadata: null,
  watchlist: JSON.parse(localStorage.getItem('cinematch_watchlist') || '[]'),
  activeTab: 'explorer', // 'explorer' | 'seed' | 'watchlist'
  
  // Factor Explorer Filters
  filters: {
    moods: new Set(),
    genres: new Set(),
    decade: null,
    runtime: null,
    minRating: 0,
    director: '',
    actor: ''
  },

  // Seed Movie Recommender
  seedMovie: null,
  seedOptions: {
    mood: true,
    genres: true,
    keywords: true,
    director: true,
    cast: false,
    era: false,
    runtime: false
  },

  sortBy: 'match',
  page: 1,
  pageSize: 24,
  currentMatches: []
};

// Genre Color Themes for Dynamic Poster Generation
const GENRE_GRADIENTS = {
  'Action': 'linear-gradient(135deg, #b91c1c 0%, #1e1b4b 100%)',
  'Adventure': 'linear-gradient(135deg, #047857 0%, #0f172a 100%)',
  'Animation': 'linear-gradient(135deg, #f59e0b 0%, #431407 100%)',
  'Comedy': 'linear-gradient(135deg, #f97316 0%, #1e293b 100%)',
  'Crime': 'linear-gradient(135deg, #475569 0%, #0f172a 100%)',
  'Documentary': 'linear-gradient(135deg, #0d9488 0%, #111827 100%)',
  'Drama': 'linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%)',
  'Family': 'linear-gradient(135deg, #ec4899 0%, #312e81 100%)',
  'Fantasy': 'linear-gradient(135deg, #8b5cf6 0%, #1e1b4b 100%)',
  'History': 'linear-gradient(135deg, #78350f 0%, #18181b 100%)',
  'Horror': 'linear-gradient(135deg, #991b1b 0%, #09090b 100%)',
  'Music': 'linear-gradient(135deg, #d946ef 0%, #1e1b4b 100%)',
  'Mystery': 'linear-gradient(135deg, #3b82f6 0%, #0f172a 100%)',
  'Romance': 'linear-gradient(135deg, #f43f5e 0%, #4c0519 100%)',
  'Science Fiction': 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
  'Thriller': 'linear-gradient(135deg, #334155 0%, #18181b 100%)',
  'War': 'linear-gradient(135deg, #57534e 0%, #0c0a09 100%)',
  'Western': 'linear-gradient(135deg, #b45309 0%, #1c1917 100%)'
};

const MOOD_ICONS = {
  'Mind-Bending': '🧠',
  'High Adrenaline': '⚡',
  'Feel-Good & Wholesome': '☀️',
  'Dark & Gritty': '🌑',
  'Deep & Emotional': '💧',
  'Epic & Imaginative': '🚀'
};

// ============================================================================
// Initialization & Data Loading
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showToast('Loading movie library...', 1500);

    // Load data files
    const [moviesRes, metaRes] = await Promise.all([
      fetch('data/movies.json'),
      fetch('data/metadata_summary.json')
    ]);

    state.movies = await moviesRes.json();
    state.metadata = await metaRes.json();

    document.getElementById('totalMoviesCount').textContent = state.movies.length.toLocaleString();
    updateWatchlistCount();

    // Render filter components
    initFilterChips();
    initDropdowns();
    initEventListeners();

    // Set default seed movie (Inception id: 27205)
    const defaultSeed = state.movies.find(m => m.id === 27205) || state.movies[0];
    if (defaultSeed) {
      setSeedMovie(defaultSeed, false);
    }

    // Initial recommendation run
    runRecommendations();

  } catch (err) {
    console.error('Failed to initialize CineMatch:', err);
    showToast('Error loading dataset. Please check files.');
  }
});

// ============================================================================
// UI Component Builders
// ============================================================================

function initFilterChips() {
  if (!state.metadata) return;

  // 1. Moods
  const moodContainer = document.getElementById('moodChipsContainer');
  moodContainer.innerHTML = '';
  state.metadata.moods.forEach(mood => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.dataset.type = 'mood';
    btn.dataset.value = mood;
    btn.innerHTML = `<span>${MOOD_ICONS[mood] || '✨'}</span> ${mood}`;
    btn.addEventListener('click', () => toggleMoodFilter(mood, btn));
    moodContainer.appendChild(btn);
  });

  // 2. Genres
  const genreContainer = document.getElementById('genreChipsContainer');
  genreContainer.innerHTML = '';
  state.metadata.genres.forEach(genre => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.dataset.type = 'genre';
    btn.dataset.value = genre;
    btn.textContent = genre;
    btn.addEventListener('click', () => toggleGenreFilter(genre, btn));
    genreContainer.appendChild(btn);
  });

  // 3. Decades
  const decadeContainer = document.getElementById('decadeChipsContainer');
  decadeContainer.innerHTML = '';
  state.metadata.decades.forEach(decade => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.dataset.type = 'decade';
    btn.dataset.value = decade;
    btn.textContent = decade;
    btn.addEventListener('click', () => selectDecadeFilter(decade, btn));
    decadeContainer.appendChild(btn);
  });

  // 4. Runtime
  const runtimeContainer = document.getElementById('runtimeChipsContainer');
  runtimeContainer.innerHTML = '';
  state.metadata.runtime_buckets.forEach(bucket => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn';
    btn.dataset.type = 'runtime';
    btn.dataset.value = bucket;
    btn.textContent = bucket;
    btn.addEventListener('click', () => selectRuntimeFilter(bucket, btn));
    runtimeContainer.appendChild(btn);
  });
}

function initDropdowns() {
  if (!state.metadata) return;

  const directorSelect = document.getElementById('directorSelect');
  state.metadata.top_directors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `Dir: ${d}`;
    directorSelect.appendChild(opt);
  });

  const actorSelect = document.getElementById('actorSelect');
  state.metadata.top_actors.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = `Star: ${a}`;
    actorSelect.appendChild(opt);
  });
}

// ============================================================================
// Event Listeners & Tab Navigation
// ============================================================================

function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Logo click resets to explorer
  document.getElementById('brandLogo').addEventListener('click', () => {
    switchTab('explorer');
    resetAllFilters();
  });

  // Rating Slider
  const slider = document.getElementById('minRatingSlider');
  const ratingBadge = document.getElementById('ratingValDisplay');
  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.filters.minRating = val;
    ratingBadge.textContent = val > 0 ? `${val.toFixed(1)}+ Rating` : 'Any (0.0+)';
    updateActiveFactorsCount();
    runRecommendations();
  });

  // Director / Actor Selects
  document.getElementById('directorSelect').addEventListener('change', (e) => {
    state.filters.director = e.target.value;
    updateActiveFactorsCount();
    runRecommendations();
  });

  document.getElementById('actorSelect').addEventListener('change', (e) => {
    state.filters.actor = e.target.value;
    updateActiveFactorsCount();
    runRecommendations();
  });

  // Reset Filters Button
  document.getElementById('resetFiltersBtn').addEventListener('click', resetAllFilters);
  document.getElementById('emptyResetBtn').addEventListener('click', resetAllFilters);

  // Sorting
  document.getElementById('sortBySelect').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    applySorting();
    renderCurrentPage();
  });

  // Load More Button
  document.getElementById('loadMoreBtn').addEventListener('click', () => {
    state.page++;
    renderCurrentPage(true);
  });

  // Global Search Autocomplete
  setupGlobalSearch();

  // Seed Search Autocomplete & Popular buttons
  setupSeedSearch();

  // Seed Checkboxes
  const seedCheckboxes = [
    { id: 'seedOptMood', key: 'mood' },
    { id: 'seedOptGenres', key: 'genres' },
    { id: 'seedOptKeywords', key: 'keywords' },
    { id: 'seedOptDirector', key: 'director' },
    { id: 'seedOptCast', key: 'cast' },
    { id: 'seedOptEra', key: 'era' },
    { id: 'seedOptRuntime', key: 'runtime' }
  ];

  seedCheckboxes.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        state.seedOptions[key] = e.target.checked;
        if (state.activeTab === 'seed') {
          runRecommendations();
        }
      });
    }
  });

  // Watchlist Clear Button
  document.getElementById('clearWatchlistBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your entire watchlist?')) {
      state.watchlist = [];
      saveWatchlist();
      runRecommendations();
      showToast('Watchlist cleared');
    }
  });

  // Modal Close
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('movieModal').addEventListener('click', (e) => {
    if (e.target.id === 'movieModal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function switchTab(tabName) {
  state.activeTab = tabName;
  state.page = 1;

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`${tabName}View`).classList.add('active');

  // Change heading based on view
  const heading = document.getElementById('resultsHeading');
  if (tabName === 'explorer') {
    heading.textContent = 'Factor-Matched Recommendations';
  } else if (tabName === 'seed') {
    heading.textContent = state.seedMovie 
      ? `Movies Similar to "${state.seedMovie.title}"` 
      : 'Similar Movie Recommendations';
  } else if (tabName === 'watchlist') {
    heading.textContent = 'Your Saved Watchlist';
  }

  runRecommendations();
}

// ============================================================================
// Filter Toggling & Management
// ============================================================================

function toggleMoodFilter(mood, btn) {
  if (state.filters.moods.has(mood)) {
    state.filters.moods.delete(mood);
    btn.classList.remove('active');
  } else {
    state.filters.moods.add(mood);
    btn.classList.add('active');
  }
  updateActiveFactorsCount();
  runRecommendations();
}

function toggleGenreFilter(genre, btn) {
  if (state.filters.genres.has(genre)) {
    state.filters.genres.delete(genre);
    btn.classList.remove('active');
  } else {
    state.filters.genres.add(genre);
    btn.classList.add('active');
  }
  updateActiveFactorsCount();
  runRecommendations();
}

function selectDecadeFilter(decade, btn) {
  const container = document.getElementById('decadeChipsContainer');
  if (state.filters.decade === decade) {
    state.filters.decade = null;
    btn.classList.remove('active');
  } else {
    state.filters.decade = decade;
    container.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  updateActiveFactorsCount();
  runRecommendations();
}

function selectRuntimeFilter(runtime, btn) {
  const container = document.getElementById('runtimeChipsContainer');
  if (state.filters.runtime === runtime) {
    state.filters.runtime = null;
    btn.classList.remove('active');
  } else {
    state.filters.runtime = runtime;
    container.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  updateActiveFactorsCount();
  runRecommendations();
}

function resetAllFilters() {
  state.filters.moods.clear();
  state.filters.genres.clear();
  state.filters.decade = null;
  state.filters.runtime = null;
  state.filters.minRating = 0;
  state.filters.director = '';
  state.filters.actor = '';

  document.querySelectorAll('.chips-container .chip-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('minRatingSlider').value = 0;
  document.getElementById('ratingValDisplay').textContent = 'Any (0.0+)';
  document.getElementById('directorSelect').value = '';
  document.getElementById('actorSelect').value = '';

  updateActiveFactorsCount();
  runRecommendations();
  showToast('Filters reset to default');
}

function updateActiveFactorsCount() {
  let count = 0;
  if (state.filters.moods.size > 0) count++;
  if (state.filters.genres.size > 0) count++;
  if (state.filters.decade) count++;
  if (state.filters.runtime) count++;
  if (state.filters.minRating > 0) count++;
  if (state.filters.director) count++;
  if (state.filters.actor) count++;

  const badge = document.getElementById('activeFactorsBadge');
  badge.textContent = `${count} Factor${count === 1 ? '' : 's'} Active`;

  renderActiveFilterPills();
}

function renderActiveFilterPills() {
  const container = document.getElementById('activeFilterPills');
  container.innerHTML = '';

  if (state.activeTab !== 'explorer') return;

  state.filters.moods.forEach(mood => {
    addPill(container, `Vibe: ${mood}`, () => {
      state.filters.moods.delete(mood);
      const btn = document.querySelector(`[data-type="mood"][data-value="${mood}"]`);
      if (btn) btn.classList.remove('active');
      updateActiveFactorsCount();
      runRecommendations();
    });
  });

  state.filters.genres.forEach(genre => {
    addPill(container, genre, () => {
      state.filters.genres.delete(genre);
      const btn = document.querySelector(`[data-type="genre"][data-value="${genre}"]`);
      if (btn) btn.classList.remove('active');
      updateActiveFactorsCount();
      runRecommendations();
    });
  });

  if (state.filters.decade) {
    addPill(container, state.filters.decade, () => {
      state.filters.decade = null;
      document.querySelectorAll('#decadeChipsContainer .chip-btn').forEach(b => b.classList.remove('active'));
      updateActiveFactorsCount();
      runRecommendations();
    });
  }

  if (state.filters.runtime) {
    addPill(container, state.filters.runtime, () => {
      state.filters.runtime = null;
      document.querySelectorAll('#runtimeChipsContainer .chip-btn').forEach(b => b.classList.remove('active'));
      updateActiveFactorsCount();
      runRecommendations();
    });
  }

  if (state.filters.minRating > 0) {
    addPill(container, `${state.filters.minRating.toFixed(1)}+ ⭐`, () => {
      state.filters.minRating = 0;
      document.getElementById('minRatingSlider').value = 0;
      document.getElementById('ratingValDisplay').textContent = 'Any (0.0+)';
      updateActiveFactorsCount();
      runRecommendations();
    });
  }

  if (state.filters.director) {
    addPill(container, `Dir: ${state.filters.director}`, () => {
      state.filters.director = '';
      document.getElementById('directorSelect').value = '';
      updateActiveFactorsCount();
      runRecommendations();
    });
  }

  if (state.filters.actor) {
    addPill(container, `Star: ${state.filters.actor}`, () => {
      state.filters.actor = '';
      document.getElementById('actorSelect').value = '';
      updateActiveFactorsCount();
      runRecommendations();
    });
  }
}

function addPill(container, text, onRemove) {
  const pill = document.createElement('div');
  pill.className = 'filter-pill';
  pill.innerHTML = `<span>${text}</span> <button>&times;</button>`;
  pill.querySelector('button').addEventListener('click', onRemove);
  container.appendChild(pill);
}

// ============================================================================
// Core Recommendation Engines
// ============================================================================

function runRecommendations() {
  state.page = 1;

  if (state.activeTab === 'explorer') {
    state.currentMatches = computeFactorExplorerRecommendations();
  } else if (state.activeTab === 'seed') {
    state.currentMatches = computeSeedMovieRecommendations();
  } else if (state.activeTab === 'watchlist') {
    state.currentMatches = computeWatchlistMovies();
  }

  applySorting();
  renderCurrentPage();
}

/**
 * Multi-Factor Scoring with Dynamic Weight Normalization
 * Matches only on factors selected by the user.
 */
function computeFactorExplorerRecommendations() {
  const f = state.filters;
  
  // Define base factor weights
  const weights = {
    mood: 30,
    genres: 25,
    decade: 15,
    runtime: 10,
    rating: 15,
    director: 15,
    actor: 15
  };

  // Determine active factors and calculate total weight sum
  let activeWeightSum = 0;
  const activeKeys = [];

  if (f.moods.size > 0) { activeKeys.push('mood'); activeWeightSum += weights.mood; }
  if (f.genres.size > 0) { activeKeys.push('genres'); activeWeightSum += weights.genres; }
  if (f.decade) { activeKeys.push('decade'); activeWeightSum += weights.decade; }
  if (f.runtime) { activeKeys.push('runtime'); activeWeightSum += weights.runtime; }
  if (f.minRating > 0) { activeKeys.push('rating'); activeWeightSum += weights.rating; }
  if (f.director) { activeKeys.push('director'); activeWeightSum += weights.director; }
  if (f.actor) { activeKeys.push('actor'); activeWeightSum += weights.actor; }

  // If no factors are chosen, return popular films sorted by rating/votes
  if (activeKeys.length === 0) {
    return state.movies.map(m => ({
      ...m,
      matchScore: null,
      reasons: ['🔥 Popularity Pick', `⭐ ${m.rating} Rating`]
    }));
  }

  const results = [];

  for (let i = 0; i < state.movies.length; i++) {
    const movie = state.movies[i];
    let earnedPoints = 0;
    const reasons = [];

    // Factor 1: Mood Match
    if (f.moods.size > 0) {
      let matchedMoodCount = 0;
      f.moods.forEach(m => {
        if (movie.moods.includes(m)) {
          matchedMoodCount++;
          reasons.push(m);
        }
      });
      if (matchedMoodCount > 0) {
        earnedPoints += (matchedMoodCount / f.moods.size) * weights.mood;
      }
    }

    // Factor 2: Genre Match (Jaccard overlap)
    if (f.genres.size > 0) {
      let matchedGenreCount = 0;
      f.genres.forEach(g => {
        if (movie.genres.includes(g)) {
          matchedGenreCount++;
          reasons.push(g);
        }
      });
      if (matchedGenreCount > 0) {
        earnedPoints += (matchedGenreCount / f.genres.size) * weights.genres;
      }
    }

    // Factor 3: Decade Match
    if (f.decade) {
      if (movie.decade === f.decade) {
        earnedPoints += weights.decade;
        reasons.push(movie.decade);
      }
    }

    // Factor 4: Runtime Match
    if (f.runtime) {
      if (movie.runtime_bucket === f.runtime) {
        earnedPoints += weights.runtime;
        reasons.push(movie.runtime_bucket);
      }
    }

    // Factor 5: Rating Threshold
    if (f.minRating > 0) {
      if (movie.rating >= f.minRating) {
        // Scaled by rating quality
        const ratio = Math.min(1.0, movie.rating / 8.5);
        earnedPoints += ratio * weights.rating;
        reasons.push(`⭐ ${movie.rating}`);
      } else {
        // Exclude strictly if below rating threshold
        continue;
      }
    }

    // Factor 6: Director Match
    if (f.director) {
      if (movie.director === f.director) {
        earnedPoints += weights.director;
        reasons.push(`Dir: ${movie.director}`);
      }
    }

    // Factor 7: Actor Match
    if (f.actor) {
      if (movie.cast.includes(f.actor)) {
        earnedPoints += weights.actor;
        reasons.push(`Star: ${f.actor}`);
      }
    }

    // Dynamic normalization to 0 - 100%
    const normalizedScore = Math.round((earnedPoints / activeWeightSum) * 100);

    // Keep movies that have at least some relevance (e.g. > 15%)
    if (normalizedScore > 15 || reasons.length > 0) {
      results.push({
        ...movie,
        matchScore: normalizedScore,
        reasons: reasons.slice(0, 4)
      });
    }
  }

  return results;
}

/**
 * Seed Movie Matcher ("Similar to Movie")
 * Compares any selected movie to the entire catalog based on toggled dimensions.
 */
function computeSeedMovieRecommendations() {
  const seed = state.seedMovie;
  if (!seed) return [];

  const opts = state.seedOptions;
  const weights = {
    mood: 25,
    genres: 25,
    keywords: 25,
    director: 15,
    cast: 15,
    era: 10,
    runtime: 10
  };

  let totalActive = 0;
  if (opts.mood) totalActive += weights.mood;
  if (opts.genres) totalActive += weights.genres;
  if (opts.keywords) totalActive += weights.keywords;
  if (opts.director && seed.director !== 'Unknown') totalActive += weights.director;
  if (opts.cast && seed.cast.length > 0) totalActive += weights.cast;
  if (opts.era) totalActive += weights.era;
  if (opts.runtime) totalActive += weights.runtime;

  if (totalActive === 0) totalActive = 100;

  const results = [];

  for (let i = 0; i < state.movies.length; i++) {
    const movie = state.movies[i];
    if (movie.id === seed.id) continue; // Exclude seed movie itself

    let earned = 0;
    const reasons = [];

    // Mood overlap
    if (opts.mood && seed.moods.length > 0) {
      const sharedMoods = movie.moods.filter(m => seed.moods.includes(m));
      if (sharedMoods.length > 0) {
        earned += (sharedMoods.length / seed.moods.length) * weights.mood;
        reasons.push(`Shared Vibe: ${sharedMoods[0]}`);
      }
    }

    // Genres overlap
    if (opts.genres && seed.genres.length > 0) {
      const sharedGenres = movie.genres.filter(g => seed.genres.includes(g));
      if (sharedGenres.length > 0) {
        earned += (sharedGenres.length / seed.genres.length) * weights.genres;
        reasons.push(`Genres: ${sharedGenres.slice(0, 2).join(', ')}`);
      }
    }

    // Keywords / Plot themes overlap
    if (opts.keywords && seed.keywords.length > 0) {
      const sharedKeywords = movie.keywords.filter(k => seed.keywords.includes(k));
      if (sharedKeywords.length > 0) {
        earned += Math.min(1.0, sharedKeywords.length / 2) * weights.keywords;
        reasons.push(`Theme: ${sharedKeywords.slice(0, 2).join(', ')}`);
      }
    }

    // Same Director
    if (opts.director && seed.director !== 'Unknown' && movie.director === seed.director) {
      earned += weights.director;
      reasons.push(`Dir: ${movie.director}`);
    }

    // Cast overlap
    if (opts.cast && seed.cast.length > 0) {
      const sharedCast = movie.cast.filter(a => seed.cast.includes(a));
      if (sharedCast.length > 0) {
        earned += (sharedCast.length / seed.cast.length) * weights.cast;
        reasons.push(`Stars: ${sharedCast[0]}`);
      }
    }

    // Same Era
    if (opts.era && movie.decade === seed.decade) {
      earned += weights.era;
      reasons.push(`${movie.decade} Era`);
    }

    // Same Runtime Bucket
    if (opts.runtime && movie.runtime_bucket === seed.runtime_bucket) {
      earned += weights.runtime;
      reasons.push(movie.runtime_bucket);
    }

    const score = Math.round((earned / totalActive) * 100);

    if (score >= 20 || reasons.length > 0) {
      results.push({
        ...movie,
        matchScore: score,
        reasons: reasons.slice(0, 3)
      });
    }
  }

  return results;
}

/**
 * Watchlist view movies
 */
function computeWatchlistMovies() {
  const set = new Set(state.watchlist);
  return state.movies
    .filter(m => set.has(m.id))
    .map(m => ({
      ...m,
      matchScore: null,
      reasons: ['🔖 In Your Watchlist', `⭐ ${m.rating} Rating`]
    }));
}

// ============================================================================
// Sorting & Pagination
// ============================================================================

function applySorting() {
  const sort = state.sortBy;

  state.currentMatches.sort((a, b) => {
    if (sort === 'match') {
      if (a.matchScore !== null && b.matchScore !== null) {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      }
      return b.votes - a.votes;
    }
    if (sort === 'rating') return b.rating - a.rating || b.votes - a.votes;
    if (sort === 'votes') return b.votes - a.votes;
    if (sort === 'newest') return (b.release_year || 0) - (a.release_year || 0);
    if (sort === 'oldest') return (a.release_year || 0) - (b.release_year || 0);
    return 0;
  });
}

function renderCurrentPage(append = false) {
  const grid = document.getElementById('moviesGrid');
  const emptyState = document.getElementById('emptyState');
  const countBadge = document.getElementById('resultsCountBadge');
  const paginationContainer = document.getElementById('paginationContainer');

  const total = state.currentMatches.length;
  countBadge.textContent = `${total.toLocaleString()} Movies`;

  if (total === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'flex';
    paginationContainer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';

  const startIndex = 0;
  const endIndex = state.page * state.pageSize;
  const visibleMovies = state.currentMatches.slice(startIndex, endIndex);

  if (!append) {
    grid.innerHTML = '';
  }

  // Render cards
  const fragment = document.createDocumentFragment();
  visibleMovies.forEach(movie => {
    fragment.appendChild(createMovieCardElement(movie));
  });

  grid.innerHTML = '';
  grid.appendChild(fragment);

  // Pagination button
  if (endIndex < total) {
    paginationContainer.style.display = 'flex';
  } else {
    paginationContainer.style.display = 'none';
  }
}

// ============================================================================
// Movie Card Element Factory
// ============================================================================

function createMovieCardElement(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = movie.id;

  const isBookmarked = state.watchlist.includes(movie.id);
  const primaryGenre = movie.genres[0] || 'Drama';
  const posterGradient = GENRE_GRADIENTS[primaryGenre] || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';

  // Match badge styling
  let matchBadgeHtml = '';
  if (movie.matchScore !== null) {
    let badgeClass = 'match-low';
    if (movie.matchScore >= 80) badgeClass = 'match-high';
    else if (movie.matchScore >= 55) badgeClass = 'match-med';

    matchBadgeHtml = `
      <div class="match-badge ${badgeClass}">
        <span>🎯</span> ${movie.matchScore}% Match
      </div>
    `;
  } else {
    matchBadgeHtml = `
      <div class="match-badge match-med">
        <span>🎬</span> ${primaryGenre}
      </div>
    `;
  }

  // Reason tags
  const reasonsHtml = movie.reasons && movie.reasons.length > 0
    ? movie.reasons.map(r => `<span class="reason-tag">${r}</span>`).join('')
    : `<span class="reason-tag">${movie.genres.slice(0, 2).join(' • ')}</span>`;

  card.innerHTML = `
    <div class="card-poster" style="background: ${posterGradient};">
      <div class="poster-top-bar">
        ${matchBadgeHtml}
        <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" title="${isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}">
          ${isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <div class="poster-bottom-bar">
        <span class="card-rating">⭐ ${movie.rating > 0 ? movie.rating.toFixed(1) : 'NR'}</span>
        <span class="card-year">${movie.release_year || 'Unknown'} • ${movie.runtime ? movie.runtime + 'm' : 'N/A'}</span>
      </div>
    </div>
    
    <div class="card-content">
      <h3 class="card-title">${escapeHtml(movie.title)}</h3>
      <div class="card-meta-line">
        <span>Dir: <strong>${escapeHtml(movie.director)}</strong></span>
      </div>
      <p class="card-overview">${escapeHtml(movie.overview || 'No synopsis available.')}</p>
      
      <div class="match-reasons-box">
        <span class="reasons-title">Match Signals:</span>
        <div class="reasons-tags">
          ${reasonsHtml}
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-secondary btn-card-action btn-find-similar">
          <span>🎯</span> Similar
        </button>
        <button class="btn btn-primary btn-card-action btn-view-details">
          <span>ℹ️</span> Details
        </button>
      </div>
    </div>
  `;

  // Attach card event listeners
  const bookmarkBtn = card.querySelector('.btn-bookmark');
  bookmarkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWatchlist(movie.id, bookmarkBtn);
  });

  const similarBtn = card.querySelector('.btn-find-similar');
  similarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSeedMovie(movie, true);
  });

  const detailsBtn = card.querySelector('.btn-view-details');
  detailsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openMovieDetails(movie);
  });

  card.querySelector('.card-title').addEventListener('click', () => {
    openMovieDetails(movie);
  });

  return card;
}

// ============================================================================
// Seed Movie Management & Search
// ============================================================================

function setSeedMovie(movie, autoSwitchTab = true) {
  state.seedMovie = movie;

  const container = document.getElementById('seedActiveContainer');
  const preview = document.getElementById('seedMoviePreview');
  container.style.display = 'grid';

  const primaryGenre = movie.genres[0] || 'Drama';
  const gradient = GENRE_GRADIENTS[primaryGenre] || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';

  preview.innerHTML = `
    <span class="seed-badge-title">Selected Seed Movie</span>
    <h3 class="seed-title">${escapeHtml(movie.title)}</h3>
    <div class="seed-meta">
      <span>⭐ ${movie.rating}</span>
      <span>•</span>
      <span>${movie.release_year || ''}</span>
      <span>•</span>
      <span>${movie.runtime ? movie.runtime + 'm' : ''}</span>
    </div>
    <div class="seed-meta">
      <span>Dir: <strong>${escapeHtml(movie.director)}</strong></span>
    </div>
    <div class="seed-genres">
      ${movie.genres.map(g => `<span class="seed-genre-pill">${g}</span>`).join('')}
    </div>
  `;

  // Update checkbox labels with movie specifics
  document.getElementById('seedDirectorName').textContent = `(${movie.director})`;
  document.getElementById('seedEraName').textContent = `(${movie.decade})`;
  document.getElementById('seedRuntimeName').textContent = `(${movie.runtime_bucket})`;

  if (autoSwitchTab) {
    switchTab('seed');
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }
}

function setupSeedSearch() {
  const input = document.getElementById('seedSearchInput');
  const dropdown = document.getElementById('seedSearchDropdown');

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = state.movies
      .filter(m => m.title.toLowerCase().includes(query))
      .slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-dropdown-item"><span class="search-item-meta">No movies matching "${query}"</span></div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map(m => `
      <div class="search-dropdown-item" data-id="${m.id}">
        <div class="search-item-info">
          <span class="search-item-title">${escapeHtml(m.title)}</span>
          <span class="search-item-meta">${m.release_year || 'N/A'} • Dir: ${escapeHtml(m.director)}</span>
        </div>
        <span class="search-item-rating">⭐ ${m.rating}</span>
      </div>
    `).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id, 10);
        const selected = state.movies.find(m => m.id === id);
        if (selected) {
          setSeedMovie(selected, true);
          input.value = '';
          dropdown.style.display = 'none';
        }
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Popular seed button clicks
  document.querySelectorAll('.seed-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const m = state.movies.find(x => x.id === id);
      if (m) setSeedMovie(m, true);
    });
  });
}

function setupGlobalSearch() {
  const input = document.getElementById('globalSearchInput');
  const dropdown = document.getElementById('searchDropdown');
  const clearBtn = document.getElementById('clearSearchBtn');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    clearBtn.style.display = q.length > 0 ? 'block' : 'none';

    if (q.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    const matches = state.movies
      .filter(m => m.title.toLowerCase().includes(q) || m.director.toLowerCase().includes(q))
      .slice(0, 10);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-dropdown-item"><span class="search-item-meta">No matching films found</span></div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map(m => `
      <div class="search-dropdown-item" data-id="${m.id}">
        <div class="search-item-info">
          <span class="search-item-title">${escapeHtml(m.title)}</span>
          <span class="search-item-meta">${m.release_year || 'N/A'} • ${m.genres.slice(0, 2).join(', ')} • Dir: ${escapeHtml(m.director)}</span>
        </div>
        <span class="search-item-rating">⭐ ${m.rating}</span>
      </div>
    `).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id, 10);
        const movie = state.movies.find(m => m.id === id);
        if (movie) {
          openMovieDetails(movie);
          dropdown.style.display = 'none';
        }
      });
    });
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    dropdown.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// ============================================================================
// Movie Details Modal
// ============================================================================

function openMovieDetails(movie) {
  const modal = document.getElementById('movieModal');
  const body = document.getElementById('modalBody');

  const isBookmarked = state.watchlist.includes(movie.id);

  body.innerHTML = `
    <div class="modal-header-section">
      <h2 class="modal-title">${escapeHtml(movie.title)}</h2>
      <div class="modal-meta-row">
        <span class="modal-rating-pill">⭐ ${movie.rating > 0 ? movie.rating.toFixed(1) : 'NR'} (${movie.votes.toLocaleString()} votes)</span>
        <span>•</span>
        <span>${movie.release_year || 'Unknown Year'}</span>
        <span>•</span>
        <span>${movie.runtime ? movie.runtime + ' mins' : 'N/A'}</span>
        <span>•</span>
        <span>${movie.decade}</span>
      </div>
      <div class="modal-genres">
        ${movie.genres.map(g => `<span class="modal-genre-tag">${g}</span>`).join('')}
      </div>
    </div>

    <p class="modal-overview-text">${escapeHtml(movie.overview || 'No synopsis provided.')}</p>

    <div class="modal-details-grid">
      <div class="modal-detail-item">
        <span class="modal-detail-label">Director</span>
        <span class="modal-detail-val">${escapeHtml(movie.director)}</span>
      </div>
      <div class="modal-detail-item">
        <span class="modal-detail-label">Runtime Profile</span>
        <span class="modal-detail-val">${movie.runtime_bucket}</span>
      </div>
      <div class="modal-detail-item" style="grid-column: span 2;">
        <span class="modal-detail-label">Top Cast</span>
        <span class="modal-detail-val">${movie.cast.length > 0 ? escapeHtml(movie.cast.join(', ')) : 'Not listed'}</span>
      </div>
      <div class="modal-detail-item" style="grid-column: span 2;">
        <span class="modal-detail-label">Vibe & Mood Tags</span>
        <span class="modal-detail-val">${movie.moods.map(m => `${MOOD_ICONS[m] || '✨'} ${m}`).join('  •  ')}</span>
      </div>
    </div>

    ${movie.keywords && movie.keywords.length > 0 ? `
      <div>
        <span class="modal-detail-label" style="display:block; margin-bottom: 0.4rem;">Story Themes & Keywords</span>
        <div class="modal-keywords-row">
          ${movie.keywords.map(k => `<span class="modal-keyword-pill">#${escapeHtml(k)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    <div class="modal-actions-row">
      <button class="btn btn-primary" id="modalFindSimilarBtn">
        <span>🎯</span> Find Movies Similar to This
      </button>
      <button class="btn btn-secondary" id="modalWatchlistBtn">
        <span>${isBookmarked ? '★ In Watchlist' : '☆ Add to Watchlist'}</span>
      </button>
    </div>
  `;

  // Modal actions
  document.getElementById('modalFindSimilarBtn').addEventListener('click', () => {
    closeModal();
    setSeedMovie(movie, true);
  });

  const watchlistBtn = document.getElementById('modalWatchlistBtn');
  watchlistBtn.addEventListener('click', () => {
    toggleWatchlist(movie.id);
    const updated = state.watchlist.includes(movie.id);
    watchlistBtn.innerHTML = `<span>${updated ? '★ In Watchlist' : '☆ Add to Watchlist'}</span>`;
  });

  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('movieModal').classList.remove('open');
}

// ============================================================================
// Watchlist Logic & Storage
// ============================================================================

function toggleWatchlist(movieId, optionalButtonElement = null) {
  const index = state.watchlist.indexOf(movieId);
  if (index > -1) {
    state.watchlist.splice(index, 1);
    showToast('Removed from Watchlist');
    if (optionalButtonElement) {
      optionalButtonElement.classList.remove('bookmarked');
      optionalButtonElement.textContent = '☆';
      optionalButtonElement.title = 'Add to Watchlist';
    }
  } else {
    state.watchlist.push(movieId);
    showToast('Added to Watchlist ⭐');
    if (optionalButtonElement) {
      optionalButtonElement.classList.add('bookmarked');
      optionalButtonElement.textContent = '★';
      optionalButtonElement.title = 'Remove from Watchlist';
    }
  }

  saveWatchlist();
  updateWatchlistCount();

  if (state.activeTab === 'watchlist') {
    runRecommendations();
  }
}

function saveWatchlist() {
  localStorage.setItem('cinematch_watchlist', JSON.stringify(state.watchlist));
}

function updateWatchlistCount() {
  document.getElementById('watchlistCount').textContent = state.watchlist.length;
}

// ============================================================================
// Utilities
// ============================================================================

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toastNotification');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
