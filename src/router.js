/* ========================================
   DormFlow Router — Supabase-compatible
   Hash-based SPA router with role guards
   ======================================== */

import { getCurrentUser } from './auth.js';

const routes = {};
let currentCleanup = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

function getHash() {
  return window.location.hash || '#/splash';
}

function matchRoute(hash) {
  if (routes[hash]) return { handler: routes[hash], params: {} };

  for (const pattern of Object.keys(routes)) {
    const patternParts = pattern.split('/');
    const hashParts    = hash.split('/');
    if (patternParts.length !== hashParts.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = hashParts[i];
      } else if (patternParts[i] !== hashParts[i]) {
        match = false; break;
      }
    }
    if (match) return { handler: routes[pattern], params };
  }
  return null;
}

// Role access map
const roleAccess = {
  '#/student': ['student'],
  '#/warden':  ['boys_warden', 'girls_warden'],
  '#/gate':    ['security'],
  '#/admin':   ['admin'],
};

function getHomeRoute(role) {
  const map = {
    student:      '#/student/dashboard',
    boys_warden:  '#/warden/dashboard',
    girls_warden: '#/warden/dashboard',
    security:     '#/gate/dashboard',
    admin:        '#/admin/dashboard',
  };
  return map[role] || '#/login';
}

function checkAccess(hash, user) {
  if (['#/splash', '#/login', '#/register'].includes(hash)) return true;
  if (!user) return false;

  for (const [prefix, roles] of Object.entries(roleAccess)) {
    if (hash.startsWith(prefix)) return roles.includes(user.role);
  }
  return true;
}

export async function handleRoute() {
  const hash = getHash();
  const user = getCurrentUser();   // cached — set by loadCurrentUser() on boot

  // Cleanup previous page
  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // Auto-redirect logged-in users from auth pages
  if (['#/splash', '#/login', '#/', ''].includes(hash) && user) {
    navigate(getHomeRoute(user.role));
    return;
  }

  // Access check
  if (!checkAccess(hash, user)) {
    navigate(user ? getHomeRoute(user.role) : '#/login');
    return;
  }

  const match = matchRoute(hash);
  if (match) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const result = match.handler(app, match.params);
    // Support both sync and async page handlers
    const cleanup = result instanceof Promise ? await result : result;
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } else {
    navigate(user ? getHomeRoute(user.role) : '#/splash');
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
