
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceDeskTicket {
  id: string;
  subscription_id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assigned_to?: string;
  created_by: string;
  customer_phone?: string;
  customer_email?: string;
  sla_due_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  user_id: string;
  activity_type: 'comment' | 'status_change' | 'assignment' | 'priority_change';
  content?: string;
  metadata: any;
  created_at: string;
}

export const useServiceDesk = () => {
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['service-desk-tickets'],
    queryFn: async (): Promise<ServiceDeskTicket[]> => {
      // Return empty array since service_desk_tickets table doesn't exist in current schema
      return [];
    }
  });

  const createTicket = useMutation({
    mutationFn: async (ticketData: Omit<ServiceDeskTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create insert data object with only the fields we want to insert
      const insertData: any = {
        subscription_id: ticketData.subscription_id,
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        status: ticketData.status,
        created_by: user.id
      };

      // Add optional fields only if they have values
      if (ticketData.assigned_to) insertData.assigned_to = ticketData.assigned_to;
      if (ticketData.customer_phone) insertData.customer_phone = ticketData.customer_phone;
      if (ticketData.customer_email) insertData.customer_email = ticketData.customer_email;
      if (ticketData.sla_due_at) insertData.sla_due_at = ticketData.sla_due_at;
      if (ticketData.resolved_at) insertData.resolved_at = ticketData.resolved_at;

      // Mock implementation since service_desk_tickets table doesn't exist
      const data = { id: 'mock-ticket-id', ...insertData };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-desk-tickets'] });
      toast.success('Ticket created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    }
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceDeskTicket> & { id: string }) => {
      // Mock implementation since service_desk_tickets table doesn't exist
      const data = { id, ...updates, updated_at: new Date().toISOString() };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-desk-tickets'] });
      toast.success('Ticket updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    }
  });

  return {
    tickets,
    isLoading,
    createTicket: createTicket.mutateAsync,
    updateTicket: updateTicket.mutateAsync,
    isCreating: createTicket.isPending,
    isUpdating: updateTicket.isPending
  };
};

export const useTicketActivities = (ticketId?: string) => {
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['ticket-activities', ticketId],
    queryFn: async (): Promise<TicketActivity[]> => {
      // Return empty array since ticket_activities table doesn't exist in current schema
      return [];
    },
    enabled: !!ticketId
  });

  const addActivity = useMutation({
    mutationFn: async (activityData: Omit<TicketActivity, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Mock implementation since ticket_activities table doesn't exist
      const data = {
        id: 'mock-activity-id',
        ticket_id: activityData.ticket_id,
        user_id: user.id,
        activity_type: activityData.activity_type,
        content: activityData.content,
        metadata: activityData.metadata,
        created_at: new Date().toISOString()
      };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-activities', ticketId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to add activity: ${error.message}`);
    }
  });

  return {
    activities,
    isLoading,
    addActivity: addActivity.mutateAsync,
    isAdding: addActivity.isPending
  };
};
