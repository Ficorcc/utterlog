/**
 * 设置页的共享 UI 原语。
 *
 * 从 Settings.tsx 抽出来，好让每个 tab 各自成为一个组件文件 —— 原先整页
 * 2059 行挤在一个函数里，切 tab 时整个函数体重新执行。
 *
 * 这些都是「一行设置」的排版件：左侧标签 + 右侧控件的固定栅格。
 */

import { type ReactNode, useEffect, useState } from 'react';
import {
  Button, Card, Input, Textarea, Switch,
} from '@/components/ui/shadcn';
import {
  Image as ImageIcon,
  ImageOff,
  Loader2, Plug,
  CheckCircle2, XCircle, type LucideIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// Native <select> styled like the shadcn Input so it stays compatible
// with react-hook-form register() (Base UI Select can't take register).
export const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

// ---------------------------------------------------------------------------
// Local layout helpers — replicate the old FormC section/row look with shadcn
// semantic tokens so both light/dark themes work out of the box.
// ---------------------------------------------------------------------------

/**
 * 分组标题（图标 + 14px 标题 + 说明 + 右侧动作），画在卡片外面。
 *
 * 唯一一份：SettingsSection、Panel 和「自己渲染卡片」的 UpdateTab 都用它。
 * 之前这三条路各写一套标题，同一页会同时出现「14px 带图标」和「13px 无
 * 图标」两种分组标题。
 */
export function SectionHeading({
  title, icon: Icon, description, inlineDescription, action,
}: {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  inlineDescription?: boolean;
  action?: ReactNode;
}) {
  if (!title && !description && !action) return null;
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-2.5">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-primary" />}
          {title && <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>}
          {inlineDescription && description && (
            <p className="min-w-0 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {!inlineDescription && description && (
          <p className={cn('mt-1.5 text-xs leading-relaxed text-muted-foreground', Icon && 'pl-6')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SettingsSection({
  title, icon: Icon, description, inlineDescription, footerHint, children,
}: {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  inlineDescription?: boolean;
  footerHint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      {title && (
        <SectionHeading
          title={title}
          icon={Icon}
          description={description}
          inlineDescription={inlineDescription}
        />
      )}
      <Card className="overflow-hidden">{children}</Card>
      {footerHint && (
        <p className="mx-4 mt-2 text-2xs leading-relaxed text-muted-foreground">{footerHint}</p>
      )}
    </section>
  );
}

/**
 * 内部「不是设置项列表」的卡片容器：进度条、卡片选择器、URL 构建器这类
 * 块。设置项一行行排的用 SettingsSection，别用这个。
 *
 * 标题排版跟 SettingsSection 完全对齐（标题在卡片外、14px、可带图标和说明）
 * —— 之前 Panel 的标题是 13px 且画在卡片里面，同一页会同时出现两种分组
 * 标题的长相。
 *
 * description 做成槽位而不是让调用处自己写 <p>：原先四处各写一个负边距
 * （-mt-3 / -mt-4 / mb-5）去抵消标题的下边距，值还各不相同。
 */
export function Panel({ title, icon: Icon, description, action, children, className }: {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="mb-6">
      <SectionHeading title={title} icon={Icon} description={description} action={action} />
      <Card className={cn('p-6', className)}>{children}</Card>
    </section>
  );
}

export function Row({ label, hint, last, align = 'left', column, children }: {
  label?: string;
  hint?: ReactNode;
  last?: boolean;
  align?: 'left' | 'right';
  column?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('grid min-h-14 grid-cols-[32%_1fr]', !last && 'border-b border-border')}>
      <div className="flex flex-col justify-center px-3.5 py-2.5">
        {label && <div className="text-xs-plus font-medium text-foreground">{label}</div>}
        {hint && <div className="mt-0.5 text-xs leading-normal text-muted-foreground">{hint}</div>}
      </div>
      <div className={cn('flex px-3.5 py-1.5', column ? 'flex-col justify-center' : 'items-center', align === 'right' && !column && 'justify-end')}>
        {children}
      </div>
    </div>
  );
}

export function InputRow({ label, hint, type = 'text', placeholder, register, last }: {
  label: string;
  hint?: ReactNode;
  type?: string;
  placeholder?: string;
  register?: any;
  last?: boolean;
}) {
  return (
    <Row label={label} hint={hint} last={last}>
      {type === 'range' ? (
        <input type="range" className="h-2 w-full cursor-pointer accent-primary" {...(register || {})} />
      ) : (
        <Input type={type} placeholder={placeholder} {...(register || {})} />
      )}
    </Row>
  );
}

/**
 * 凭据测试。跟输入框同行，结果显示在下方一行小字里。
 *
 * 点一下拿当前输入框的值去打对方官方接口，回来的是真实校验结果 —— 只看格式
 * 没意义，key 拼对了但被吊销、配额用尽、限制了来源，格式都是对的。输入框留空
 * 时后端退回已保存的那份，可以用来验证线上正在生效的配置。
 *
 * GitHub 和 TinyPNG 会在挂载时自动查一次用量：这两家把额度放在响应头里
 * （x-ratelimit-remaining / compression-count），顺手就能拿到，不用用户先点。
 * 其余几家的配额只在各自控制台，接口不返回，就只能等用户主动点测试。
 */
export const AUTO_USAGE_FIELDS = new Set(['github_access_token', 'tinypng_api_key']);

export function CredentialTest({ field, getValue }: { field: string; getValue: () => string }) {
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);

  const run = async (silent = false) => {
    if (!silent) setTesting(true);
    try {
      const r: any = await api.post('/options/test-credential', { field, value: silent ? '' : getValue() });
      const data = r?.data ?? r;
      setResult({ ok: !!data?.ok, message: String(data?.message || ''), detail: data?.detail });
    } catch (e: any) {
      // 自动查用量失败就安静收场，别在用户没动手时弹一行红字
      if (silent) return;
      const msg = e?.response?.data?.message || e?.message || t('admin.settings.services.testFailed', '测试失败');
      setResult({ ok: false, message: String(msg) });
    } finally {
      if (!silent) setTesting(false);
    }
  };

  useEffect(() => {
    if (AUTO_USAGE_FIELDS.has(field)) void run(true);
    // 只在挂载时查一次，避免每次输入都打外部接口
  }, [field]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => run()} disabled={testing}>
        {testing ? <Loader2 className="animate-spin" /> : <Plug />}
        {testing ? t('admin.settings.services.testing', '测试中') : t('admin.settings.services.test', '测试')}
      </Button>
      {result && (
        <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs',
          result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}
          title={[result.message, result.detail].filter(Boolean).join(' — ')}>
          {result.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          <span className="max-w-52 truncate">{result.detail || result.message}</span>
        </span>
      )}
    </>
  );
}

export function SelectRow({ label, hint, register, options, last }: {
  label: string;
  hint?: ReactNode;
  register?: any;
  options: { value: string; label: string }[];
  last?: boolean;
}) {
  return (
    <Row label={label} hint={hint} last={last}>
      <select className={SELECT_CLS} {...(register || {})}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </Row>
  );
}

export function TextareaRow({ label, hint, rows = 3, placeholder, register, last }: {
  label: string;
  hint?: ReactNode;
  rows?: number;
  placeholder?: string;
  register?: any;
  last?: boolean;
}) {
  return (
    <Row label={label} hint={hint} last={last} column>
      <Textarea rows={rows} placeholder={placeholder} {...(register || {})} />
    </Row>
  );
}

export function RadioRow({ label, hint, options, register, last }: {
  label: string;
  hint?: ReactNode;
  options: ReadonlyArray<{ value: string; label: string }>;
  register: any;
  last?: boolean;
}) {
  return (
    <Row label={label} hint={hint} last={last}>
      <div className="flex flex-wrap items-center gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-xs-plus text-foreground">
            <input type="radio" value={opt.value} {...register} className="accent-primary" />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </Row>
  );
}

/**
 * 「N 选一」的卡片式 radio。
 *
 * ImageTab 显示效果 / MediaTab 存储方式 / EmailTab 服务商 / CommentTab
 * 人机验证各抄了一份，卡片内边距 p-4 / px-2.5 py-3 / px-2 py-3、图标
 * 22px / 20px 三档都不一样。这里定死一套：卡片 p-4、图标 20px、选中态
 * 描边 + 5% 底色。
 *
 * 原生 radio 藏在 label 里而不是换成受控组件：register() 要拿到真实的
 * input 才能把值收进 react-hook-form。
 */
export function RadioCardRow({ label, value, options, register, className }: {
  label?: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string; desc?: string; icon?: LucideIcon }>;
  register: any;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <div className="mb-2 text-xs-plus font-medium text-foreground">{label}</div>}
      <div className="flex gap-2.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                'flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 border p-4 text-center transition-colors',
                // input 用 sr-only 而不是 hidden：display:none 的控件不参与 tab
                // 顺序，键盘完全选不了；sr-only 只是视觉隐藏，焦点环画在卡片上。
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
                active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
              )}
            >
              <input type="radio" value={opt.value} {...register} className="sr-only" />
              {Icon && <Icon className={cn('mb-1 size-5', active ? 'text-primary' : 'text-muted-foreground')} />}
              <span className={cn('text-xs-plus font-semibold', active ? 'text-primary' : 'text-foreground')}>
                {opt.label}
              </span>
              {opt.desc && <span className="text-2xs text-muted-foreground">{opt.desc}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function SwitchRow({ label, hint, name, watch, setValue, last }: {
  label: string;
  hint?: ReactNode;
  name: string;
  watch: any;
  setValue: any;
  last?: boolean;
}) {
  return (
    <Row label={label} hint={hint} last={last} align="right">
      <Switch
        checked={!!watch(name)}
        onCheckedChange={(v: boolean) => setValue(name, v, { shouldDirty: true })}
      />
    </Row>
  );
}

// Tab IDs recognized on #hash so deep links like /settings#update land
// directly on the right pane. Keep in sync with `tabs` below.
export function BrandingPreview({ src, alt }: { src: string; alt: string }) {
  const { t } = useI18n();
  const [error, setError] = useState(false);
  if (!src || error) {
    const Icon = error ? ImageOff : ImageIcon;
    return (
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <Icon className="size-6 opacity-40" />
        {error && (
          <span className="text-3xs opacity-70">{t('admin.settings.branding.loadFailed', '加载失败')}</span>
        )}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="max-h-12 max-w-4/5 object-contain"
      onError={() => setError(true)}
    />
  );
}

/**
 * 每个 tab 允许提交的字段白名单。保存时按这里过滤表单 payload —— 少写一个
 * 字段，用户的修改会静默丢失（POST 里没这个 key，库里就不会变，刷新后回退）。
 *
 * 放在组件外：纯静态字符串，没有任何依赖。留在组件里的话，每次切 tab、每次
 * 输入都要重建这 59 行的对象。
 */
