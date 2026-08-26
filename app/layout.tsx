import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PCturgus.lt – Kompiuterių dalių ir periferijos skelbimų platforma",
  description: "Pirk ir parduok naudotus bei naujus kompiuterio komponentus ir periferiją Lietuvoje – vaizdo plokštes, procesorius, klaviatūras, peles ir daugiau. Susirask pirkėją ar pardavėją tiesiogiai.",
  openGraph: {
    title: "PCturgus.lt – Kompiuterių dalių ir periferijos skelbimų platforma",
    description: "Pirk ir parduok naudotus bei naujus kompiuterio komponentus ir periferiją Lietuvoje.",
    url: "https://pcturgus.lt",
    siteName: "PCturgus.lt",
    locale: "lt_LT",
    type: "website",
  },
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
            <body className={...}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
