import type { Metadata } from 'next';
import { Prompt, Sarabun } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';
import { NotificationProvider } from '@/lib/notification-context';
import MainLayout from '@/components/layout/MainLayout';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-prompt',
  display: 'swap',
});

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'ระบบบริหารจัดการงานแผนงานและโครงการ',
  description: 'Vocational Planning & Project Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${prompt.variable} ${sarabun.variable}`}>
      <body className={`${prompt.className} antialiased bg-slate-100 text-slate-900`}>
        <AuthProvider>
          <SettingsProvider>
            <NotificationProvider>
              <MainLayout>{children}</MainLayout>
            </NotificationProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
