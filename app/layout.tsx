import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import ClientLayout from "./components/ClientLayout";
import AlertContainer from "./components/AlertContainer";
import ErrorBoundary from "./components/ErrorBoundary";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bitwavetechnologies.com"),
  title: "ISP Billing Admin | Bitwave Technologies",
  description: "Manage your ISP billing, customers, plans, and transactions",
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
            </AuthProvider>
          </AlertProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
