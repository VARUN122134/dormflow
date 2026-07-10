/* ========================================
   UCE IT Router — Supabase-compatible
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
  '#/mess':    ['student'],    // additionally requires isMessMember check
  '#/warden':  ['boys_warden', 'girls_warden'],
  '#/gate':    ['security', 'mess_incharge'],
  '#/admin':   ['admin'],
};

function getHomeRoute(role) {
  const map = {
    student:      '#/student/dashboard',
    boys_warden:  '#/warden/dashboard',
    girls_warden: '#/warden/dashboard',
    security:     '#/gate/dashboard',
    admin:        '#/admin/dashboard',
    mess_incharge:'#/gate/dashboard',
  };
  return map[role] || '#/student/dashboard';
}

function checkAccess(hash, user) {
  if (['#/splash', '#/login', '#/register'].includes(hash)) return true;
  if (!user) return false;

  for (const [prefix, roles] of Object.entries(roleAccess)) {
    if (hash.startsWith(prefix)) {
      // Mess routes require student role + isMessMember flag
      if (prefix === '#/mess') {
        return roles.includes(user.role) && user.isMessMember === true;
      }
      return roles.includes(user.role);
    }
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
    const target = user ? getHomeRoute(user.role) : '#/login';
    if (target === hash) {
      // Would loop silently — force to login or safe fallback
      navigate(user ? '#/login' : '#/splash');
    } else {
      navigate(target);
    }
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
