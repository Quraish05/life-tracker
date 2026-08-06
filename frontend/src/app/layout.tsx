import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat, DM_Serif_Display, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Handwriting accent used across the marketing landing (annotations, counters).
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Thyme",
  description: "Track your life, one day at a time.",
};

// Runs before paint to set the theme, so there's no light-then-dark flash.
// Uses the saved choice if any, otherwise the OS preference.
const noFlashTheme = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${dmSerifDisplay.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full flex flex-col font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
