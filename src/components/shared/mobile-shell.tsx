export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center min-h-screen">
      <div
        className="w-full max-w-[430px] min-h-screen bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
