import MainLayout from '@/components/layout/MainLayout';

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
