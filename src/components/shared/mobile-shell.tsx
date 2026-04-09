export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center h-dvh">
      <div
        className="w-full max-w-[430px] h-dvh bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
