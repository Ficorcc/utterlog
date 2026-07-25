/**
 * 存储设置 tab（media）。
 *
 * 从 Settings.tsx 整段搬过来，JSX 与字段名一字未改 —— register 的字段名
 * 决定保存时 payload 里有没有这个 key，改错一个字用户的设置就会静默丢失。
 *
 * 存储用量、数据库清理、连接测试这些状态和 handler 都还在 Settings.tsx 里
 * （它们跟 fetchSettings / getValues 绑在一起），这里按 props 接进来。
 */

import { Button, Input, Textarea } from '@/components/ui/shadcn';
import {
  HardDrive, Cloud, Brush, Globe, Loader2, Plug, User, Zap, Images,
  BookOpen, Film, Music, Image as ImageIcon, Link as LinkIcon,
} from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Panel, SELECT_CLS } from './shared';

export type StorageStats = {
  files: number;
  size: number;
  drivers?: Record<string, { files: number; size: number }>;
  disk?: { total: number; used: number; free: number; percent: number; path?: string };
};

export default function MediaTab({
  t,
  register,
  mediaDriver,
  storageLimitGb,
  storageStats,
  formatSize,
  cleaningDatabase,
  setConfirmCleanupDatabase,
  databaseCleanupResult,
  testStorageConnection,
  testingStorage,
}: {
  t: ReturnType<typeof useI18n>['t'];
  register: UseFormRegister<any>;
  mediaDriver: string;
  storageLimitGb: any;
  storageStats: StorageStats;
  formatSize: (bytes: number) => string;
  cleaningDatabase: boolean;
  setConfirmCleanupDatabase: (v: boolean) => void;
  databaseCleanupResult: Record<string, number> | null;
  testStorageConnection: () => void;
  testingStorage: boolean;
}) {
  return (
    <>
      <Panel title={t('admin.settings.media.usage.section', '存储用量')}>
        <div className="flex flex-col gap-4">
          {(() => {
            const drivers = storageStats.drivers || {};
            const local = drivers['local'] || { files: 0, size: 0 };
            const cloud = drivers['s3'] || drivers['r2'] || { files: 0, size: 0 };
            // Cloud driver still uses the admin-configured GB
            // budget — there's no host filesystem to measure
            // for S3/R2.
            const limitBytes = (Number(storageLimitGb) || 10) * 1024 * 1024 * 1024;
            const cloudRatio = cloud.size / limitBytes;

            // Local: real disk usage of the host filesystem
            // hosting the uploads directory (statfs in
            // backend). Falls back to the synthetic budget
            // if the disk info is missing (only hits when
            // statfs syscall failed entirely or talking to
            // a pre-disk-payload api build).
            const disk = storageStats.disk;
            const diskTotal = disk ? (Number(disk.total) || 0) : 0;
            const diskUsed  = disk ? (Number(disk.used)  || 0) : 0;
            const diskFree  = disk ? (Number(disk.free)  || 0) : 0;
            const useDisk = diskTotal > 0;
            const localRatio = useDisk ? diskUsed / diskTotal : (local.size / limitBytes);
            const barColor = (ratio: number) => ratio > 0.9 ? 'bg-destructive' : ratio > 0.7 ? 'bg-amber-500' : 'bg-primary';

            return (<>
              {/* Local — real host disk when available */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <HardDrive className="size-3" /> {t('admin.settings.media.localStorage', '本地存储')}
                    <span className="text-xs text-muted-foreground">({t('admin.settings.media.fileCount', '{count} 个文件', { count: local.files })})</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {useDisk
                      ? <>{formatSize(diskUsed)} / {formatSize(diskTotal)}<span className="ml-1.5 text-muted-foreground">{t('admin.settings.media.remaining', '剩余 {size}', { size: formatSize(diskFree) })}</span></>
                      : formatSize(local.size)
                    }
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full transition-[width] duration-300', barColor(localRatio))} style={{ width: `${Math.min(localRatio * 100, 100)}%` }} />
                </div>
                {useDisk && (
                  <div className="mt-1 text-2xs text-muted-foreground">
                    {t('admin.settings.media.uploadsDiskUsage', '其中 utterlog 上传文件 {size}（占主机磁盘 {percent}%）', { size: formatSize(local.size), percent: ((local.size / diskTotal) * 100).toFixed(1) })}
                  </div>
                )}
              </div>
              {/* Cloud (show when configured or has data) */}
              {(mediaDriver === 's3' || mediaDriver === 'r2' || cloud.files > 0) && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Cloud className="size-3" />
                      {mediaDriver === 'r2' ? 'Cloudflare R2' : 'AWS S3'}
                      <span className="text-xs text-muted-foreground">({t('admin.settings.media.fileCount', '{count} 个文件', { count: cloud.files })})</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{formatSize(cloud.size)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full transition-[width] duration-300', cloudRatio > 0.9 ? 'bg-destructive' : 'bg-amber-500')} style={{ width: `${Math.min(cloudRatio * 100, 100)}%` }} />
                  </div>
                </div>
              )}
            </>);
          })()}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h3 className="mb-2 text-xs-plus font-semibold tracking-wide text-foreground">{t('admin.settings.media.cleanup.section', '数据库清理')}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('admin.settings.media.cleanup.description', '清理媒体库缺失文件记录、失效相册关联、孤儿文章关系、孤儿评论、足迹残留和过期授权数据。不会删除正文内容，也不会删除远程对象存储里的文件。')}
            </p>
          </div>
          <Button type="button" variant="secondary" disabled={cleaningDatabase} onClick={() => setConfirmCleanupDatabase(true)} className="min-w-37">
            {cleaningDatabase ? <Loader2 className="size-3.5 animate-spin" /> : <Brush className="size-3.5" />}
            {t('admin.settings.media.cleanup.button', '清理数据库')}
          </Button>
        </div>
        {databaseCleanupResult && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ['media_missing_files', t('admin.settings.media.cleanup.mediaMissingFiles', '缺失媒体')],
              ['album_links_reset', t('admin.settings.media.cleanup.albumLinksReset', '相册关联')],
              ['album_covers_cleared', t('admin.settings.media.cleanup.albumCoversCleared', '失效封面')],
              ['relationships_deleted', t('admin.settings.media.cleanup.relationshipsDeleted', '文章关系')],
              ['comments_deleted', t('admin.settings.media.cleanup.commentsDeleted', '孤儿评论')],
              ['footprints_deleted', t('admin.settings.media.cleanup.footprintsDeleted', '足迹关联')],
              ['expired_tokens_deleted', t('admin.settings.media.cleanup.expiredTokensDeleted', '过期令牌')],
              ['expired_bans_deleted', t('admin.settings.media.cleanup.expiredBansDeleted', '过期封禁')],
              ['total', t('admin.settings.media.cleanup.total', '合计')],
            ].map(([key, label]) => (
              <div key={key} className={cn('rounded-md border border-border px-3 py-2.5', key === 'total' ? 'bg-primary/5' : 'bg-muted')}>
                <div className={cn('font-mono text-lg leading-tight', key === 'total' ? 'text-primary' : 'text-foreground')}>{Number(databaseCleanupResult[key] || 0)}</div>
                <div className="mt-1 text-2xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={t('admin.settings.media.driver.section', '存储方式')}>
        <div className="mb-6">
          <label className="mb-2 block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.media.driver.label', '存储驱动')}</label>
          <div className="flex gap-2.5">
            {([
              { value: 'local', label: t('admin.settings.media.localStorage', '本地存储'), icon: HardDrive, desc: t('admin.settings.media.driver.localDesc', '文件保存在服务器本地') },
              { value: 's3', label: 'AWS S3', icon: Cloud, desc: t('admin.settings.media.driver.s3Desc', 'Amazon S3 / 兼容存储') },
              { value: 'r2', label: 'Cloudflare R2', icon: Cloud, desc: t('admin.settings.media.driver.r2Desc', '零出口费用对象存储') },
            ]).map(d => {
              const Icon = d.icon;
              const active = mediaDriver === d.value;
              return (
                <label key={d.value} className={cn(
                  'flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-md border p-4 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                )}>
                  <input type="radio" value={d.value} {...register('media_driver')} className="hidden" />
                  <Icon className={cn('size-5.5', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-xs-plus font-semibold', active ? 'text-primary' : 'text-foreground')}>{d.label}</span>
                  <span className="text-center text-2xs text-muted-foreground">{d.desc}</span>
                </label>
              );
            })}
          </div>
        </div>

        {(mediaDriver === 's3' || mediaDriver === 'r2') && (
          <div className="flex flex-col gap-5 rounded-md border border-border bg-muted p-6">
            <div className="flex items-center gap-2">
              <Cloud className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">{t('admin.settings.media.cloudConfig', '{provider} 配置', { provider: mediaDriver === 'r2' ? 'Cloudflare R2' : 'AWS S3' })}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">Endpoint</label>
                <Input {...register('s3_endpoint')} placeholder={mediaDriver === 'r2' ? 'https://<account_id>.r2.cloudflarestorage.com' : 'https://s3.amazonaws.com'} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">Region</label>
                <Input {...register('s3_region')} placeholder={mediaDriver === 'r2' ? 'auto' : 'us-east-1'} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs-plus font-medium text-muted-foreground">Bucket</label>
              <Input {...register('s3_bucket')} placeholder="my-bucket" className="max-w-80" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">Access Key</label>
                <Input {...register('s3_access_key')} placeholder="AKIA..." />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs-plus font-medium text-muted-foreground">Secret Key</label>
                <Input type="password" {...register('s3_secret_key')} placeholder="••••••••" />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <div className="mb-2 flex items-center gap-1.5">
                <Globe className="size-3.5 text-primary" />
                <label className="text-xs-plus font-medium text-muted-foreground">{t('admin.settings.media.customDomain', '自定义域名 (CDN)')}</label>
              </div>
              <Input {...register('s3_custom_domain')} placeholder="https://cdn.yourdomain.com" className="max-w-100" />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t('admin.settings.media.customDomainHint', '绑定自定义域名后，所有文件 URL 将使用此域名访问。')}
                {mediaDriver === 'r2' && ` ${t('admin.settings.media.r2CustomDomainHint', 'R2 可在 Cloudflare Dashboard 中绑定自定义域名。')}`}
                {mediaDriver === 's3' && ` ${t('admin.settings.media.s3CdnHint', '建议配合 CloudFront 或其他 CDN 使用。')}`}
                {t('admin.settings.media.customDomainEmptyHint', ' 留空则使用 Bucket 原始地址。')}
              </p>
            </div>

            <div className="border-t border-border pt-5">
              <label className="mb-1.5 block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.media.storageLimit', '空间容量限制 (GB)')}</label>
              <Input type="number" min={1} {...register('storage_limit_gb')} placeholder="10" className="w-40" />
              <p className="mt-1 text-xs text-muted-foreground">{t('admin.settings.media.storageLimitHint', '超过此容量将不允许继续上传')}</p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Button type="button" variant="outline" onClick={testStorageConnection} disabled={testingStorage}>
                {testingStorage ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                {testingStorage ? t('admin.common.testing', '测试中…') : t('admin.common.testConnection', '测试连接')}
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title={t('admin.settings.media.folderRouting.section', '分类存储路由')}>
        <p className="mb-5 -mt-3 text-xs leading-relaxed text-muted-foreground">
          {t('admin.settings.media.folderRouting.description', '为每个上传分类单独指定存储位置。选择「云端」时，该分类的文件将上传至已配置的 S3/R2；选择「本地」时始终保存在服务器本地。「跟随全局」使用上方存储方式设置。')}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { key: 'folder_driver_covers', label: t('admin.settings.media.folderRouting.covers', '文章封面'), icon: ImageIcon },
            { key: 'folder_driver_books', label: t('admin.settings.media.folderRouting.books', '书单封面'), icon: BookOpen },
            { key: 'folder_driver_movies', label: t('admin.settings.media.folderRouting.movies', '影视封面'), icon: Film },
            { key: 'folder_driver_music', label: t('admin.settings.media.folderRouting.music', '音乐封面'), icon: Music },
            { key: 'folder_driver_links', label: t('admin.settings.media.folderRouting.links', '友链头像'), icon: LinkIcon },
            { key: 'folder_driver_moments', label: t('admin.settings.media.folderRouting.moments', '动态图片'), icon: Zap },
            { key: 'folder_driver_albums', label: t('admin.settings.media.folderRouting.albums', '相册图片'), icon: Images },
            { key: 'folder_driver_avatars', label: t('admin.settings.media.folderRouting.avatars', '用户头像'), icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between rounded-md border border-border bg-muted px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-xs-plus text-foreground">
                <Icon className="size-3.5 text-muted-foreground" />
                {label}
              </span>
              <select className={cn(SELECT_CLS, 'h-8 w-25 px-2 py-1 text-xs')} {...register(key)}>
                <option value="">{t('admin.settings.media.folderRouting.followGlobal', '跟随全局')}</option>
                <option value="local">{t('admin.settings.media.folderRouting.local', '本地')}</option>
                <option value="cloud">{t('admin.settings.media.folderRouting.cloud', '云端')}</option>
              </select>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={t('admin.settings.media.uploadLimits.section', '上传限制')}>
        <div className="grid gap-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.media.uploadLimits.maxSize', '最大上传大小 (MB)')}</label>
            <Input type="number" {...register('max_upload_size')} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs-plus font-medium text-muted-foreground">{t('admin.settings.media.uploadLimits.allowedTypes', '允许的文件类型')}</label>
            <Textarea className="font-mono text-xs" rows={3} {...register('allowed_extensions')} placeholder={t('admin.settings.media.uploadLimits.allowedTypesPlaceholder', '每行一个扩展名，或用逗号分隔')} />
            <p className="text-xs text-muted-foreground">
              {t('admin.settings.media.uploadLimits.commonTypes', '常用：jpg, jpeg, png, gif, webp, svg, ico, mp4, mp3, pdf, zip, doc, docx, xls, xlsx, ppt, pptx, txt, md')}
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
