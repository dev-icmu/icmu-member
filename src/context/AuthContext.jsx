import { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createAdminAuthController, signedOutState } from '../lib/adminAuth';

export const AuthContext = createContext({
  ...signedOutState,
  login: async () => {},
  logout: async () => {},
  refreshAccess: async () => {},
  loading: true,
  accessLoading: true,
});

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ ...signedOutState, loading: true, accessLoading: true });
  const [controller] = useState(() => createAdminAuthController(supabase, queryClient, setState));

  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  return (
    <AuthContext.Provider value={{ ...state, login: controller.login, logout: controller.logout, refreshAccess: controller.refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
