import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { Registration } from '../types';

interface UserContextType {
  user: Registration | null;
  setUser: (user: Registration | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUserState] = useState<Registration | null>(() => {
    try {
      const storedUser = localStorage.getItem('salesConferenceUser');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('salesConferenceUser');
    }
    return null;
  });

  React.useEffect(() => {
    setIsLoading(false);
  }, []);

  const setUser = (userData: Registration | null) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem('salesConferenceUser', JSON.stringify(userData));
    } else {
      localStorage.removeItem('salesConferenceUser');
    }
  };
  
  const value = useMemo(() => ({ user, setUser, isLoading }), [user, isLoading]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};