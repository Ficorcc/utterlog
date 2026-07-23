
import { useState, useEffect } from 'react';
import { Bell, MessageSquare, ChevronRight } from 'lucide-react';
import { Link } from '@/lib/router';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { formatWithAdminTimeZone } from '@/lib/timezone';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingComments, setPendingComments] = useState(0);

  useEffect(() => {
    // Header counts do not gate the page. Delay the first poll so the active
    // route's data request wins on high-latency CDN-to-origin connections.
    const fetchWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchUnread();
    };
    const initialTimer = window.setTimeout(fetchWhenVisible, 800);
    const interval = window.setInterval(fetchWhenVisible, 60000);
    // 实时事件总线 —— 评论页 / 通知页操作完成后调
    // window.dispatchEvent(new Event('admin:notifications-changed'))，
    // 铃铛立刻重拉一次。之前要等下一轮 60s 轮询，红点不消失体验差。
    const onChanged = () => void fetchUnread();
    window.addEventListener('admin:notifications-changed', onChanged);
    document.addEventListener('visibilitychange', fetchWhenVisible);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener('admin:notifications-changed', onChanged);
      document.removeEventListener('visibilitychange', fetchWhenVisible);
    };
  }, []);

  const fetchUnread = async () => {
    if (!useAuthStore.getState().accessToken) return;
    const result: any = await api.get('/admin/header-counts').catch(() => null);
    if (!result) return;
    setUnread(Number(result.data?.unread || 0));
    setPendingComments(Number(result.data?.pending_comments || 0));
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const r: any = await api.get('/notifications?page=1&per_page=10');
      setNotifications(r.data || []);
    } catch {}
    setLoading(false);
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnread(0);
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
      // 同步重拉 pendingComments —— 万一这次刚好审批了评论让数据
      // 跟服务器端短暂不一致，再 fetch 一次保证准确
      window.dispatchEvent(new Event('admin:notifications-changed'));
    } catch {}
  };

  const handleOpen = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const num = typeof ts === 'number' ? ts : parseInt(ts);
    const d = new Date(num * 1000);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return t('admin.time.justNow', '刚刚');
    if (diff < 3600) return t('admin.time.minutesAgo', '{count} 分钟前', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('admin.time.hoursAgo', '{count} 小时前', { count: Math.floor(diff / 3600) });
    return formatWithAdminTimeZone(d, locale || 'zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={handleOpen} className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        <Bell className="size-4.5" />
        {(unread + pendingComments) > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-semibold text-destructive-foreground">
            {(unread + pendingComments) > 99 ? '99+' : unread + pendingComments}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            className="mt-2 flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
            style={{
              position: 'absolute', right: 0, top: '100%',
              width: '340px', maxHeight: '400px', zIndex: 41,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border py-3 px-4">
              <span className="text-sm font-semibold">{t('admin.notification.title', '通知')}</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="cursor-pointer bg-transparent text-xs text-primary">
                  {t('admin.notification.markAllRead', '全部已读')}
                </button>
              )}
            </div>

            {/* Pending comments alert */}
            {pendingComments > 0 && (
              <Link
                to="/comments/pending"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/15 py-2.5 px-4 text-xs-plus text-amber-700 no-underline dark:text-amber-400"
              >
                <MessageSquare className="size-3.5" />
                <span>{t('admin.notification.pendingComments', '{count} 条评论等待审核', { count: pendingComments })}</span>
                <ChevronRight className="ml-auto size-2.5 opacity-50" />
              </Link>
            )}

            {/* List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {loading ? (
                <div className="p-6 text-center text-xs-plus text-muted-foreground">{t('common.loading', '加载中…')}</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs-plus text-muted-foreground">{t('admin.notification.empty', '暂无通知')}</div>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={i}
                    className={cn('cursor-pointer border-b border-border py-2.5 px-4', n.is_read ? 'bg-transparent' : 'bg-muted')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <p className="text-xs-plus" style={{ fontWeight: n.is_read ? 400 : 600, flex: 1 }}>
                        {typeof n.title === 'string' ? n.title : String(n.title || '')}
                      </p>
                      <span className="ml-2 shrink-0 text-2xs text-muted-foreground">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    {n.content && <p className="mt-0.5 text-xs text-muted-foreground" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof n.content === 'string' ? n.content : ''}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
