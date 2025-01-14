'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const QUOTES = [
  {
    text: "Breathe in peace, breathe out tension",
    author: "Noma"
  },
  {
    text: "The quieter you become, the more you can hear",
    author: "Rumi"
  },
  {
    text: "Peace comes from within",
    author: "Buddha"
  },
  {
    text: "Silence is a source of great strength",
    author: "Lao Tzu"
  },
  {
    text: "In the midst of movement and chaos, keep stillness inside of you",
    author: "Deepak Chopra"
  }
];

export default function QuoteTransition() {
  const router = useRouter();
  const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/meditate');
    }, 5000); // 5 seconds display time

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 p-4">
      <div className="w-full max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center p-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl shadow-xl min-h-[80vh]"
        >
          <div>
            <h1 className="text-4xl font-quicksand font-bold mb-2 text-gray-800 dark:text-white">ZenFlow</h1>
            <p className="text-gray-600 dark:text-gray-300">Find your perfect state of flow</p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-center flex-1 flex flex-col justify-center"
          >
            <p className="text-2xl md:text-3xl lg:text-4xl text-gray-800 dark:text-gray-200 font-light mb-6">
              &ldquo;{randomQuote.text}&rdquo;
            </p>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 italic">
              — {randomQuote.author}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 