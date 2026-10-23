import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  unreadAnnouncementsCount: 0,
  pendingLeavesCount: 0,
  isLeaveResolvedNotification: false,
  markAnnouncementsAsRead: () => { },
  markLeavesAsSeen: () => { },
  refreshNotifications: () => { }
});

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [isLeaveResolvedNotification, setIsLeaveResolvedNotification] = useState(false);
  const [latestAnnouncementIds, setLatestAnnouncementIds] = useState([]);
  const [latestResolvedLeaveIds, setLatestResolvedLeaveIds] = useState([]);

  // Fetch notifications
  const fetchNotificationCounts = useCallback(async () => {
    if (!user || !user.id) {
      setUnreadAnnouncementsCount(0);
      setPendingLeavesCount(0);
      setIsLeaveResolvedNotification(false);
      return;
    }

    try {
      // 1. Fetch leave notifications
      const leaveRes = await apiClient.get('/leaves/pending-count').catch(() => ({ pendingCount: 0, resolvedIds: [] }));

      if (user.role === 'DEPARTMENT_ADMIN' || user.role === 'SUPER_ADMIN') {
        // Approvers get notified about pending requests awaiting their approval
        setPendingLeavesCount(leaveRes?.pendingCount || 0);
        setIsLeaveResolvedNotification(false);
      } else if (user.role === 'STUDENT' || user.role === 'TEACHER') {
        // Requesters do NOT get notified on apply; they only get notified when decision is APPROVED or REJECTED
        const storageKey = `nexus_seen_resolved_leaves_${user.id}`;
        const storedSeen = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const resolvedIds = leaveRes?.resolvedIds || [];
        setLatestResolvedLeaveIds(resolvedIds);

        const unseen = resolvedIds.filter((id) => !storedSeen.includes(id));
        setPendingLeavesCount(unseen.length);
        setIsLeaveResolvedNotification(true);
      } else {
        setPendingLeavesCount(0);
        setIsLeaveResolvedNotification(false);
      }

      // 2. Fetch announcements for unread tracking
      const announcements = await apiClient.get('/announcements').catch(() => []);
      if (Array.isArray(announcements)) {
        // Students and parents cannot send announcements; they only receive notices.
        // For authors (SuperAdmin, DeptAdmin, Teacher), exclude notices they authored themselves.
        const incomingAnnouncements = announcements.filter((a) => {
          if (user.role === 'SUPER_ADMIN' && a.createdBySuperAdminId === user.id) return false;
          if (user.role === 'DEPARTMENT_ADMIN' && a.createdByDeptAdminId === user.id) return false;
          if (user.role === 'TEACHER' && a.createdByTeacherId === user.id) return false;
          return true;
        });

        const currentIds = incomingAnnouncements.map((a) => a.id);
        setLatestAnnouncementIds(currentIds);

        const storageKey = `nexus_read_announcements_${user.id}`;
        const storedRead = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // Count incoming announcements not in storedRead
        const unread = currentIds.filter((id) => !storedRead.includes(id));
        setUnreadAnnouncementsCount(unread.length);
      }
    } catch (err) {
      console.warn('Error fetching notification counts:', err);
    }
  }, [user]);

  // Mark all announcements as read
  const markAnnouncementsAsRead = useCallback((idsToMark) => {
    if (!user || !user.id) return;

    const storageKey = `nexus_read_announcements_${user.id}`;
    const storedRead = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const ids = idsToMark || latestAnnouncementIds;

    const updated = Array.from(new Set([...storedRead, ...ids]));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setUnreadAnnouncementsCount(0);
  }, [user, latestAnnouncementIds]);

  // Mark resolved leaves as seen by requester
  const markLeavesAsSeen = useCallback((idsToMark) => {
    if (!user || !user.id) return;

    const storageKey = `nexus_seen_resolved_leaves_${user.id}`;
    const storedSeen = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const ids = idsToMark || latestResolvedLeaveIds;

    const updated = Array.from(new Set([...storedSeen, ...ids]));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setPendingLeavesCount(0);
  }, [user, latestResolvedLeaveIds]);

  // Initial load & periodic polling (every 20s)
  useEffect(() => {
    fetchNotificationCounts();

    const interval = setInterval(fetchNotificationCounts, 20000);
    const handleFocus = () => fetchNotificationCounts();
    const handleCustomRefresh = () => fetchNotificationCounts();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('nexus:refresh-notifications', handleCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('nexus:refresh-notifications', handleCustomRefresh);
    };
  }, [fetchNotificationCounts]);

  // Automatically mark announcements as read when user visits the Announcements screen
  useEffect(() => {
    if (location.pathname.includes('/announcements') && latestAnnouncementIds.length > 0) {
      markAnnouncementsAsRead(latestAnnouncementIds);
    }
    // Automatically mark resolved leaves as seen when student/teacher visits leaves screen
    if (location.pathname.includes('/leaves')) {
      if ((user?.role === 'STUDENT' || user?.role === 'TEACHER') && latestResolvedLeaveIds.length > 0) {
        markLeavesAsSeen(latestResolvedLeaveIds);
      }
      fetchNotificationCounts();
    }
  }, [location.pathname, latestAnnouncementIds, latestResolvedLeaveIds, markAnnouncementsAsRead, markLeavesAsSeen, fetchNotificationCounts, user?.role]);

  return (
    <NotificationContext.Provider
      value={{
        unreadAnnouncementsCount,
        pendingLeavesCount,
        isLeaveResolvedNotification,
        markAnnouncementsAsRead,
        markLeavesAsSeen,
        refreshNotifications: fetchNotificationCounts
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
