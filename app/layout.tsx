import type { Metadata, Viewport } from 'next';
import {
  Space_Grotesk,
  Instrument_Serif,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const APP_BASE_URL = process.env.APP_URL?.replace(/\/+$/, '') || 'https://crosx.in';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#05060B' },
    { media: '(prefers-color-scheme: light)', color: '#F5F3EE' },
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

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('crosx-theme'),d=s?s==='dark':true,r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${instrumentSerif.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[#2544E8] selection:text-white overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
