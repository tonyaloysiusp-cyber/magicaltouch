export const metadata = {
  title: "Magical Touch",
  description: "Design. Edit. Create. Add the Magical Touch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
