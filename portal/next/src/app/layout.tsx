export default function RootLayout({ children }: {children: React.ReactNode}) {
  return (
    <html lang="zh">
      <body style={{maxWidth: 760, margin: "0 auto", fontFamily: "system-ui"}}>{children}</body>
    </html>
  );
}
