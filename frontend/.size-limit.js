module.exports = [
  {
    name: 'Main Bundle (Critical Path)',
    path: 'build/static/js/runtime*.js',
    limit: '15 KB'
  },
  {
    name: 'React Bundle',
    path: 'build/static/js/react*.js',
    limit: '45 KB'
  },
  {
    name: 'Main Application Bundle',
    path: 'build/static/js/main*.js',
    limit: '150 KB'
  },
  {
    name: 'Vendor Bundle',
    path: 'build/static/js/vendors*.js',
    limit: '250 KB'
  },
  {
    name: 'CSS Bundle',
    path: 'build/static/css/*.css',
    limit: '50 KB'
  },
  {
    name: 'Critical CSS (Inline)',
    path: 'build/index.html',
    limit: '14 KB',
    running: false
  },
  {
    name: 'All JavaScript',
    path: 'build/static/js/*.js',
    limit: '500 KB'
  },
  {
    name: 'All Assets',
    path: 'build/static/**/*',
    limit: '1 MB'
  }
];