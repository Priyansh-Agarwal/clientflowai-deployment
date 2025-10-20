'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Building2, Plus } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (org: Organization) => void;
}

export function OrganizationSelector({ onOrganizationChange }: OrganizationSelectorProps) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    try {
      const response = await apiClient.getMe();
      if (response.success && response.data) {
        const orgs = response.data.memberships.map((membership: any) => ({
          id: membership.orgId,
          name: membership.org.name,
          role: membership.role,
        }));
        setOrganizations(orgs);
        
        // Set current org
        const current = response.data.currentOrg;
        const currentOrgData = {
          id: current.id,
          name: current.name,
          role: orgs.find(org => org.id === current.id)?.role || 'member',
        };
        setCurrentOrg(currentOrgData);
        onOrganizationChange?.(currentOrgData);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationChange = (org: Organization) => {
    setCurrentOrg(org);
    onOrganizationChange?.(org);
    // TODO: Update API client with new org context
  };

  const handleInviteMembers = () => {
    // TODO: Open invite members modal
    console.log('Invite members clicked');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">No organization</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">{currentOrg.name}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleOrganizationChange(org)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-gray-500 capitalize">{org.role}</span>
              </div>
              {org.id === currentOrg.id && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={handleInviteMembers} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Invite Members</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
