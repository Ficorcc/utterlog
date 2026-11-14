/**
 * Robes 图标集
 *
 * 原 Typecho 主题用的是 Remix Icon 字体（ri-*.css + woff2），字体文件不在主题包里，
 * 这里改成等价的内联 SVG：描边风格、24 视窗、currentColor 着色，
 * 在浅色 / 深色下都跟着文字色走，也不会因为字体没加载而出现豆腐块。
 */

type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.8V20h13V9.8" />
      <path d="M9.8 20v-5.6h4.4V20" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.6" cy="10.6" r="6.6" />
      <path d="M15.4 15.4l4.3 4.3" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.4v-5" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.2 7.4a2.4 2.4 0 0 1 2.4-2.4h12.8a2.4 2.4 0 0 1 2.4 2.4v9.2a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V7.4Z" />
      <path d="M3.6 7.2l8.4 5.5 8.4-5.5" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.2 15.3A8.6 8.6 0 0 1 8.5 3.6 8.6 8.6 0 1 0 20.2 15.3Z" />
    </Svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7.2h16M4 12h16M4 16.8h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />
    </Svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 11.6c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.6-.34L4.5 20l1.2-3.3a6.9 6.9 0 0 1-2.2-5.1c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.6h17M8.2 3.5v3M15.8 3.5v3" />
    </Svg>
  );
}

export function IconTime(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.2 2" />
    </Svg>
  );
}

export function IconFileText(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3.5H7a2.5 2.5 0 0 0-2.5 2.5v12a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5Z" />
      <path d="M13.5 3.5v6h6M8.6 13h6.8M8.6 16.6h4.8" />
    </Svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.3l2 2.4h7.7a2 2 0 0 1 2 2v8.6a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11.6 3.5H20v8.4l-8.9 8.9a1.8 1.8 0 0 1-2.5 0l-5.9-5.9a1.8 1.8 0 0 1 0-2.5l8.9-8.9Z" />
      <circle cx="16.4" cy="7.6" r="1.3" />
    </Svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="4.2" width="17.2" height="4.2" rx="1.6" />
      <path d="M5 8.4v10.2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.4M10 12.4h4" />
    </Svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20s-7.4-4.6-7.4-9.4a4.2 4.2 0 0 1 7.4-2.7 4.2 4.2 0 0 1 7.4 2.7c0 4.8-7.4 9.4-7.4 9.4Z" />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function IconList(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSailboat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v9.8M12 13.3 4.8 8.2 12 6.4M12 13.3l7.2-5.1L12 6.4" />
      <path d="M3.5 17.5c1.8 0 2.6 1.5 4.3 1.5s2.5-1.5 4.2-1.5 2.6 1.5 4.3 1.5 2.5-1.5 4.2-1.5" />
    </Svg>
  );
}

export function IconQuill(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20s3.2-1 4.6-3.2c1.6-2.6 1.4-6.4 3.6-9.4 1.8-2.4 4.6-3.6 7.8-3.9.3 3.4-.6 6.4-2.8 8.6-2.6 2.6-6 2.6-8.4 4.4C6.9 18 6 19.5 4 20Z" />
      <path d="M11.8 12.4 19 7.2" />
    </Svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 3 10.6 13.4M21 3l-6.8 18-3.6-7.6L3 9.8 21 3Z" />
    </Svg>
  );
}

export function IconWater(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5S6.5 9.4 6.5 13.6a5.5 5.5 0 0 0 11 0C17.5 9.4 12 3.5 12 3.5Z" />
    </Svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
    </Svg>
  );
}

export function IconCloudy(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 18.5a4.2 4.2 0 0 1-.3-8.4 5.4 5.4 0 0 1 10.4-1.3 3.9 3.9 0 0 1-.6 9.7H7.5Z" />
    </Svg>
  );
}

export function IconSunCloud(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.4" cy="7.6" r="3" />
      <path d="M8.4 2.6v1.4M3.6 7.6H2.2M4.7 3.9 3.8 3M13.3 3.9l-.9-.9" />
      <path d="M10 20a3.8 3.8 0 0 1-.3-7.6 4.8 4.8 0 0 1 9.3-1.2A3.5 3.5 0 0 1 18.4 20H10Z" />
    </Svg>
  );
}

export function IconRain(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 14.5a4 4 0 0 1-.3-8 5.2 5.2 0 0 1 10-1.2A3.7 3.7 0 0 1 16.6 14.5" />
      <path d="M8.5 17.5 7.6 20M12.5 17.5 11.6 20M16.5 17.5 15.6 20" />
    </Svg>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.4 5.5C6.4 7 4.8 9.5 4.8 12.6v5.9h6.1v-6.1H7.6c.1-1.9 1-3.3 2.9-4.3Zm9 0c-3 1.5-4.6 4-4.6 7.1v5.9h6.1v-6.1h-3.3c.1-1.9 1-3.3 2.9-4.3Z" />
    </Svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13.9a3.6 3.6 0 0 0 5.1 0l3.2-3.2a3.6 3.6 0 0 0-5.1-5.1L11.4 7.4" />
      <path d="M14 10.1a3.6 3.6 0 0 0-5.1 0l-3.2 3.2a3.6 3.6 0 0 0 5.1 5.1l1.8-1.8" />
    </Svg>
  );
}

export function IconRss(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z" />
      <path d="M4.6 11.2a8.2 8.2 0 0 1 8.2 8.2M4.6 5.4a14 14 0 0 1 14 14" />
    </Svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.2A1.7 1.7 0 0 1 5.7 3.5H19v14.2H5.7A1.7 1.7 0 0 0 4 19.4Z" />
      <path d="M4 19.4a1.7 1.7 0 0 0 1.7 1.7H19v-3.4" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20.2c.7-3.6 3.6-5.6 7.2-5.6s6.5 2 7.2 5.6" />
    </Svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.4" />
      <path d="m4.4 7.2 7.6 5.3 7.6-5.3" />
    </Svg>
  );
}

export function IconHandshake(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m8.6 12.4 2.2 2.2a1.7 1.7 0 0 0 2.4 0l4.6-4.6" />
      <path d="m3.6 9.4 3-2.4a2 2 0 0 1 2.5 0l1.3 1 1.3-1a2 2 0 0 1 2.5 0l3 2.4" />
      <path d="m9.4 13.8 1.6 1.6M11.4 15.6l1.3 1.3M13.4 15.4l1 1" />
      <path d="M3.6 9.4v3.4c0 .5.2 1 .6 1.3l1.8 1.5M20.4 9.4v3.4c0 .5-.2 1-.6 1.3l-1.4 1.2" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.8 4.4 4.4L19 7.2" />
    </Svg>
  );
}

export function IconLightbulb(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.2 17.4h5.6" />
      <path d="M10 20.4h4" />
      <path d="M12 3.2a5.8 5.8 0 0 0-3.4 10.5c.6.5 1 1.2 1 2h4.8c0-.8.4-1.5 1-2A5.8 5.8 0 0 0 12 3.2Z" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.8" y="10.4" width="14.4" height="9.8" rx="2.4" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </Svg>
  );
}

export function IconPriceTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.8 11.4 11.4 3.8h6.4v6.4l-7.6 7.6a1.6 1.6 0 0 1-2.3 0l-4.1-4.1a1.6 1.6 0 0 1 0-2.3Z" />
      <circle cx="15.4" cy="8.6" r="1.3" />
    </Svg>
  );
}

export function IconPlug(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3.4v5.2M15 3.4v5.2" />
      <path d="M6.6 8.6h10.8v3.1a5.4 5.4 0 0 1-10.8 0Z" />
      <path d="M12 17.1v3.5" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.4 19.6h4.2L19 9.2l-4.2-4.2L4.4 15.4Z" />
      <path d="m13.4 6.4 4.2 4.2" />
    </Svg>
  );
}

export function IconInfoCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2v5" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconListCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3.4 6.6 1.8 1.8 3-3" />
      <path d="m3.4 12.4 1.8 1.8 3-3" />
      <path d="m3.4 18.2 1.8 1.8 3-3" />
      <path d="M12.4 6.8h8.2M12.4 12.6h8.2M12.4 18.4h8.2" />
    </Svg>
  );
}

/** 按菜单标题挑一个语义图标，对应原主题 pageNavIcon() 的做法。 */
export function navIcon(label: string) {
  const text = String(label || '').trim();
  if (/首页|home/i.test(text)) return <IconHome />;
  if (/归档|文章|archive/i.test(text)) return <IconArchive />;
  if (/分类|categor/i.test(text)) return <IconFolder />;
  if (/标签|tag/i.test(text)) return <IconTag />;
  if (/相册|album|图集/i.test(text)) return <IconArchive />;
  if (/友链|链接|links/i.test(text)) return <IconLink />;
  if (/留言|说说|moment|评论/i.test(text)) return <IconChat />;
  if (/书|读|book/i.test(text)) return <IconBook />;
  if (/关于|about/i.test(text)) return <IconInfo />;
  if (/订阅|rss/i.test(text)) return <IconRss />;
  if (/归档|足迹|travel/i.test(text)) return <IconArchive />;
  return <IconFileText />;
}
