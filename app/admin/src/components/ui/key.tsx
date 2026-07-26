import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 拧一下钥匙：整把一起转，所以动效挂在外层 g，绕自身包围盒中心。
const KEY =
  'icon-origin-self motion-rotate-in-[-25deg] motion-duration-500 motion-ease-spring-bouncy motion-reduce:animate-none';

const KeyIcon = createAnimatedIcon('KeyIcon', (animating) => (
  <g className={animating ? KEY : undefined}>
    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </g>
));

export { KeyIcon };
