import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved day/night theme before the first paint, on
            every page, so nothing flashes in the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('appTheme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className={poppins.className}>{children}</body>
    </html>
  );
}
