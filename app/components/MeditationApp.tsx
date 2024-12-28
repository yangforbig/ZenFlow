'use client';

import { Suspense } from 'react';
import MeditationTimer from './MeditationTimer';

export default function MeditationApp() {
  return (
    <Suspense fallback={
      <>
        <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">ZenFlow</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">Loading your peaceful space...</p>
      </>
    }>
      <MeditationTimer />
    </Suspense>
  );
} 