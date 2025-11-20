// Footer initialization
function initFooter() {
  // Set current year
  const yearElement = document.getElementById('footer-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Load and display version
  fetch('/version.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch version');
      return res.json();
    })
    .then(data => {
      const versionElement = document.getElementById('footer-version');
      if (versionElement && data.version) {
        versionElement.textContent = `v${data.version}`;
      }
    })
    .catch(() => {
      // Fallback if version.json doesn't exist or can't be read
      const versionElement = document.getElementById('footer-version');
      if (versionElement) {
        versionElement.textContent = 'vdev';
      }
    });
}

// Initialize footer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  initFooter();
}

