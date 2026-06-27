import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { I18nProvider } from '@/lib/i18n';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <I18nProvider>
        <App />
        <Toaster
          position="top-right"
          containerStyle={{ top: '72px', right: '24px' }}
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '1px',
              borderLeft: '4px solid #16a34a',
              background: 'var(--color-success-bg)',
              color: 'var(--color-success-text)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '12px 16px',
              fontSize: '14px',
              maxWidth: '480px',
            },
            success: {
              style: { borderRadius: '1px', borderLeft: '4px solid #16a34a', background: 'var(--color-success-bg)', color: 'var(--color-success-text)' },
              iconTheme: { primary: 'var(--color-success)', secondary: '#fff' },
            },
            error: {
              style: { borderRadius: '1px', borderLeft: '4px solid #dc2626', background: 'var(--color-error-bg)', color: 'var(--color-error-text)' },
              iconTheme: { primary: 'var(--color-error)', secondary: '#fff' },
            },
            loading: {
              style: { borderRadius: '1px', borderLeft: '4px solid #0052D9', background: 'var(--color-bg-soft)', color: 'var(--color-primary-hover)' },
            },
          }}
        />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
