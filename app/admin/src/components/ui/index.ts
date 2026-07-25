// 统一出口就是 shadcn Button。原先这里转的是一层旧 API 适配器
// （variant=primary/danger、size=md、loading），调用点已全部迁完，适配器已删。
export { Button, buttonVariants } from './shadcn/button';
export { SaveButton } from './save-button';
export { Input } from './input';
export { Modal } from './modal';
export { ConfirmDialog } from './confirm-dialog';
export { CoverInput } from './CoverInput';
export { default as Spinner } from './Spinner';
export {
  AdminToolbar,
  DialogFooter,
  EmptyPanel,
  LoadingState,
  MediaItemGrid,
  MetricCard,
  MetricGrid,
  RatingStars,
  RowActions,
} from './admin-shared';
