import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 三层从上往下依次落位，像数据一层层堆起来。
const TOP =
  '-motion-translate-y-in-[3px] motion-opacity-in-0 motion-duration-500 motion-ease-spring-smooth motion-reduce:animate-none';
const BODY =
  '-motion-translate-y-in-[3px] motion-opacity-in-0 motion-duration-500 motion-delay-[100ms] motion-ease-spring-smooth motion-reduce:animate-none';
const MIDDLE =
  '-motion-translate-y-in-[3px] motion-opacity-in-0 motion-duration-500 motion-delay-[200ms] motion-ease-spring-smooth motion-reduce:animate-none';

const DatabaseIcon = createAnimatedIcon('DatabaseIcon', (animating) => (
  <>
    <ellipse className={animating ? TOP : undefined} cx="12" cy="5" rx="9" ry="3" />
    <path className={animating ? BODY : undefined} d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path className={animating ? MIDDLE : undefined} d="M3 12A9 3 0 0 0 21 12" />
  </>
));

export { DatabaseIcon };
