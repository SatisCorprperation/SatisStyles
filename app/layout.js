import "./globals.css";

export const metadata = {
  title: "SatisStyles",
  description: "Build, save, preview, and export a complete CSS stylesheet.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
