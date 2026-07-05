import type { Metadata } from 'next';
import { getMoments } from '@/lib/blog-api';
import MomentsClient from './MomentsClient';

export const metadata: Metadata = { title: '说说' };

function tagsFromMoments(moments: any[]) {
  const seen = new Set<string>();
  for (const item of moments) {
    const mood = String(item?.mood || '').trim();
    if (mood) seen.add(mood);
    if (seen.size >= 8) break;
  }
  return Array.from(seen);
}

export default async function MomentsPage() {
  try {
    const r: any = await getMoments({ per_page: 50 });
    const moments = Array.isArray(r?.data) ? r.data : [];
    return (
      <MomentsClient
        initialLoaded
        initialMoments={moments}
        initialTags={tagsFromMoments(moments)}
        initialFetchedAt={Date.now()}
      />
    );
  } catch {
    return <MomentsClient />;
  }
}
