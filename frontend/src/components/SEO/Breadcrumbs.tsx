import React from 'react';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  breadcrumbs, 
  className = '' 
}) => {
  if (!breadcrumbs.length) return null;

  // Always include home as first breadcrumb
  const allBreadcrumbs = [
    { name: 'Home', url: '/' },
    ...breadcrumbs
  ];

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-gray-600 mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <div className="flex items-center space-x-2">
        {allBreadcrumbs.map((crumb, index) => {
          const isLast = index === allBreadcrumbs.length - 1;
          const isFirst = index === 0;
          
          return (
            <React.Fragment key={`${crumb.name}-${index}`}>
              {/* Separator (except for first item) */}
              {!isFirst && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              )}
              
              {/* Breadcrumb Item */}
              <div className="flex items-center">
                {isFirst && (
                  <HomeIcon className="h-4 w-4 mr-1" />
                )}
                
                {isLast ? (
                  // Current page - not clickable
                  <span 
                    className="font-medium text-gray-900 truncate max-w-xs"
                    aria-current="page"
                  >
                    {crumb.name}
                  </span>
                ) : (
                  // Clickable breadcrumb
                  <Link
                    to={crumb.url}
                    className="hover:text-blue-600 transition-colors truncate max-w-xs"
                  >
                    {crumb.name}
                  </Link>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumbs;