import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 两个气泡先后弹出来，像一来一回的对话。
const BUBBLE_FIRST =
  'icon-origin-self motion-scale-in-[0.75] motion-opacity-in-0 motion-duration-500 motion-ease-spring-bouncy motion-reduce:animate-none';
const BUBBLE_SECOND =
  'icon-origin-self motion-scale-in-[0.75] motion-opacity-in-0 motion-duration-500 motion-delay-[130ms] motion-ease-spring-bouncy motion-reduce:animate-none';

const MessagesSquareIcon = createAnimatedIcon(
  'MessagesSquareIcon',
  (animating) => (
    <>
      <path
        className={animating ? BUBBLE_FIRST : undefined}
        d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      />
      <path
        className={animating ? BUBBLE_SECOND : undefined}
        d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"
      />
    </>
  )
);

export { MessagesSquareIcon };
