import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Console',
  description: '',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': 0,
      'max-image-preview': 'none',
    },
  },
  openGraph: null,
  twitter: null,
  alternates: {},
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
