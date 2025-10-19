import { fetchDeploymentTimeline } from './deploymentTimeline.js';

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
    const { items } = await fetchDeploymentTimeline({ limit: 50 });
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
      setStatus(
        container,
        'Unable to load the Vercel timeline right now. Check the console for details.'
      );
    });
  }
}

function renderTimeline(container, items, onOpenDeployment) {
  container.dataset.state = 'ready';
  container.innerHTML = '';

  for (const item of items) {
    container.appendChild(createCard(item, onOpenDeployment));
  }
}

function createCard(item, onOpenDeployment) {
  const card = document.createElement('article');
  card.className = 'deployment-card';
  card.dataset.deploymentId = item.id;
  card.dataset.favorite = 'false';

  const header = document.createElement('header');
  header.className = 'deployment-card__header';
  card.appendChild(header);

  const context = document.createElement('span');
  context.className = 'deployment-card__context';
  context.textContent = item.socialContext.label;
  context.title = item.socialContext.description;
  header.appendChild(context);

  const actions = document.createElement('div');
  actions.className = 'deployment-card__actions';
  header.appendChild(actions);

  const date = document.createElement('time');
  date.className = 'deployment-card__date';
  date.dateTime = item.createdAt;
  date.textContent = item.displayDate;
  actions.appendChild(date);

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'deployment-card__favorite';
  favoriteButton.setAttribute('aria-label', 'Mark as favorite');
  favoriteButton.innerHTML = '☆';
  actions.appendChild(favoriteButton);

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

  const title = document.createElement('h2');
  title.className = 'deployment-card__title';
  title.textContent = item.title;
  card.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'deployment-card__summary';
  summary.textContent = item.summary;
  card.appendChild(summary);

  const footer = document.createElement('footer');
  footer.className = 'deployment-card__meta';
  card.appendChild(footer);

  const branch = document.createElement('span');
  branch.className = 'deployment-card__meta-item';
  branch.textContent = `Branch: ${item.git.branch}`;
  footer.appendChild(branch);

  const author = document.createElement('span');
  author.className = 'deployment-card__meta-item';
  author.textContent = `Author: ${item.git.commitAuthorName}`;
  footer.appendChild(author);

  if (item.links?.deployment) {
    if (typeof onOpenDeployment === 'function') {
      const inlineButton = document.createElement('button');
      inlineButton.type = 'button';
      inlineButton.className = 'deployment-card__link deployment-card__link--inline';
      inlineButton.textContent = 'Open inline';
      inlineButton.addEventListener('click', () => onOpenDeployment(item.links.deployment));
      footer.appendChild(inlineButton);
    }

    const previewLink = document.createElement('a');
    previewLink.className = 'deployment-card__link';
    previewLink.href = item.links.deployment;
    previewLink.target = '_blank';
    previewLink.rel = 'noopener noreferrer';
    previewLink.textContent = 'Open build';
    footer.appendChild(previewLink);
  }

  if (item.links?.gitCommit) {
    const commitLink = document.createElement('a');
    commitLink.className = 'deployment-card__link';
    commitLink.href = item.links.gitCommit;
    commitLink.target = '_blank';
    commitLink.rel = 'noopener noreferrer';
    commitLink.textContent = 'View commit';
    footer.appendChild(commitLink);
  }

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
