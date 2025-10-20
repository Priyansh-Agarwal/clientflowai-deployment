'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/posthog';

interface Organization {
  id: string;
  name: string;
  memberships: Array<{
    role: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }>;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  loading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrgs = async () => {
    if (!user) return;

    try {
      const response = await api.getOrganizations();
      setOrganizations(response.data);
      
      // Set current org if not already set
      if (!currentOrg && response.data.length > 0) {
        setCurrentOrg(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshOrgs();
    } else {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
    }
  }, [user]);

  const switchOrg = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      trackEvent('organization_switched', { orgId, userId: user?.id });
    }
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        loading,
        switchOrg,
        refreshOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};
