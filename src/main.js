import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/material-icons-outlined';

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import { loadCurrentUser, getCurrentUser } from './auth.js';
import { registerRoute, initRouter } from './router.js';

import splashPage from './pages/splash.js';
import loginPage from './pages/login.js';
import registerPage from './pages/register.js';

import studentDashboard from './pages/student/dashboard.js';
import applyLeavePage from './pages/student/apply-leave.js';
import leaveHistoryPage from './pages/student/leave-history.js';
import profilePage from './pages/student/profile.js';
import outpassPage from './pages/student/outpass.js';

import wardenDashboard from './pages/warden/dashboard.js';
import wardenRequests from './pages/warden/requests.js';
import wardenResidents from './pages/warden/residents.js';
import wardenProfile from './pages/warden/profile.js';

import gateDashboard from './pages/gate/dashboard.js';
import { gateHistory, gateInHouse, gateSystem } from './pages/gate/sub-pages.js';

import adminDashboard from './pages/admin/dashboard.js';
import userManagement from './pages/admin/users.js';
import { adminLeaves, adminProfile } from './pages/admin/sub-pages.js';

// New feature pages
import studentMessPage from './pages/student/mess.js';
import studentAnnouncementsPage from './pages/student/announcements.js';
import studentPollsPage from './pages/student/polls.js';

import messDashboard from './pages/mess/dashboard.js';
import messManageMenu from './pages/mess/manage-menu.js';
import messRatings from './pages/mess/ratings.js';

import wardenAnnouncements from './pages/warden/announcements.js';

import adminMess from './pages/admin/mess.js';
import adminManage from './pages/admin/manage.js';

// v5 feature pages
import myRoomPage from './pages/student/my-room.js';
import studentComplaintsPage from './pages/student/complaints.js';
import studentAttendancePage from './pages/student/attendance.js';
import studentNotificationsPage from './pages/student/notifications.js';

import wardenRoomsPage from './pages/warden/rooms.js';
import wardenAttendancePage from './pages/warden/attendance.js';
import wardenAutoAttendancePage from './pages/warden/auto-attendance.js';

import adminRoomsPage from './pages/admin/rooms.js';
import adminComplaintsPage from './pages/admin/complaints.js';
import adminNotificationsPage from './pages/admin/notifications.js';

import messAttendancePage from './pages/mess/attendance.js';
import messStockPage from './pages/mess/stock.js';
import messUsagePage from './pages/mess/usage.js';
import messBillPage from './pages/mess/bill.js';
import messWalletsPage from './pages/mess/wallets.js';
import messReportsPage from './pages/mess/reports.js';
import messStockManagerPage from './pages/mess/stock-manager.js';

import studentWalletPage from './pages/student/wallet.js';

import { supabase } from './supabase.js';
import { subscribeToNotifications, unsubscribeFromNotifications } from './realtime.js';
import { showToast, refreshNotifBadge } from './helpers.js';
import { startAutoAttendanceScheduler, stopAutoAttendanceScheduler } from './auto-attendance-scheduler.js';

async function boot() {
  await loadCurrentUser();
  const user = getCurrentUser();
  if (user) {
    subscribeToNotifications(user.id, (notif) => {
      showToast(`${notif.title}: ${notif.body}`, notif.type || 'info');
    });
    refreshNotifBadge();
    if (['boys_warden', 'girls_warden', 'admin', 'mess_incharge'].includes(user.role)) {
      startAutoAttendanceScheduler(user);
    }
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      subscribeToNotifications(session.user.id, (notif) => {
        showToast(`${notif.title}: ${notif.body}`, notif.type || 'info');
      });
      refreshNotifBadge();
    }
    if (event === 'SIGNED_OUT') {
      stopAutoAttendanceScheduler();
      const cur = getCurrentUser();
      if (cur) unsubscribeFromNotifications(cur.id);
      const badge = document.getElementById('notifBadge');
      if (badge) badge.style.display = 'none';
    }
  });
  initRouter();
}
boot();

registerRoute('#/splash', splashPage);
registerRoute('#/login', loginPage);
registerRoute('#/register', registerPage);

registerRoute('#/student/dashboard', studentDashboard);
registerRoute('#/student/apply', applyLeavePage);
registerRoute('#/student/history', leaveHistoryPage);
registerRoute('#/student/profile', profilePage);
registerRoute('#/student/outpass', outpassPage);

registerRoute('#/warden/dashboard', wardenDashboard);
registerRoute('#/warden/requests', wardenRequests);
registerRoute('#/warden/residents', wardenResidents);
registerRoute('#/warden/profile', wardenProfile);

registerRoute('#/gate/dashboard', gateDashboard);
registerRoute('#/gate/history', gateHistory);
registerRoute('#/gate/inhouse', gateInHouse);
registerRoute('#/gate/system', gateSystem);

registerRoute('#/admin/dashboard', adminDashboard);
registerRoute('#/admin/users', userManagement);
registerRoute('#/admin/leaves', adminLeaves);
registerRoute('#/admin/profile', adminProfile);

// Student new routes
registerRoute('#/student/mess', studentMessPage);
registerRoute('#/student/announcements', studentAnnouncementsPage);
registerRoute('#/student/polls', studentPollsPage);

// Mess member routes
registerRoute('#/mess/dashboard', messDashboard);
registerRoute('#/mess/manage-menu', messManageMenu);
registerRoute('#/mess/ratings', messRatings);

// Warden new routes
registerRoute('#/warden/announcements', wardenAnnouncements);

// Admin new routes
registerRoute('#/admin/mess', adminMess);
registerRoute('#/admin/manage', adminManage);

// v5 Room Management
registerRoute('#/student/room', myRoomPage);
registerRoute('#/warden/rooms', wardenRoomsPage);
registerRoute('#/admin/rooms', adminRoomsPage);

// v5 Complaint/Feedback
registerRoute('#/student/complaints', studentComplaintsPage);
registerRoute('#/admin/complaints', adminComplaintsPage);

// Mess Wallet & Stock
registerRoute('#/mess/stock', messStockPage);
registerRoute('#/mess/usage', messUsagePage);
registerRoute('#/mess/bill', messBillPage);
registerRoute('#/mess/wallets', messWalletsPage);
registerRoute('#/mess/reports', messReportsPage);
registerRoute('#/mess/stock-manager', messStockManagerPage);

registerRoute('#/student/wallet', studentWalletPage);

// v5 Attendance
registerRoute('#/student/attendance', studentAttendancePage);
registerRoute('#/warden/attendance', wardenAttendancePage);
registerRoute('#/warden/auto-attendance', wardenAutoAttendancePage);
registerRoute('#/mess/attendance', messAttendancePage);

// v5 Notifications
registerRoute('#/notifications', studentNotificationsPage);
registerRoute('#/admin/send-notifications', adminNotificationsPage);

const defaultStyle = document.querySelector('link[href="/src/style.css"]');
if (defaultStyle) defaultStyle.remove();

console.log('%cUCE IT v5.0.0', 'color:#1a56db;font-size:20px;font-weight:bold;');
console.log('%cHostel Management  ·  Rooms  ·  Complaints  ·  Attendance  ·  Notifications  ·  Powered by Supabase', 'color:#555;font-size:12px;');
console.log('%cUniversity College of Engineering, Ariyalur — IT Department', 'color:#888;font-size:11px;');
