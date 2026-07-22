import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-cream via-cream to-lilac/40">
        {children}
      </main>
    </div>
  );
}
