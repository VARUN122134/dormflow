/* ========================================
   Supabase Realtime — Notification Listener
   Replaces Firebase Cloud Messaging entirely
   ======================================== */

import { supabase } from './supabase.js';

const listeners = new Map();

export function subscribeToNotifications(userId, onNewNotification) {
  if (!userId || listeners.has(userId)) return;

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
      const notif = payload.new;
      if (onNewNotification) {
        onNewNotification({
          id: notif.id,
          userId: notif.user_id,
          title: notif.title,
          body: notif.body,
          type: notif.type,
          referenceType: notif.reference_type,
          referenceId: notif.reference_id,
          isRead: notif.is_read,
          createdAt: notif.created_at,
        });
      }
      // Refresh badge
      import('./helpers.js').then(h => h.refreshNotifBadge());
      }
    )
    .subscribe();

  listeners.set(userId, channel);
  console.log('[Realtime] Subscribed to notifications for', userId);
}

export function unsubscribeFromNotifications(userId) {
  const channel = listeners.get(userId);
  if (channel) {
    supabase.removeChannel(channel);
    listeners.delete(userId);
    console.log('[Realtime] Unsubscribed from notifications for', userId);
  }
}

export function cleanupAll() {
  listeners.forEach((channel) => supabase.removeChannel(channel));
  listeners.clear();
}
