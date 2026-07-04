import { supabase } from './supabase.js';
import { getUsers, saveAttendanceSnapshot, getDailyBill, calculateDailyBill, getDailyUsage } from './store.js';

let intervalId = null;
let todaySaved = false;
let monthlySaved = false;
let billCalculated = false;
let lastDateStr = '';

export function startAutoAttendanceScheduler(user) {
  if (!user) return;
  if (user.role !== 'boys_warden' && user.role !== 'girls_warden' && user.role !== 'admin' && user.role !== 'mess_incharge') return;
  if (intervalId) return;

  const types = ['Boys', 'Girls'];
  lastDateStr = new Date().toISOString().slice(0, 10);

  intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const dateStr = now.toISOString().slice(0, 10);
      const isPast820 = hours > 20 || (hours === 20 && minutes >= 20);
      const isPast2100 = hours > 21 || (hours === 21 && minutes >= 0);

      // Reset flags when date changes (past midnight)
      if (dateStr !== lastDateStr) {
        todaySaved = false;
        monthlySaved = false;
        billCalculated = false;
        lastDateStr = dateStr;
      }

      if (!isPast820 && !isPast2100) return;

      if (isPast820 && !todaySaved) {
        const all = await getUsers();
        for (const ht of types) {
          const fileName = `${ht.toLowerCase()}_hostel_attendance_${dateStr}.csv`;
          const { data: existing } = await supabase.storage.from('attendance-snapshots').list('', { search: fileName });
          const students = all.filter(s => s.role === 'student' && s.hostelType === ht && s.isApproved);
          if (students.length > 0) {
            if (!existing || existing.length === 0) {
              await saveAttendanceSnapshot(ht, students);
            }
            // Mark all students as present for dinner (last meal of the day)
            const attendanceRecords = students.map(s => ({
              student_id: s.id,
              meal_type: 'dinner',
              attendance_date: dateStr,
              verified_by: user.id,
            }));
            const { error: attErr } = await supabase
              .from('mess_attendance')
              .upsert(attendanceRecords, { onConflict: 'student_id,attendance_date,meal_type', ignoreDuplicates: true });
            if (attErr) console.error('Auto attendance insert error:', attErr);
          }
        }
        todaySaved = true;
      }

      if (isPast2100 && !billCalculated) {
        const existingBill = await getDailyBill(dateStr);
        if (!existingBill) {
          const usage = await getDailyUsage(dateStr);
          if (usage && usage.items && usage.items.length > 0) {
            try {
              await calculateDailyBill(dateStr, user.id);
            } catch (e) {
              console.error('Auto bill calculation error:', e);
            }
          }
        }
        billCalculated = true;
      }

      if (!monthlySaved && todaySaved) {
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
          monthlySaved = true;
        }
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
  billCalculated = false;
  lastDateStr = '';
}
