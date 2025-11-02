import { fetchDeploymentTimeline } from './deploymentTimeline.js';

const BATCH_SIZE = 8;
const containerState = new WeakMap();

export async function initialiseDeploymentTimeline(options = {}) {
  const { onOpenDeployment } = options;
  const containers = Array.from(document.querySelectorAll('[data-deployment-timeline]'));
  if (!containers.length) {
    return;
  }

  try {
    containers.forEach((container) => {
      setStatus(container, 'Loading latest deployment timeline…');
    });
    const { items } = await fetchDeploymentTimeline();
    if (!items.length) {
      containers.forEach((container) => {
        setStatus(container, 'No successful Vercel deployments found yet.');
      });
      return;
    }
    containers.forEach((container) => {
      renderTimeline(container, items, onOpenDeployment);
    });
  } catch (error) {
    console.error('Failed to load deployment timeline', error);
    containers.forEach((container) => {
      setStatus(container, 'Unable to load the Vercel timeline right now. Check the console for details.');
    });
  }
}

function renderTimeline(container, items, onOpenDeployment) {
  const previousState = containerState.get(container);
  if (previousState?.observer) {
    previousState.observer.disconnect();
  }

  container.dataset.state = 'ready';
  container.innerHTML = '';

  const track = document.createElement('div');
  track.className = 'deployment-timeline__track';

  const sentinel = document.createElement('div');
  sentinel.className = 'deployment-timeline__sentinel';

  const state = {
    items,
    pointer: 0,
    track,
    sentinel,
    onOpenDeployment,
    observer: null,
  };

  appendBatch(state);
  track.appendChild(sentinel);
  container.appendChild(track);

  if (state.pointer < items.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            appendBatch(state);
            if (state.pointer >= state.items.length && state.observer) {
              state.observer.disconnect();
              state.observer = null;
              state.sentinel?.remove?.();
              state.sentinel = null;
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.01,
      },
    );
    observer.observe(sentinel);
    state.observer = observer;
  } else {
    sentinel.remove();
    state.sentinel = null;
  }

  containerState.set(container, state);
}

function appendBatch(state) {
  if (!state || state.pointer >= state.items.length || !state.track) return;
  const end = Math.min(state.items.length, state.pointer + BATCH_SIZE);
  for (let index = state.pointer; index < end; index += 1) {
    const entry = createTimelineEntry(state.items[index], state.onOpenDeployment, index);
    if (state.sentinel && state.sentinel.parentNode === state.track) {
      state.track.insertBefore(entry, state.sentinel);
    } else {
      state.track.appendChild(entry);
    }
  }
  state.pointer = end;

  if (state.pointer >= state.items.length && state.sentinel) {
    state.sentinel.remove();
    state.sentinel = null;
  }
}

function createTimelineEntry(item, onOpenDeployment, index) {
  const entry = document.createElement('div');
  entry.className = 'deployment-timeline__entry';
  entry.dataset.timelineIndex = String(index);

  const card = createCard(item, onOpenDeployment);
  card.classList.add('deployment-card--tip');
  entry.appendChild(card);

  const marker = document.createElement('div');
  marker.className = 'deployment-timeline__marker';
  entry.appendChild(marker);

  const label = document.createElement('time');
  label.className = 'deployment-timeline__label';
  label.dateTime = item.createdAt;
  label.textContent = item.displayDate;
  label.title = item.relativeTime ?? item.displayDate;
  entry.appendChild(label);

  return entry;
}

function createCard(item, onOpenDeployment) {
  const card = document.createElement('article');
  card.className = 'deployment-card';
  card.dataset.deploymentId = item.id;
  card.dataset.favorite = 'false';

  const preview = document.createElement('figure');
  preview.className = 'deployment-card__preview';
  const previewImage = document.createElement('img');
  previewImage.className = 'deployment-card__preview-image';
  previewImage.loading = 'lazy';
  previewImage.decoding = 'async';
  previewImage.alt = `${item.title} preview`;
  previewImage.src = buildScreenshotUrl(item.links?.deployment);
  preview.appendChild(previewImage);

  const previewOverlay = document.createElement('div');
  previewOverlay.className = 'deployment-card__preview-overlay';
  const context = document.createElement('span');
  context.className = 'deployment-card__context';
  context.textContent = item.socialContext.label;
  context.title = item.socialContext.description;
  previewOverlay.appendChild(context);

  const date = document.createElement('time');
  date.className = 'deployment-card__date';
  date.dateTime = item.createdAt;
  date.textContent = item.displayDate;
  previewOverlay.appendChild(date);

  preview.appendChild(previewOverlay);

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'deployment-card__favorite';
  favoriteButton.setAttribute('aria-label', 'Mark as favorite');
  favoriteButton.innerHTML = '☆';
  preview.appendChild(favoriteButton);

  const storedFavorites = getStoredFavorites();
  if (storedFavorites.has(item.id)) {
    card.dataset.favorite = 'true';
    favoriteButton.classList.add('is-active');
    favoriteButton.innerHTML = '★';
  }

  favoriteButton.addEventListener('click', () => {
    const isActive = favoriteButton.classList.toggle('is-active');
    card.dataset.favorite = String(isActive);
    favoriteButton.innerHTML = isActive ? '★' : '☆';
    updateStoredFavorites(item.id, isActive);
  });

  card.appendChild(preview);

  const body = document.createElement('div');
  body.className = 'deployment-card__body';

  const title = document.createElement('h2');
  title.className = 'deployment-card__title';
  title.textContent = item.title;
  body.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'deployment-card__summary';
  summary.textContent = item.summary || 'Deployment triggered from Vercel.';
  body.appendChild(summary);

  const meta = document.createElement('div');
  meta.className = 'deployment-card__meta';
  const branch = document.createElement('span');
  branch.className = 'deployment-card__meta-item';
  branch.textContent = `Branch: ${item.git.branch}`;
  meta.appendChild(branch);
  const author = document.createElement('span');
  author.className = 'deployment-card__meta-item';
  author.textContent = `Author: ${item.git.commitAuthorName}`;
  meta.appendChild(author);
  body.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'deployment-card__actions';

  if (item.links?.deployment && typeof onOpenDeployment === 'function') {
    const inlineButton = document.createElement('button');
    inlineButton.type = 'button';
    inlineButton.className = 'deployment-card__link deployment-card__link--inline';
    inlineButton.textContent = 'Open inline';
    inlineButton.addEventListener('click', () => onOpenDeployment(item.links.deployment));
    actions.appendChild(inlineButton);
  }

  if (item.links?.deployment) {
    const previewLink = document.createElement('a');
    previewLink.className = 'deployment-card__link';
    previewLink.href = item.links.deployment;
    previewLink.target = '_blank';
    previewLink.rel = 'noopener noreferrer';
    previewLink.textContent = 'Open build';
    actions.appendChild(previewLink);
  }

  if (item.links?.gitCommit) {
    const commitLink = document.createElement('a');
    commitLink.className = 'deployment-card__link';
    commitLink.href = item.links.gitCommit;
    commitLink.target = '_blank';
    commitLink.rel = 'noopener noreferrer';
    commitLink.textContent = 'View commit';
    actions.appendChild(commitLink);
  }

  body.appendChild(actions);
  card.appendChild(body);

  return card;
}

function setStatus(container, message) {
  container.dataset.state = 'loading';
  container.innerHTML = `<p class="deployment-timeline__status">${message}</p>`;
}

function getStoredFavorites() {
  try {
    const raw = localStorage.getItem('deploymentFavorites');
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed);
    }
    return new Set();
  } catch (error) {
    console.warn('Failed to parse stored favorites', error);
    return new Set();
  }
}

function updateStoredFavorites(deploymentId, isFavorite) {
  const favorites = getStoredFavorites();
  if (isFavorite) {
    favorites.add(deploymentId);
  } else {
    favorites.delete(deploymentId);
  }
  try {
    localStorage.setItem('deploymentFavorites', JSON.stringify(Array.from(favorites)));
  } catch (error) {
    console.warn('Failed to persist favorites', error);
  }
}

function buildScreenshotUrl(deploymentUrl) {
  if (!deploymentUrl) {
    return 'https://v1.screenshot.11ty.dev/https://example.com/opengraph/';
  }
  try {
    const normalized = deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;
    const encoded = encodeURIComponent(normalized);
    return `https://v1.screenshot.11ty.dev/${encoded}/opengraph/`;
  } catch {
    return 'https://v1.screenshot.11ty.dev/https://example.com/opengraph/';
  }
}
