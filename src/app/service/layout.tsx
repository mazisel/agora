import MainLayout from '@/components/layout/MainLayout';

export default function ServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
