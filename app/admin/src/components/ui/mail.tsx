import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 信封盖从上方合下来，信封本体不动。
const FLAP =
  '-motion-translate-y-in-[3px] motion-opacity-in-0 motion-duration-500 motion-ease-spring-smooth motion-reduce:animate-none';

const MailIcon = createAnimatedIcon('MailIcon', (animating) => (
  <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path
      className={animating ? FLAP : undefined}
      d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"
    />
  </>
));

export { MailIcon };
