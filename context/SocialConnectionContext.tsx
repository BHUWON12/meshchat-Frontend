import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as contactsApi from '../services/contacts';
import { User } from '../types/index';
import { useAuth } from './AuthContext';  

interface Connection {
  _id: string;
  requester: User;
  recipient: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface SocialConnectionContextType {
  accepted: Connection[];
  pendingReceived: Connection[];
  pendingSent: Connection[];
  loading: boolean;
  fetchConnections: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  respondRequest: (requestId: string, action: 'accept' | 'reject') => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeConnection: (connectionId: string) => Promise<void>;
}

const SocialConnectionContext = createContext<SocialConnectionContextType | undefined>(undefined);

export function SocialConnectionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await contactsApi.getConnections();
      setAccepted(data.accepted || []);
      setPendingReceived(data.pendingReceived || []);
      setPendingSent(data.pendingSent || []);
    } catch (e) {
      console.error('Failed to fetch connections', e);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId: string) => {
    await contactsApi.sendConnectionRequest(userId);
    await fetchConnections();
  };

  const respondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    await contactsApi.respondToRequest(requestId, action);
    await fetchConnections();
  };

  const cancelRequest = async (requestId: string) => {
    await contactsApi.cancelConnectionRequest(requestId);
    await fetchConnections();
  };

  const removeConnection = async (connectionId: string) => {
    await contactsApi.removeConnection(connectionId);
    await fetchConnections();
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  return (
    <SocialConnectionContext.Provider
      value={{
        accepted,
        pendingReceived,
        pendingSent,
        loading,
        fetchConnections,
        sendRequest,
        respondRequest,
        cancelRequest,
        removeConnection,
      }}
    >
      {children}
    </SocialConnectionContext.Provider>
  );
}

export function useSocialConnections() {
  const context = useContext(SocialConnectionContext);
  if (!context) {
    throw new Error('useSocialConnections must be used within SocialConnectionProvider');
  }
  return context;
}
