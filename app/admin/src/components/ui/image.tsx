import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 相框不动：里面的「太阳」鼓两下，远山随后升上来。
const SUN =
  'icon-origin-self motion-scale-loop-[1.35] motion-loop-twice motion-duration-500 motion-ease-spring-bouncy motion-reduce:animate-none';
const RIDGE =
  'motion-translate-y-in-[3px] motion-opacity-in-0 motion-duration-500 motion-delay-[120ms] motion-ease-spring-smooth motion-reduce:animate-none';

const ImageIcon = createAnimatedIcon('ImageIcon', (animating) => (
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle className={animating ? SUN : undefined} cx="9" cy="9" r="2" />
    <path
      className={animating ? RIDGE : undefined}
      d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
    />
  </>
));

export { ImageIcon };
