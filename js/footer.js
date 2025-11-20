// Footer initialization
function initFooter() {
  // Set current year
  const yearElement = document.getElementById('footer-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Load and display version
  const versionElement = document.getElementById('footer-version');
  if (!versionElement) {
    console.warn('Footer version element not found');
    return;
  }

  // Try to fetch version.json
  fetch('/version.json')
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data && data.version) {
        versionElement.textContent = data.version;
      } else {
        console.warn('Version data missing or invalid:', data);
      }
    })
    .catch(err => {
      // Try alternative path
      console.warn('Failed to fetch /version.json, trying /public/version.json:', err);
      return fetch('/public/version.json')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && data.version) {
            versionElement.textContent = data.version;
          }
        })
        .catch(err2 => {
          console.error('Could not load version from any path:', err2);
        });
    });
}

// Initialize footer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  initFooter();
}

