export function initDeploymentViewer() {
  const container = document.getElementById('deployment-viewer');
  const iframe = document.getElementById('deployment-viewer-iframe');
  const loader = document.getElementById('deployment-viewer-loader');
  const closeButton = document.getElementById('deployment-viewer-close');

  if (!container || !iframe || !loader || !closeButton) {
    return {
      open: () => {},
      close: () => {},
    };
  }

  const setVisible = (visible) => {
    container.classList.toggle('visible', visible);
    container.setAttribute('aria-hidden', String(!visible));
    document.body.classList.toggle('deployment-viewer-open', visible);
  };

  const close = () => {
    setVisible(false);
    loader.hidden = true;
    iframe.style.visibility = 'hidden';
    iframe.src = 'about:blank';
  };

  const open = (url) => {
    if (!url) {
      return;
    }
    loader.hidden = false;
    iframe.style.visibility = 'hidden';
    setVisible(true);
    iframe.src = url;
  };

  iframe.addEventListener('load', () => {
    loader.hidden = true;
    iframe.style.visibility = 'visible';
  });

  closeButton.addEventListener('click', () => {
    close();
  });

  container.addEventListener('click', (event) => {
    if (event.target === container || event.target.classList.contains('deployment-viewer__backdrop')) {
      close();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && container.classList.contains('visible')) {
      close();
    }
  });

  return {
    open,
    close,
  };
}
