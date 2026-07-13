import { Component, type ErrorInfo, type ReactNode } from 'react';

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
      <div style={{ padding: '64px 20px', textAlign: 'center' }}>
        <i className="fa-regular fa-triangle-exclamation" style={{ fontSize: 40, color: 'var(--color-error, #dc2626)' }} />
        <h1 style={{ fontSize: 18, margin: '16px 0 8px' }}>页面渲染出错</h1>
        <p className="text-sub" style={{ fontSize: 13 }}>这个模块加载失败，其他功能不受影响。</p>
        <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
          <i className="fa-regular fa-rotate-right" /> 重试
        </button>
      </div>
    );
  }
}
