import { createServerFn } from '@tanstack/react-start';
import { loadStartThemeContextDirect } from './theme';

export const loadStartDocument = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    return await loadStartThemeContextDirect();
  } catch (error) {
    console.error('Unable to load Start document context:', error);
    return null;
  }
});
