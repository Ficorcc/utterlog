import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 自转：外圈不动，经线和赤道横向压扁再弹回，赤道晚半拍，像球体转过去一格。
const MERIDIAN =
  'icon-origin-self motion-scale-x-in-[0.2] motion-duration-700 motion-ease-spring-smooth motion-reduce:animate-none';
const EQUATOR =
  'icon-origin-self motion-scale-x-in-[0.2] motion-duration-700 motion-delay-[90ms] motion-ease-spring-smooth motion-reduce:animate-none';

const GlobeIcon = createAnimatedIcon('GlobeIcon', (animating) => (
  <>
    <circle cx="12" cy="12" r="10" />
    <path
      className={animating ? MERIDIAN : undefined}
      d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
    />
    <path className={animating ? EQUATOR : undefined} d="M2 12h20" />
  </>
));

export { GlobeIcon };
