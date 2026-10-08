import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/**
 * App Root Component
 * Centralized modern React Router via createBrowserRouter with:
 * - Centralized route configuration (routes array in src/router/index.jsx)
 * - Code splitting with React.lazy() & Suspense
 * - Protected private routes (PrivateRoute for /roster)
 * - Dynamic 404 & error fallback (path: "*")
 * - Simple layout nesting (ShowcaseLayout for /showcase/*)
 */
export default function App() {
  return <RouterProvider router={router} />;
}
