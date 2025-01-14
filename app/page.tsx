'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 flex flex-col items-center justify-center p-4 text-center"
    >
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/quote" 
          className="inline-block w-[240px] px-8 py-4 text-2xl md:text-3xl lg:text-5xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 transition-all duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className="inline-block w-full transition-all duration-300">
            {isHovered ? "Go Zen" : "ZenFlow"}
          </span>
        </Link>
        <p className="text-xl md:text-2xl mt-8 mb-8 text-gray-700 dark:text-gray-300">
          Find your perfect state of flow
        </p>
      </div>
      <div className="flex items-baseline gap-2 text-gray-600 dark:text-gray-400">
        <span className="font-caveat">by</span>
        <div className="relative group">
          <a 
            href="https://x.com/nomapoet" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-qwitcher text-3xl hover:text-blue-500 transition-colors"
          >
            Noma<span className="text-base"> 👋</span>
          </a>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            Say Hi
          </div>
        </div>
      </div>
    </motion.main>
  );
}
