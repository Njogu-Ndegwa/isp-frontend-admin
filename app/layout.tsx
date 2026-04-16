import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import ClientLayout from "./components/ClientLayout";
import AlertContainer from "./components/AlertContainer";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemeProvider from "./components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ISP Billing Admin | Bitwave Technologies",
  description: "Manage your ISP billing, customers, plans, and transactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://t.contentsquare.net/uxa/b7ccccb30429d.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased grid-pattern`}
        suppressHydrationWarning
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XQQZTHB95N"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XQQZTHB95N');
          `}
        </Script>
        <ErrorBoundary>
          <ThemeProvider>
            <AlertProvider>
              <AuthProvider>
                <AlertContainer />
                <ClientLayout>{children}</ClientLayout>
              </AuthProvider>
            </AlertProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
