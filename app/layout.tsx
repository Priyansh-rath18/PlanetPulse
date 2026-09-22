import "./globals.css";

export const metadata = {
  title: "Carbon Pulse — Carbon Footprint Tracker",
  description: "Track daily choices and understand your carbon footprint.",
  icons: {
    icon: "/logo.webp",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}