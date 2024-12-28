'use client';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center p-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900 rounded-3xl shadow-xl">
        {children}
      </div>
    </div>
  );
} 