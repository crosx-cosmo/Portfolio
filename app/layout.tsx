import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/geist-latin.woff2',
  weight: '400 900',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  weight: '400 700',
  variable: '--font-geist-mono',
  display: 'swap',
});

const instrumentSerif = localFont({
  src: [
    {
      path: './fonts/instrument-serif-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/instrument-serif-italic.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const APP_BASE_URL = process.env.APP_URL?.replace(/\/+$/, '') || 'https://crosx.in';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)', color: '#090909' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: {
    default: 'CROSX DEV STUDIO — Digital Product & Software Engineering',
    template: '%s | CROSX DEV STUDIO',
  },
  description:
    'CROSX DEV STUDIO, founded by IRON CLAD, builds custom Websites, SaaS Web Apps, NestJS + Neon PostgreSQL Backends, and React Native + Expo Mobile Apps.',
  applicationName: 'CROSX DEV STUDIO',
  authors: [{ name: 'IRON CLAD', url: 'https://crosx.in' }],
  creator: 'IRON CLAD',
  publisher: 'CROSX DEV STUDIO',
  category: 'technology',
  keywords: [
    'CROSX DEV STUDIO',
    'IRON CLAD',
    'Senior Project Developer',
    'Full-Stack Software Engineering Studio',
    'Next.js Web Development',
    'React Native Expo Mobile Apps',
    'NestJS PostgreSQL Neon DB',
    'Custom SaaS Development',
    'crosx.in',
    'rca.crosx.in',
    'sohanpipeline.in',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_BASE_URL,
    siteName: 'CROSX DEV STUDIO',
    title: 'CROSX DEV STUDIO — Digital Product & Software Engineering',
    description:
      'CROSX DEV STUDIO, founded by IRON CLAD, builds custom Websites, SaaS Web Apps, NestJS + Neon PostgreSQL Backends, and React Native + Expo Mobile Apps.',
    images: [
      {
        url: '/projects/crosx-live.png',
        width: 1200,
        height: 630,
        alt: 'CROSX DEV STUDIO — Founded by IRON CLAD',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CROSX DEV STUDIO — Digital Product & Software Engineering',
    description:
      'CROSX DEV STUDIO, founded by IRON CLAD, builds custom Websites, SaaS Web Apps, NestJS + Neon PostgreSQL Backends, and React Native + Expo Mobile Apps.',
    images: ['/projects/crosx-live.png'],
  },
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('crosx-theme'),d=s?s==='dark':false,r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans antialiased selection:bg-[#FF4B1F] selection:text-white overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
