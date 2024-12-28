'use client';

import dynamic from 'next/dynamic';

const MeditationTimer = dynamic(
  () => import('./MeditationTimer'),
  { ssr: false }
);

export default function ClientMeditationTimer() {
  return <MeditationTimer />;
} 