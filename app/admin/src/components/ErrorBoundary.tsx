import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ErrorBoundary — admin 内容区的通用错误兜底。
 *
 * 背景：之前整棵路由树只有 ChunkErrorBoundary（只认 chunk 加载失败，
 * 其它错误一律重新 throw）。一旦任意页面在渲染期抛错（统计页的
 * mapbox-gl 异步回调、后端返回了非预期的数据形状、第三方库 bug……），
 * 错误会一路冒泡到 React 根，整棵树被卸载 —— 表现就是「页面点开
 * 先显示一下，过一会儿整页变白屏，侧栏也没了」。
 *
 * 这个边界包在 ChunkErrorBoundary 外层，捕获所有渲染期异常，渲染一个
 * 友好的回退 UI（错误信息 + 返回概览 + 重试），让侧栏 / 头部始终可见，
 * 用户能自己恢复，而不是只能 F5。
 *
 * 路由变化时自动 reset：从出错的页面切走再切回来，能重新渲染而不是
 * 卡在错误态。
 */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps & { locationKey: string }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 渲染异常:', error, info);
  }

  // 路由变化 → 复位错误态，让新页面正常渲染。
  // locationKey 由外层 hook（useLocation）传入，路径一变就变。
  componentDidUpdate(prevProps: ErrorBoundaryProps & { locationKey: string }) {
    if (prevProps.locationKey !== this.props.locationKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // 截取错误信息：堆栈里第一行通常就是原因，太长反而难读。
    const message = error.message || String(error);
    const brief = message.split('\n')[0].slice(0, 300);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '64px 20px', textAlign: 'center',
      }}>
        <i className="fa-regular fa-triangle-exclamation" style={{ fontSize: 44, color: 'var(--color-error, #dc2626)', marginBottom: 16 }} />
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>页面渲染出错</h1>
        <p className="text-sub" style={{ fontSize: 13, margin: '0 0 6px' }}>
          这个模块加载时遇到了问题，其它功能不受影响。
        </p>
        <code className="text-dim" style={{
          fontSize: 12, maxWidth: 640, wordBreak: 'break-word',
          background: 'var(--color-bg-soft)', padding: '8px 12px',
          border: '1px solid var(--color-border)', margin: '8px 0 20px',
          fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap',
        }}>
          {brief}
        </code>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={this.reset} className="btn btn-primary" style={{ fontSize: 13 }}>
            <i className="fa-regular fa-rotate-right" style={{ marginRight: 6 }} />
            重试
          </button>
          <a href="/admin/" className="btn btn-secondary" style={{ textDecoration: 'none', fontSize: 13 }}>
            返回概览
          </a>
        </div>
      </div>
    );
  }
}

// 外层用 hook 拿当前路径，转成 locationKey 传给 class 组件 ——
// class 组件里没法直接用 useLocation。
export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const location = useLocation();
  return <ErrorBoundaryInner locationKey={location.pathname}>{children}</ErrorBoundaryInner>;
}
