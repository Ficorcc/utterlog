import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/shadcn';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AdminErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="px-5 py-16 text-center">
        <TriangleAlert className="mx-auto size-10 text-destructive" />
        <h1 className="mb-2 mt-4 text-lg">页面渲染出错</h1>
        <p className="text-xs-plus text-muted-foreground">这个模块加载失败，其他功能不受影响。</p>
        <Button className="mt-4" onClick={() => this.setState({ error: null })}>
          <RotateCcw className="size-4" /> 重试
        </Button>
      </div>
    );
  }
}
