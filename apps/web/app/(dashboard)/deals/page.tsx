'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  DollarSign, 
  Calendar,
  User,
  MoreHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useOrg } from '@/components/org/org-provider';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/posthog';
import { DealCard } from '@/components/deals/deal-card';
import { DealColumn } from '@/components/deals/deal-column';

interface Deal {
  id: string;
  title: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'won' | 'lost';
  valueCents: number;
  currency: string;
  contact: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { id: 'lead', name: 'Lead', color: 'bg-gray-100' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-100' },
  { id: 'proposal', name: 'Proposal', color: 'bg-yellow-100' },
  { id: 'won', name: 'Won', color: 'bg-green-100' },
  { id: 'lost', name: 'Lost', color: 'bg-red-100' },
] as const;

export default function DealsPage() {
  const { currentOrg } = useOrg();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadDeals();
    }
  }, [currentOrg]);

  const loadDeals = async () => {
    if (!currentOrg) return;

    try {
      setLoading(true);
      const response = await api.getDeals({ orgId: currentOrg.id });
      setDeals(response.data);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveDeal(null);
      return;
    }

    const dealId = active.id as string;
    const newStage = over.id as string;

    // Optimistic update
    setDeals(prev => 
      prev.map(deal => 
        deal.id === dealId ? { ...deal, stage: newStage as any } : deal
      )
    );

    try {
      // Update deal stage
      await api.updateDeal(dealId, { stage: newStage });
      
      // Track event
      const deal = deals.find(d => d.id === dealId);
      if (deal) {
        trackEvent('deal_stage_changed', {
          dealId,
          fromStage: deal.stage,
          toStage: newStage,
          orgId: currentOrg?.id
        });
      }
    } catch (error) {
      console.error('Failed to update deal stage:', error);
      // Revert optimistic update
      loadDeals();
    }

    setActiveDeal(null);
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getTotalValue = (stage: string) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + deal.valueCents, 0) / 100;
  };

  const getDealCount = (stage: string) => {
    return getDealsByStage(stage).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
            <p className="text-muted-foreground">
              Track your sales pipeline
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80">
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-24 w-full" />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Track your sales pipeline
          </p>
        </div>
        <Button onClick={() => trackEvent('deal_created', { orgId: currentOrg?.id })}>
          <Plus className="mr-2 h-4 w-4" />
          New Deal
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {STAGES.map((stage) => (
          <Card key={stage.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stage.name}
                  </p>
                  <p className="text-2xl font-bold">
                    {getDealCount(stage.id)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ${getTotalValue(stage.id).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Value
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={getDealsByStage(stage.id)}
              onDealClick={(deal) => {
                // Handle deal click - could open detail modal
                console.log('Deal clicked:', deal);
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
