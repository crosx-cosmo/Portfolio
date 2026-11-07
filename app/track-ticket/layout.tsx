import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Ticket Portal',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

export default function TrackTicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
