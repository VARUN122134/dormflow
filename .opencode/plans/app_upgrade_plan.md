# UCE IT App Upgrade Plan

## Overview

Rebrand DormFlow → **UCE IT** and add three major features:
1. **Mess / Menu Section** — daily menu with food ratings by students
2. **Announcements** — news, events posted by admin/warden
3. **Polls & Voting** — polls created by admin/warden, voted on by students

---

## Phase 1: Rebrand (DormFlow → UCE IT)

### Files to update

| File | Changes |
|------|---------|
| `index.html` | Meta description, title → "UCE IT — Hostel Management" |
| `src/main.js` | Console logs |
| `src/router.js` | Comment header |
| `src/supabase.js` | Comment header |
| `src/store.js` | QR prefix: `DORMFLOW|` → `UCEIT|` (keep backward compat) |
| `src/qr.js` | Parse both `DORMFLOW|` and `UCEIT|` prefixes |
| `src/helpers.js` | Comment headers |
| `src/styles/tokens.css` | Comment header |
| `src/styles/global.css` | Comment header |
| `src/styles/components.css` | Comment header |
| `src/styles/pages.css` | Comment header |
| `src/pages/splash.js` | Subtitle text |
| `src/pages/register.js` | Footer text |
| `src/pages/student/dashboard.js` | Brand name |
| `src/pages/student/leave-history.js` | Page header |
| `src/pages/student/profile.js` | Page header, about text, signout text |
| `src/pages/warden/dashboard.js` | Brand name |
| `src/pages/warden/profile.js` | Page header, about text |
| `src/pages/gate/dashboard.js` | Brand title, QR startsWith check |
| `src/pages/gate/sub-pages.js` | Footer text |
| `src/pages/admin/dashboard.js` | Page header |
| `src/pages/admin/sub-pages.js` | Page header, about text |
| `android/app/build.gradle` | applicationId + namespace → `com.uceit.app` |
| `android/app/src/main/res/values/strings.xml` | app_name → "UCE IT" |
| `android/app/src/main/java/com/dormflow/app/MainActivity.java` | package rename |
| `android/app/src/main/AndroidManifest.xml` | package attribute |
| `capacitor.config.json` | appName → "UCE IT" |
| `docs/index.html` | Rebrand the landing page |
| SQL files | Comment headers |
| `DormFlow_Report.csv` | Project name update |

### QR Prefix Backward Compatibility

In `src/store.js`:
```js
// When generating QR:
const qrData = `UCEIT|${passId}|${leave.studentId}|${leaveId}|${leave.outDate}|${leave.inDate}`;

// When scanning - accept both old and new format:
if (parts.length < 6 || (parts[0] !== 'UCEIT' && parts[0] !== 'DORMFLOW')) {
  return { success: false, message: 'Invalid QR code format' };
}
```

In `src/qr.js`:
```js
export function parseQRData(rawString) {
  const parts = rawString.split('|');
  if (parts.length < 6 || (parts[0] !== 'UCEIT' && parts[0] !== 'DORMFLOW')) return null;
  ...
}
```

---

## Phase 2: Database Schema

### New file: `dormflow_migration_v3.sql`

#### Profiles table changes:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_mess_member BOOLEAN DEFAULT false;
```

#### New tables:

**mess_menu** — Daily menu entries
```sql
CREATE TABLE public.mess_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('morning_tea', 'breakfast', 'lunch', 'snacks', 'dinner')),
  items TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_mess_menu_date ON public.mess_menu(menu_date);
CREATE UNIQUE INDEX idx_mess_menu_date_meal ON public.mess_menu(menu_date, meal_type);
```

**mess_ratings** — Student food ratings
```sql
CREATE TABLE public.mess_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES public.mess_menu(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_id, student_id)
);
```

**announcements** — News and events
```sql
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'event', 'news')),
  event_date DATE
);
CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);
```

**polls** — Polls
```sql
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

**poll_options** — Options within a poll
```sql
CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL
);
```

**poll_votes** — Student votes
```sql
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, student_id)
);
```

#### RLS Policies

**mess_menu:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: mess_members + admin

**mess_ratings:**
- SELECT: authenticated users
- INSERT: own student_id (with unique constraint)
- UPDATE: own rating only

**announcements:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admin + wardens

**polls + poll_options:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admin + wardens

**poll_votes:**
- SELECT: authenticated users
- INSERT: own student_id (one vote per poll)
- No UPDATE/DELETE for students

---

## Phase 3: Code Changes

### `src/store.js` — New functions

**Mess operations:**
```js
getMenuByDate(date)           // Get menu entries for a specific date (all meal types)
getMenuByDateRange(start, end) // Menu for a date range
createMenuEntry(data)          // Add menu entry (mess_member/admin)
updateMenuEntry(id, data)      // Edit menu entry
deleteMenuEntry(id)            // Delete menu entry
getRatings(menuId)             // Get all ratings for a menu item
getMyRating(menuId, studentId) // Student's own rating
submitRating(menuId, studentId, rating, review) // Rate food
getMenuWithStats(date)         // Menu + average rating + count per meal type
```

**Announcement operations:**
```js
getAnnouncements()             // All announcements, newest first
getAnnouncementById(id)
createAnnouncement(data)       // Admin/warden
deleteAnnouncement(id)         // Admin/warden
```

**Poll operations:**
```js
getPolls()                     // Active polls with options
getPollById(id)                // Single poll with options
createPoll(data)               // poll {title, description, options[], expires_at} — admin/warden
vote(pollId, optionId, studentId)
getPollResults(pollId)         // Vote counts per option
hasVoted(pollId, studentId)    // Boolean check
deletePoll(id)                 // Admin only
```

**User operations additions:**
```js
toggleMessMember(userId, isMember) // Admin: promotes/demotes mess member
getMessMembers()               // Get all users with is_mess_member = true
```

### `src/auth.js`

Add:
```js
export function isMessMember() {
  return _currentProfile?.isMessMember === true;
}
```

Update `getHomeRoute()`:
```js
export function getHomeRoute(role) {
  if (role === 'admin') return '#/admin/dashboard';
  if (role === 'security') return '#/gate/dashboard';
  if (role === 'boys_warden' || role === 'girls_warden') return '#/warden/dashboard';
  return '#/student/dashboard';
}
```
(No change needed — mess members still land on student dashboard by default)

### `src/router.js`

Update `checkAccess()` to allow mess members to access mess routes:
```js
// New role access entry:
const roleAccess = {
  'student': ['student'],
  'mess': ['student'],   // will check isMessMember at runtime
  'warden': ['boys_warden', 'girls_warden'],
  'gate': ['security'],
  'admin': ['admin'],
};
```

Modify checkAccess:
```js
checkAccess(hash, user) {
  const routeParts = hash.split('/');
  const base = routeParts[1];
  const allowedRoles = this.roleAccess[base];
  
  if (base === 'mess') {
    // Mess routes require student role + is_mess_member flag
    return allowedRoles && allowedRoles.includes(user.role) && user.isMessMember;
  }
  
  return allowedRoles && allowedRoles.includes(user.role);
}
```

### `src/helpers.js`

**Update studentNav()** — add Mess and Announcements tabs:
```js
export function studentNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/student/dashboard' },
    { id: 'mess', icon: 'restaurant_menu', label: 'Mess', route: '#/student/mess' },
    { id: 'announcements', icon: 'campaign', label: 'Updates', route: '#/student/announcements' },
    { id: 'profile', icon: 'person', label: 'Profile', route: '#/student/profile' },
  ]);
}
```

**Add messMemberNav():**
```js
export function messMemberNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/mess/dashboard' },
    { id: 'menu', icon: 'edit_note', label: 'Manage Menu', route: '#/mess/manage-menu' },
    { id: 'ratings', icon: 'star_half', label: 'Ratings', route: '#/mess/ratings' },
  ]);
}
```

**Add wardenNav() update** — add Announcements tab:
```js
export function wardenNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/warden/dashboard' },
    { id: 'leaves', icon: 'event_available', label: 'Leaves', route: '#/warden/requests' },
    { id: 'announcements', icon: 'campaign', label: 'Announce', route: '#/warden/announcements' },
    { id: 'profile', icon: 'person', label: 'Profile', route: '#/warden/profile' },
  ]);
}
```

**Add adminNav() update** — add Mess, Announcements, Polls tabs:
```js
export function adminNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/admin/dashboard' },
    { id: 'users', icon: 'group', label: 'Users', route: '#/admin/users' },
    { id: 'mess', icon: 'restaurant_menu', label: 'Mess', route: '#/admin/mess' },
    { id: 'manage', icon: 'manage_accounts', label: 'Manage', route: '#/admin/manage' },
  ]);
}
```

**Add star rating display helper:**
```js
export function renderStars(rating) {
  const full = '\\u2605'; // filled star
  const empty = '\\u2606'; // empty star
  let html = '<span class="star-rating">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= rating ? 'star-filled' : 'star-empty'}">${i <= rating ? full : empty}</span>`;
  }
  html += '</span>';
  return html;
}
```

**Add renderPageHeader() alias for simpler usage** — no change needed.

### `src/main.js` — New routes

Add imports:
```js
import studentMessPage from './pages/student/mess.js';
import studentAnnouncementsPage from './pages/student/announcements.js';
import studentPollsPage from './pages/student/polls.js';

import messDashboard from './pages/mess/dashboard.js';
import messManageMenu from './pages/mess/manage-menu.js';
import messRatings from './pages/mess/ratings.js';

import wardenAnnouncements from './pages/warden/announcements.js';

import adminMess from './pages/admin/mess.js';
import adminManage from './pages/admin/manage.js';
```

Register routes:
```js
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
```

---

## Phase 4: New Pages

### `src/pages/student/mess.js`

**Route:** `#/student/mess`

**Layout:**
- Page header: "Today's Mess Menu"
- Meal type tabs/chips: Morning Tea | Breakfast | Lunch | Snacks | Dinner
- For each selected meal type:
  - Menu card showing food items
  - Star rating component (1-5)
  - Review text area
  - Submit rating button
  - Public reviews section (shows other students' ratings)
- Bottom nav

**Logic:**
- On load, fetch today's menu via `getMenuByDate(today)`
- Switch between meal types via click handlers
- On rating submit: `submitRating(menuId, studentId, rating, review)`
- After submit: refresh to show updated public reviews
- Display average rating per meal

### `src/pages/student/announcements.js`

**Route:** `#/student/announcements`

**Layout:**
- Page header: "Announcements"
- Filter tabs: All | Announcements | Events | News
- Card list of announcements (avatar + title + date + short content)
- Tap card → expand or show full content
- Polls section (active polls with vote buttons)
- Bottom nav

**Logic:**
- Fetch announcements via `getAnnouncements()`
- Filter by type via tab click
- Each card: author avatar, title, date, type chip, truncated content
- "Read more" expand on click
- Polls at the bottom: show title, options (radio buttons), vote button
- After voting: show results (bar chart style with percentages)

### `src/pages/student/polls.js`

**Route:** `#/student/polls`

**Layout:**
- Page header: "Polls & Voting"
- Active polls list
- Each poll card:
  - Title + description
  - Options with radio buttons
  - Vote button (disabled if already voted)
  - Results display (bar/percentage) after voting
- Expired polls (results only, no voting)
- Bottom nav

### `src/pages/mess/dashboard.js`

**Route:** `#/mess/dashboard`

**Layout:**
- Page header: "Mess Dashboard"
- Today's menu summary (all meal types listed)
- Recent ratings (latest 5-10 with student names and star ratings)
- Average rating per meal type
- Quick actions: "Add Today's Menu" → links to manage-menu
- Bottom nav (messMemberNav)

### `src/pages/mess/manage-menu.js`

**Route:** `#/mess/manage-menu`

**Layout:**
- Page header: "Manage Menu"
- Date picker
- Meal type tabs
- Form for each meal type:
  - Items input (text, comma-separated or multi-line)
  - Save button
- List of existing menu entries for selected date
  - Edit button → populate form
  - Delete button → confirm modal
- Bottom nav

### `src/pages/mess/ratings.js`

**Route:** `#/mess/ratings`

**Layout:**
- Page header: "Food Ratings"
- Date picker or "Today" default
- Meal type tabs
- Rating summary (average, total reviews)
- List of individual reviews with:
  - Student name + avatar
  - Star rating
  - Review text
  - Time
- Bottom nav

### `src/pages/warden/announcements.js`

**Route:** `#/warden/announcements`

**Layout:**
- Page header: "Manage Announcements"
- "New Announcement" button → modal/form
- List of existing announcements with edit/delete
- "New Poll" button → modal/form with options input
- List of existing polls with results view + close/delete
- Bottom nav

**Form fields for announcement:**
- Title, Content, Type (announcement/event/news), Event date (if event)

**Form fields for poll:**
- Title, Description, Options (dynamic add/remove), Expiry date

### `src/pages/admin/mess.js`

**Route:** `#/admin/mess`

**Layout:**
- Page header: "Mess Management"
- Tab: "Manage Menu" (same as mess member but for admin)
- Tab: "Mess Members" — list users, toggle is_mess_member on/off
- Each user card shows: name, role, hostel, toggle switch for mess member
- Bottom nav

### `src/pages/admin/manage.js`

**Route:** `#/admin/manage`

**Layout:**
- Page header: "Manage"
- Tabs: Announcements | Polls
- Same functionality as warden announcements page
- Bottom nav

---

## Phase 5: Styles

Add to `src/styles/pages.css` (~250 lines):

```css
/* ─── Mess / Menu Styles ─── */
.menu-card { }
.menu-meal-type { }
.menu-items-list { }
.menu-item-chip { }
.star-rating { }
.star { }
.star-filled { color: #f59e0b; }
.star-empty { color: #475569; }
.rating-input-area { }
.review-card { }

/* ─── Announcement Styles ─── */
.announcement-card { }
.announcement-type-chip { }
.announcement-expanded { }

/* ─── Poll Styles ─── */
.poll-card { }
.poll-option { }
.poll-option-bar { }
.poll-option-voted { }
.poll-results { }
.poll-vote-btn { }
```

---

## Phase 6: Implementation Order

| Step | Task | Files |
|:----:|------|-------|
| 1 | Rebrand all files | 25+ files |
| 2 | Create SQL migration | `dormflow_migration_v3.sql` |
| 3 | Update store.js | Add mess/announcement/poll functions |
| 4 | Update auth.js + router.js | Add mess_member support |
| 5 | Update helpers.js | Navs + star helper |
| 6 | Register routes in main.js | 10 new routes |
| 7 | Create student mess page | `src/pages/student/mess.js` |
| 8 | Create student announcements page | `src/pages/student/announcements.js` |
| 9 | Create student polls page | `src/pages/student/polls.js` |
| 10 | Create mess member pages | 3 files |
| 11 | Create warden announcements page | `src/pages/warden/announcements.js` |
| 12 | Create admin pages | `src/pages/admin/mess.js` + `manage.js` |
| 13 | Add CSS styles | `src/styles/pages.css` |
| 14 | Verify build | `npm run build` |

---

## Phase 7: Files Summary

### New files (9+)
| File | Purpose |
|------|---------|
| `dormflow_migration_v3.sql` | Database migration |
| `src/pages/student/mess.js` | Student mess menu view |
| `src/pages/student/announcements.js` | Student announcements view |
| `src/pages/student/polls.js` | Student polls view |
| `src/pages/mess/dashboard.js` | Mess member dashboard |
| `src/pages/mess/manage-menu.js` | Mess member menu CRUD |
| `src/pages/mess/ratings.js` | Mess member ratings view |
| `src/pages/warden/announcements.js` | Warden announcement CRUD |
| `src/pages/admin/mess.js` | Admin mess management |
| `src/pages/admin/manage.js` | Admin announcement + poll CRUD |

### Modified files (10+)
| File | Changes |
|------|---------|
| `index.html` | Title, meta |
| `src/main.js` | Imports + routes |
| `src/router.js` | Mess route access |
| `src/auth.js` | isMessMember() |
| `src/store.js` | ~150 lines of new functions |
| `src/helpers.js` | Navs + star helper |
| `src/qr.js` | Dual prefix support |
| `src/styles/pages.css` | ~250 new lines |
| Various pages | Rebrand |
| `android/*` | App name/pkg |
| `capacitor.config.json` | App name |

---

## Questions

1. When a student rates food, should the rating/review be **anonymous** (no name shown) or show the student's name publicly?
2. For polls, should there be a minimum number of options? (e.g. at least 2)
