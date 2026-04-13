import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import "./app.css"
import AuthProvider from "@/app/_components/SessionProvider"
import Navbar from "@/app/_components/Navbar"
import Footer from "@/app/_components/Footer"
import ThemeProvider from "@/app/_components/ThemeProvider"
import CookieBanner from "@/app/_components/CookieBanner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Goodplay",
  description: "Review site for games",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t=localStorage.getItem('theme')||'dark';
            document.documentElement.setAttribute('data-theme',t);
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <Navbar />
              {children}
            <Footer />
            <CookieBanner />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
