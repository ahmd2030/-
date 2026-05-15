import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "فاتورتي الذكية | Smart Invoice Analyst",
  description: "محلل فواتير احترافي مدعوم بالذكاء الاصطناعي لاستخراج البيانات بدقة متناهية.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} antialiased`}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

