import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicOS',
  description: 'Nền tảng điều hành an ninh, trật tự cho Công an xã Nghĩa Trụ.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
