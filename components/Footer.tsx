'use client';

import { useEffect, useState } from 'react';

export default function Footer() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Fetch version from version.json
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => {
        // Fallback if version.json doesn't exist or can't be read
        setVersion('dev');
      });
  }, []);

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Plan-E. All rights reserved.
          </p>
          {version && (
            <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
              v{version}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

