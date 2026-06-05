export default function MobileLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">

      <main className="flex-1">
        {children}
      </main>

    </div>
  );
}
