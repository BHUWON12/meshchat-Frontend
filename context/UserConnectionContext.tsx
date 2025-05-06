import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/index';

interface UserConnectionContextType {
  userConnections: User[];
  addUserConnection: (user: User) => Promise<void>;
  removeUserConnection: (userId: string) => void;
}

const UserConnectionContext = createContext<UserConnectionContextType | undefined>(undefined);

export function UserConnectionProvider({ children }: { children: ReactNode }) {
  const [userConnections, setUserConnections] = useState<User[]>([]);

  useEffect(() => {
    const loadConnections = async () => {
      const saved = await AsyncStorage.getItem('user-connections');
      if (saved) setUserConnections(JSON.parse(saved));
    };
    loadConnections();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('user-connections', JSON.stringify(userConnections));
  }, [userConnections]);

  const addUserConnection = async (user: User) => {
    if (!userConnections.some(u => u.id === user.id)) {
      setUserConnections(prev => [...prev, user]);
    }
  };

  const removeUserConnection = (userId: string) => {
    setUserConnections(prev => prev.filter(u => u.id !== userId));
  };

  return (
    <UserConnectionContext.Provider value={{ userConnections, addUserConnection, removeUserConnection }}>
      {children}
    </UserConnectionContext.Provider>
  );
}

export const useUserConnections = () => {
  const context = useContext(UserConnectionContext);
  if (!context) throw new Error('useUserConnections must be used within UserConnectionProvider');
  return context;
};
