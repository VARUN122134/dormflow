import { getCurrentUser, refreshProfile } from './auth.js';

const MAX_STACK = 20;
const routes = {};
let currentCleanup = null;
const navStack = [];
let lastHash = '';

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function goBack(fallback) {
  const target = navStack.pop();
  window.__skipNavStack = true;
  window.location.hash = target || fallback || '#/';
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

const roleAccess = {
  '#/student': ['student'],
  '#/warden':  ['boys_warden', 'girls_warden', 'mess_incharge'],
  '#/gate':    ['security'],
  '#/admin':   ['admin'],
  '#/mess':    ['student', 'mess_incharge', 'boys_warden', 'girls_warden', 'admin'],
  '#/notifications': ['student', 'boys_warden', 'girls_warden', 'admin', 'security', 'mess_incharge'],
};

function getHomeRoute(role) {
  const map = {
    student:      '#/student/dashboard',
    boys_warden:  '#/warden/dashboard',
    girls_warden: '#/warden/dashboard',
    security:     '#/gate/dashboard',
    admin:        '#/admin/dashboard',
    mess_incharge: '#/mess/stock',
  };
  return map[role] || '#/login';
}

function checkAccess(hash, user) {
  if (['#/splash', '#/login', '#/register'].includes(hash)) return true;
  if (!user) return false;

  for (const [prefix, roles] of Object.entries(roleAccess)) {
    if (hash.startsWith(prefix)) {
      if (prefix === '#/mess') {
        if (!roles.includes(user.role)) return false;
        if (user.role === 'student') return user.isMessMember === true;
        return true;
      }
      return roles.includes(user.role);
    }
  }
  return false;
}

export async function handleRoute() {
  const hash = getHash();
  let user = getCurrentUser();

  const authPages = ['#/splash', '#/login', '#/register', '#/', ''];
  if (lastHash && lastHash !== hash && !authPages.includes(lastHash) && !window.__skipNavStack) {
    navStack.push(lastHash);
    if (navStack.length > MAX_STACK) navStack.shift();
  }
  window.__skipNavStack = false;
  lastHash = hash;

  if (hash.startsWith('#/mess') && user?.role === 'student') {
    const updated = await refreshProfile();
    if (updated) user = getCurrentUser();
  }

  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  if (['#/splash', '#/login', '#/', ''].includes(hash) && user) {
    navigate(getHomeRoute(user.role));
    return;
  }

  if (!checkAccess(hash, user)) {
    navigate(user ? getHomeRoute(user.role) : '#/login');
    return;
  }

  const match = matchRoute(hash);
  if (match) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const result = match.handler(app, match.params);
    const cleanup = result instanceof Promise ? await result : result;
    if (typeof cleanup === 'function') currentCleanup = cleanup;
  } else {
    navigate(user ? getHomeRoute(user.role) : '#/splash');
  }
}

export function initRouter() {
  window.__router = { goBack, navigate };
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
