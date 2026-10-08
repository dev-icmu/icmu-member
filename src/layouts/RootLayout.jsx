import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ScrollToAnchor } from '../components/common/ScrollToAnchor';
import { PageLoader } from '../components/common/PageLoader';

/**
 * Root Application Layout
 * Provides Auth context, Toast context, smooth hash scrolling, and Suspense fallback.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  const isPortfolio = pathname === '/' || pathname === '/home';

  return (
    <AuthProvider>
      <ToastProvider>
        <ScrollToAnchor />
        <Suspense fallback={isPortfolio ? <div role="status" aria-label="Opening ICMU" style={{ minHeight: '100svh', background: '#050706' }} /> : <PageLoader />}>
          <Outlet />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}

export default RootLayout;
