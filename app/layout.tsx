import type { Metadata } from "next";
import { Quicksand, Caveat, Qwitcher_Grypen } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-quicksand',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
});

const qwitcherGrypen = Qwitcher_Grypen({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-qwitcher',
});

export const metadata: Metadata = {
  title: "ZenFlow",
  description: "Find your flow state through mindful meditation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-quicksand ${quicksand.variable} ${caveat.variable} ${qwitcherGrypen.variable}`}>
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
