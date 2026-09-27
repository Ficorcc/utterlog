import type { SVGProps } from 'react';

/**
 * Whono 主题内联图标集。
 * 统一 1.6px 描边、24 视窗，颜色跟随 currentColor —— 不引第三方图标库，
 * 避免主题为了 5 个图标多打一份字体或 SVG sprite。
 */
type IconProps = SVGProps<SVGSVGElement>;

function svgProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...props,
  };
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function IconRss(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconBookOpen(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 6.5C10.5 5.3 8.6 4.7 6 4.7v12.6c2.6 0 4.5.6 6 1.8 1.5-1.2 3.4-1.8 6-1.8V4.7c-2.6 0-4.5.6-6 1.8Z" />
      <path d="M12 6.5V19" />
    </svg>
  );
}

export function IconBookClosed(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 4.7h6.5a2 2 0 0 1 2 2v11.6a2 2 0 0 0-2-2H5Z" />
      <path d="M19 4.7h-4.5a2 2 0 0 0-2 2v11.6a2 2 0 0 1 2-2H19Z" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}
