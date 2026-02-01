export const MainWrap = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex flex-col items-center">
      <div id="portal-root-0"></div>
      {children}
    </main>
  );
};
