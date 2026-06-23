import { AppSidebar, MobileBottomNav } from "@/components/layout/app-sidebar";
import { getAccountContext } from "@/lib/auth-context";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { accountEmail } = await getAccountContext();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar accountEmail={accountEmail} />
      <div className="md:pl-72">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-10">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
