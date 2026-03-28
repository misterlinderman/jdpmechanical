import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl text-[var(--text)]">{children}</main>
      <footer className="bg-[var(--surface)] border-t border-[var(--border)] py-6">
        <div className="container mx-auto px-4 text-center text-[var(--muted)] text-sm">
          <p>&copy; {new Date().getFullYear()} JDP Mechanical · FPB Tracker</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
