import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import ClientLayout from "./components/ClientLayout";
import AlertContainer from "./components/AlertContainer";
import ErrorBoundary from "./components/ErrorBoundary";
import AnalyticsScripts from "./components/AnalyticsScripts";
import AttributionCapture from "./components/AttributionCapture";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bitwavetechnologies.com"),
  // The fallback for any page without its own metadata. Public pages that fell
  // through to it were indexed by Google as "ISP Billing Admin", which tells a
  // searcher (or an answer engine) nothing about what Bitwave is.
  title: "Bitwave Technologies | ISP Billing Software for Kenya",
  description:
    "ISP billing for WiFi hotspots and PPPoE in Kenya: M-Pesa payments, hotspot vouchers and automatic MikroTik configuration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body
        className="antialiased grid-pattern"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <AlertProvider>
            <AuthProvider>
              <AlertContainer />
              <ClientLayout>{children}</ClientLayout>
              <AnalyticsScripts />
              <AttributionCapture />
            </AuthProvider>
          </AlertProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
