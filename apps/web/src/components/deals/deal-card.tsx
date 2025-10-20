'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Calendar,
  User,
  MoreHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

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

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onClick?: (deal: Deal) => void;
}

export function DealCard({ deal, isDragging, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getInitials = (firstName: string, lastName?: string) => {
    return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getContactName = (contact: Deal['contact']) => {
    return `${contact.firstName} ${contact.lastName || ''}`.trim();
  };

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getStageColor = (stage: string) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-800',
      qualified: 'bg-blue-100 text-blue-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      won: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const isWonOrLost = deal.stage === 'won' || deal.stage === 'lost';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      onClick={() => onClick?.(deal)}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm line-clamp-2">{deal.title}</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>

          {/* Value */}
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {formatCurrency(deal.valueCents, deal.currency)}
            </span>
            {isWonOrLost && (
              <div className="flex items-center">
                {deal.stage === 'won' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(deal.contact.firstName, deal.contact.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {getContactName(deal.contact)}
            </span>
          </div>

          {/* Stage Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant="secondary" 
              className={`text-xs ${getStageColor(deal.stage)}`}
            >
              {deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1)}
            </Badge>
            
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(deal.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
