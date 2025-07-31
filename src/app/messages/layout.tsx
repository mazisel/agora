import { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';

export const metadata: Metadata = {
  title: 'Mesajlar - Ekip Yönetim Sistemi',
  description: 'Ekip üyeleriyle gerçek zamanlı mesajlaşma',
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}
