import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@config/site";
import { BottomNav, TopBar } from "@/components/Chrome";
import { StaffProvider } from "@/components/StaffProvider";
import { ToastProvider } from "@/components/Toast";
import { getActiveStaff } from "@/lib/data";
import type { Staff } from "@/lib/types";
import "./globals.css";

export const dynamic = "force-dynamic";

const bricolage = localFont({
  src: "../fonts/BricolageGrotesque-latin.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
});

export const metadata: Metadata = {
  title: "Bedrock Snack Attack 🍿",
  description: "Request snacks for the Bedrock staff retreat.",
  appleWebApp: { capable: true, title: "Snack Attack", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7931e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let staff: Staff[] | null = null;
  try {
    staff = await getActiveStaff();
  } catch (err) {
    console.error("Could not load staff from the database:", err);
  }

  return (
    <html lang="en" className={bricolage.variable}>
      <body className="min-h-dvh font-sans">
        {staff ? (
          <StaffProvider staff={staff}>
            <ToastProvider>
              <TopBar />
              <main className="pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>
              <BottomNav />
            </ToastProvider>
          </StaffProvider>
        ) : (
          <SetupProblem />
        )}
      </body>
    </html>
  );
}

function SetupProblem() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="text-[56px]" aria-hidden>
        🥨
      </div>
      <h1 className="heading mt-2 text-[34px]">The snack database is out to lunch.</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
        {SITE.title} can&apos;t reach PostgreSQL right now. If you&apos;re the organizer, check that{" "}
        <code className="rounded bg-brand-soft px-1">DATABASE_URL</code> is set on the Railway service and the Postgres
        service is running, then redeploy. Everyone else: refresh in a minute.
      </p>
    </main>
  );
}
