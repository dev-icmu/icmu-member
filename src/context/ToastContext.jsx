import React, { createContext, useContext } from 'react';
import { useAnimatedToastStack, AnimatedToastStack } from '../components/motion/animated-toast-stack';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const toastAPI = useAnimatedToastStack({ maxVisible: 3 });

  return (
    <ToastContext.Provider value={toastAPI}>
      {children}
      <AnimatedToastStack
        toasts={toastAPI.toasts}
        onDismiss={toastAPI.dismissToast}
        position="bottom-center"
        fixed
        maxVisible={3}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    addToast: ({ message, type }) => {
      context.showToast({
        title: message,
        status: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
      });
    }
  };
}
