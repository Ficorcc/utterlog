import { createAnimatedIcon } from '@/components/ui/animated-icon';

// 云先淡入，箭头持续往下一沉一回 —— 悬停期间一直循环，对应「正在下载」。
// 循环必须走 -loop 系列：插件只给 -loop 的 animation 挂了 loop-count。
const CLOUD =
  'motion-opacity-in-0 motion-duration-500 motion-ease-spring-smooth motion-reduce:animate-none';
const ARROW =
  'motion-translate-y-loop-[3px] motion-loop-infinite motion-duration-700 motion-ease-spring-smooth motion-reduce:animate-none';

const CloudDownloadIcon = createAnimatedIcon('CloudDownloadIcon', (animating) => (
  <>
    <path
      className={animating ? CLOUD : undefined}
      d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"
    />
    <g className={animating ? ARROW : undefined}>
      <path d="M12 13v8l-4-4" />
      <path d="m12 21 4-4" />
    </g>
  </>
));

export { CloudDownloadIcon };
