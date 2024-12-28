'use client';

import { useState, useEffect } from 'react';
import MeditationTimer from './MeditationTimer';

export default function ClientWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center p-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl shadow-xl">
          <h1 className="text-4xl font-bold mb-2 text-gray-800 dark:text-white">ZenFlow</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Loading your peaceful space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center p-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl shadow-xl">
        <MeditationTimer />
      </div>
    </div>
  );
} 