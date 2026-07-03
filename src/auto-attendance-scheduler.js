import { supabase } from './supabase.js';
import { getUsers, saveAttendanceSnapshot } from './store.js';

let intervalId = null;
let todaySaved = false;
let monthlySaved = false;

export function startAutoAttendanceScheduler(user) {
  if (!user) return;
  if (user.role !== 'boys_warden' && user.role !== 'girls_warden' && user.role !== 'admin') return;
  if (intervalId) return;

  const types = ['Boys', 'Girls'];

  intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const dateStr = now.toISOString().slice(0, 10);
      const isPast820 = hours > 20 || (hours === 20 && minutes >= 20);

      if (!isPast820) return;

      for (const ht of types) {
        if (!todaySaved) {
          const fileName = `${ht.toLowerCase()}_hostel_attendance_${dateStr}.csv`;
          const { data: existing } = await supabase.storage.from('attendance-snapshots').list('', { search: fileName });
          if (!existing || existing.length === 0) {
            const all = await getUsers();
            const students = all.filter(s => s.role === 'student' && s.hostelType === ht && s.isApproved);
            if (students.length > 0) {
              await saveAttendanceSnapshot(ht, students);
            }
          }
        }
      }
      todaySaved = true;

      if (!monthlySaved) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        if (now.getDate() === lastDay) {
          for (const ht of types) {
            const prefix = `${ht.toLowerCase()}_hostel_attendance_${year}-${month}-`;
            const { data: files } = await supabase.storage.from('attendance-snapshots').list('');
            const monthFiles = (files || []).filter(f => f.name.startsWith(prefix)).sort();
            if (monthFiles.length > 0) {
              let combined = `Date,Department,Year,Name,Register Number,Room,Status\n`;
              for (const f of monthFiles) {
                const dayStr = f.name.replace(/.+_(\d{4}-\d{2}-\d{2})\.csv$/, '$1');
                const { data: csvData } = await supabase.storage.from('attendance-snapshots').download(f.name);
                if (csvData) {
                  const text = await csvData.text();
                  const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('Department,Year,Name'));
                  lines.forEach(line => {
                    combined += `${dayStr},${line}\n`;
                  });
                }
              }
              const monthlyName = `${ht.toLowerCase()}_hostel_attendance_${year}-${month}-monthly.csv`;
              const blob = new Blob([combined], { type: 'text/csv;charset=utf-8;' });
              const file = new File([blob], monthlyName, { type: 'text/csv' });
              await supabase.storage.from('attendance-snapshots').upload(monthlyName, file, { upsert: true });
            }
          }
        }
        monthlySaved = true;
      }
    } catch (e) {
      console.error('Auto-attendance scheduler error:', e);
    }
  }, 60000);
}

export function stopAutoAttendanceScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  todaySaved = false;
  monthlySaved = false;
}
