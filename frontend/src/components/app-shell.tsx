'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/employees', label: 'Employees', icon: '♙' },
  { href: '/competencies', label: 'Competencies', icon: '◇' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const desktopAccountMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);
  const drawerCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function closeAccountMenu(event: MouseEvent) {
      const target = event.target as Node;
      if (!desktopAccountMenuRef.current?.contains(target) && !mobileAccountMenuRef.current?.contains(target)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', closeAccountMenu);
    return () => document.removeEventListener('mousedown', closeAccountMenu);
  }, []);

  useEffect(() => {
    closeMobileDrawer();
  }, [pathname]);

  useEffect(() => {
    function closeMobileDrawer(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileDrawerOpen(false);
    }

    document.addEventListener('keydown', closeMobileDrawer);
    return () => document.removeEventListener('keydown', closeMobileDrawer);
  }, []);

  useEffect(() => () => {
    if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
  }, []);

  function openMobileDrawer() {
    if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
    setMobileDrawerVisible(true);
    requestAnimationFrame(() => setMobileDrawerOpen(true));
  }

  function closeMobileDrawer() {
    setMobileDrawerOpen(false);
    if (drawerCloseTimerRef.current) clearTimeout(drawerCloseTimerRef.current);
    drawerCloseTimerRef.current = setTimeout(() => setMobileDrawerVisible(false), 200);
  }

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <Link className="brand-mark mobile-brand" href="/dashboard" aria-label="HRIS dashboard">
          <span className="brand-icon">H</span><span>HRIS</span>
        </Link>
        <button
          className="mobile-menu-trigger"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileDrawerOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={openMobileDrawer}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </header>
      {mobileDrawerVisible && (
        <div className={`drawer-root ${mobileDrawerOpen ? 'drawer-root-open' : ''}`}>
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileDrawer}
          />
          <aside id="mobile-navigation-drawer" className="drawer" aria-label="Main navigation">
            <button
              className="drawer-close"
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMobileDrawer}
            >
              <span aria-hidden="true">×</span>
            </button>
            <Navigation accountMenuRef={mobileAccountMenuRef} />
          </aside>
        </div>
      )}
      <aside className="sidebar">
        <Navigation accountMenuRef={desktopAccountMenuRef} />
      </aside>
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );

  function Navigation({ accountMenuRef }: { accountMenuRef: React.RefObject<HTMLDivElement | null> }) {
    return (
      <>
        <Link className="brand-mark sidebar-brand" href="/dashboard" aria-label="HRIS dashboard">
          <span className="brand-icon">H</span><span>HRIS</span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              className={`nav-link ${pathname.startsWith(link.href) ? 'nav-link-active' : ''}`}
              href={link.href}
            >
              <span className="nav-icon" aria-hidden="true">{link.icon}</span>
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer" ref={accountMenuRef}>
          <div className="account-summary">
            <span className="avatar sidebar-avatar" aria-hidden="true">A</span>
            <span className="account-name">Administrator</span>
            <button
              className="account-menu-trigger"
              type="button"
              aria-label="Open account menu"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">⋮</span>
            </button>
          </div>
          {accountMenuOpen && (
            <div className="account-menu" role="menu">
              <button
                className="account-menu-item"
                type="button"
                role="menuitem"
                onClick={logout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }
}
