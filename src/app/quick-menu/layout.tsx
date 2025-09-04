import MainLayout from '@/components/layout/MainLayout';

export default function QuickMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
