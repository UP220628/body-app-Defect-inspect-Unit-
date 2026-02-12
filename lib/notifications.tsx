'use client';

import { createContext, useContext, ReactNode } from 'react';

type NotificationContextType = {
  refreshNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

type NotificationProviderProps = {
  children: ReactNode;
  onRefresh: () => void;
};

export const NotificationProvider = ({ children, onRefresh }: NotificationProviderProps) => {
  return (
    <NotificationContext.Provider value={{ refreshNotifications: onRefresh }}>
      {children}
    </NotificationContext.Provider>
  );
};
