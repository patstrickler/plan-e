'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  // Normalize pathname to handle basePath
  const normalizedPath = pathname?.replace('/plan-e', '') || '';
  
  const navItems = [
    { href: '/', label: 'Projects', paths: ['/', '/plan-e', '/plan-e/'] },
    { href: '/milestones', label: 'Milestones', paths: ['/milestones'] },
    { href: '/tasks', label: 'Tasks', paths: ['/tasks'] },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (normalizedPath === '/' || normalizedPath === '') {
      return item.href === '/';
    }
    return normalizedPath === item.href || normalizedPath.startsWith(item.href + '/');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Plan-E
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const active = isActive(item);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                    ${active
                      ? 'bg-blue-600 text-white shadow-md dark:bg-blue-500 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

