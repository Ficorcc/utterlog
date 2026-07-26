import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 放大镜凑近看一眼：镜片从小弹到原尺寸，手柄跟着往左上收一点。
const LENS =
  'icon-origin-self motion-scale-in-[0.7] motion-duration-500 motion-ease-spring-bouncy motion-reduce:animate-none';
const HANDLE =
  'motion-translate-x-in-[-2px] motion-translate-y-in-[-2px] motion-duration-500 motion-ease-spring-bouncy motion-reduce:animate-none';

const SearchIcon = createAnimatedIcon('SearchIcon', (animating) => (
  <>
    <path className={animating ? HANDLE : undefined} d="m21 21-4.34-4.34" />
    <circle className={animating ? LENS : undefined} cx="11" cy="11" r="8" />
  </>
));

export { SearchIcon };
