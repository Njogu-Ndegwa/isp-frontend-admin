'use client';

import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

export default function AnalyticsScripts() {
  return (
    <>
      <Script
        src="https://t.contentsquare.net/uxa/b7ccccb30429d.js"
        strategy="lazyOnload"
      />
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
      <Analytics />
    </>
  );
}
