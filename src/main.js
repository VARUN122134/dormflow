import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/material-icons-outlined';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { loadCurrentUser } from './auth.js';
import { registerRoute, initRouter } from './router.js';

import splashPage from './pages/splash.js';
import loginPage from './pages/login.js';
import registerPage from './pages/register.js';
import resetPasswordPage from './pages/reset-password.js';

import studentDashboard from './pages/student/dashboard.js';
import applyLeavePage from './pages/student/apply-leave.js';
import leaveHistoryPage from './pages/student/leave-history.js';
import profilePage from './pages/student/profile.js';
import outpassPage from './pages/student/outpass.js';

import caretakerDashboard from './pages/caretaker/dashboard.js';
import caretakerRequests from './pages/caretaker/requests.js';
import caretakerResidents from './pages/caretaker/residents.js';
import caretakerProfile from './pages/caretaker/profile.js';

import gateDashboard from './pages/gate/dashboard.js';
import { gateHistory, gateInHouse, gateSystem } from './pages/gate/sub-pages.js';

import adminDashboard from './pages/admin/dashboard.js';
import userManagement from './pages/admin/users.js';
import { adminLeaves, adminProfile } from './pages/admin/sub-pages.js';
import { adminAuditLogs } from './pages/admin/audit-logs.js';
import { adminConfiguration } from './pages/admin/configuration.js';
import { adminSettings } from './pages/admin/settings.js';

// New feature pages
import studentMessPage from './pages/student/mess.js';
import studentAnnouncementsPage from './pages/student/announcements.js';
import studentPollsPage from './pages/student/polls.js';
import studentComplaintsPage from './pages/student/complaints.js';

import messDashboard from './pages/mess/dashboard.js';
import messManageMenu from './pages/mess/manage-menu.js';
import messRatings from './pages/mess/ratings.js';
import messProfile from './pages/mess/profile.js';

import caretakerAnnouncements from './pages/caretaker/announcements.js';
import caretakerAttendance from './pages/caretaker/attendance.js';
import caretakerAutoAttendance from './pages/caretaker/auto-attendance.js';
import { startAutoAttendanceScheduler, stopAutoAttendanceScheduler } from './auto-attendance-scheduler.js';

import adminMess from './pages/admin/mess.js';
import adminManage from './pages/admin/manage.js';
import adminComplaints from './pages/admin/complaints.js';

async function boot() {
  const user = await loadCurrentUser();
  if (user) {
    document.addEventListener('routechange', () => {
      const hash = location.hash;
      if (hash.startsWith('#/caretaker') || hash.startsWith('#/admin') || hash.startsWith('#/mess')) {
        startAutoAttendanceScheduler(user);
      } else {
        stopAutoAttendanceScheduler();
      }
    });
    if (location.hash.startsWith('#/caretaker') || location.hash.startsWith('#/admin') || location.hash.startsWith('#/mess')) {
      startAutoAttendanceScheduler(user);
    }
  }
  initRouter();
}
boot();

registerRoute('#/splash', splashPage);
registerRoute('#/login', loginPage);
registerRoute('#/register', registerPage);
registerRoute('#/reset-password', resetPasswordPage);

registerRoute('#/student/dashboard', studentDashboard);
registerRoute('#/student/apply', applyLeavePage);
registerRoute('#/student/history', leaveHistoryPage);
registerRoute('#/student/profile', profilePage);
registerRoute('#/student/outpass', outpassPage);

registerRoute('#/caretaker/dashboard', caretakerDashboard);
registerRoute('#/caretaker/requests', caretakerRequests);
registerRoute('#/caretaker/residents', caretakerResidents);
registerRoute('#/caretaker/profile', caretakerProfile);

registerRoute('#/gate/dashboard', gateDashboard);
registerRoute('#/gate/history', gateHistory);
registerRoute('#/gate/inhouse', gateInHouse);
registerRoute('#/gate/system', gateSystem);

registerRoute('#/admin/dashboard', adminDashboard);
registerRoute('#/admin/users', userManagement);
registerRoute('#/admin/leaves', adminLeaves);
registerRoute('#/admin/profile', adminProfile);
registerRoute('#/admin/audit', adminAuditLogs);
registerRoute('#/admin/configuration', adminConfiguration);
registerRoute('#/admin/settings', adminSettings);

// Student new routes
registerRoute('#/student/mess', studentMessPage);
registerRoute('#/student/announcements', studentAnnouncementsPage);
registerRoute('#/student/polls', studentPollsPage);
registerRoute('#/student/complaints', studentComplaintsPage);

// Mess member routes
registerRoute('#/mess/dashboard', messDashboard);
registerRoute('#/mess/manage-menu', messManageMenu);
registerRoute('#/mess/ratings', messRatings);
registerRoute('#/mess/profile', messProfile);

// Caretaker new routes
registerRoute('#/caretaker/announcements', caretakerAnnouncements);
registerRoute('#/caretaker/attendance', caretakerAttendance);
registerRoute('#/caretaker/auto-attendance', caretakerAutoAttendance);

// Admin new routes
registerRoute('#/admin/mess', adminMess);
registerRoute('#/admin/manage', adminManage);
registerRoute('#/admin/complaints', adminComplaints);

const defaultStyle = document.querySelector('link[href="/src/style.css"]');
if (defaultStyle) defaultStyle.remove();

console.log('%cUCE IT v3.0.9', 'color:#1a56db;font-size:16px;font-weight:bold;');
console.log('%cHostel Management · Mess · Announcements · Powered by Supabase', 'color:#555;font-size:12px;');
