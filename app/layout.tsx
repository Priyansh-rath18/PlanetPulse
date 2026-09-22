import "./globals.css";

export const metadata = {
  title: "CarbonTrack — Personal Climate Dashboard",
  description: "Track your carbon footprint, make better choices, and build a greener tomorrow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
