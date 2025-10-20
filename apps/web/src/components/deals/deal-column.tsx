'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DealCard } from './deal-card';

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

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface DealColumnProps {
  stage: Stage;
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
}

export function DealColumn({ stage, deals, onDealClick }: DealColumnProps) {
  const dealIds = deals.map(deal => deal.id);

  return (
    <div className="flex-shrink-0 w-80">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
              <CardDescription>
                {deals.length} deal{deals.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={onDealClick}
              />
            ))}
          </SortableContext>
          
          {deals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No deals in this stage</p>
              <Button variant="ghost" size="sm" className="mt-2">
                <Plus className="mr-1 h-3 w-3" />
                Add Deal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
