// ============================================
// GymTrack Pro - Client Service
// ============================================
import { supabase } from '../config/supabase';
import { Client, MembershipPlanType, MembershipStatus } from '../types';

class ClientService {
  /**
   * Fetch all clients with their profile, active membership, and assigned trainer
   */
  async getAllClients(query?: string, statusFilter?: MembershipStatus | 'all'): Promise<Client[]> {
    try {
      let req = supabase
        .from('clients')
        .select(`
          id,
          profile_id,
          gym_id,
          emergency_contact_name,
          emergency_contact_phone,
          medical_conditions,
          allergies,
          assigned_trainer_id,
          created_at,
          profile:profiles!clients_profile_id_fkey(*),
          trainer:profiles!clients_assigned_trainer_id_fkey(*),
          membership:memberships(*)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await req;

      if (error) {
        console.error('Error fetching clients:', error.message);
        return [];
      }

      let clients = (data || []).map((item: any) => {
        // Memberships might be an array, take the active or latest one
        const memberships = Array.isArray(item.membership) ? item.membership : item.membership ? [item.membership] : [];
        const activeMembership = memberships.sort(
          (a: any, b: any) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
        )[0];

        return {
          ...item,
          membership: activeMembership,
        };
      }) as Client[];

      // Filter by search query if provided
      if (query && query.trim()) {
        const q = query.toLowerCase().trim();
        clients = clients.filter(
          (c) =>
            c.profile?.full_name?.toLowerCase().includes(q) ||
            c.profile?.email?.toLowerCase().includes(q) ||
            c.profile?.phone?.toLowerCase().includes(q)
        );
      }

      // Filter by status if provided
      if (statusFilter && statusFilter !== 'all') {
        clients = clients.filter((c) => c.membership?.status === statusFilter);
      }

      return clients;
    } catch (err) {
      console.error('Error in getAllClients:', err);
      return [];
    }
  }

  /**
   * Get single client by client ID
   */
  async getClientById(clientId: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          profile_id,
          gym_id,
          emergency_contact_name,
          emergency_contact_phone,
          medical_conditions,
          allergies,
          assigned_trainer_id,
          created_at,
          profile:profiles!clients_profile_id_fkey(*),
          trainer:profiles!clients_assigned_trainer_id_fkey(*),
          membership:memberships(*)
        `)
        .eq('id', clientId)
        .single();

      if (error || !data) return null;

      const memberships = Array.isArray(data.membership) ? data.membership : data.membership ? [data.membership] : [];
      const activeMembership = memberships.sort(
        (a: any, b: any) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
      )[0];

      return {
        ...data,
        profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
        trainer: Array.isArray(data.trainer) ? data.trainer[0] : data.trainer,
        membership: activeMembership,
      } as unknown as Client;
    } catch (err) {
      console.error('Error in getClientById:', err);
      return null;
    }
  }

  /**
   * Assign or unassign a trainer to a client
   */
  async assignTrainer(clientId: string, trainerProfileId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ assigned_trainer_id: trainerProfileId })
        .eq('id', clientId);

      if (error) {
        console.error('Error assigning trainer:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception assigning trainer:', err);
      return false;
    }
  }

  /**
   * Create or update membership for a client
   */
  async assignMembership(
    clientId: string,
    planType: MembershipPlanType,
    durationMonths: number
  ): Promise<boolean> {
    try {
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

      const { error } = await supabase.from('memberships').insert({
        client_id: clientId,
        plan_type: planType,
        start_date: startDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        status: 'active',
      });

      if (error) {
        console.error('Error assigning membership:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception assigning membership:', err);
      return false;
    }
  }

  /**
   * Update emergency contact details
   */
  async updateEmergencyContact(
    clientId: string,
    name: string,
    phone: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          emergency_contact_name: name,
          emergency_contact_phone: phone,
        })
        .eq('id', clientId);

      return !error;
    } catch (err) {
      console.error('Error updating emergency contact:', err);
      return false;
    }
  }

  /**
   * Register a new member with profile, client details, and initial plan
   */
  async registerNewMember(params: {
    fullName: string;
    email: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    medicalConditions?: string[];
    allergies?: string[];
    assignedTrainerId?: string | null;
    initialPlan?: MembershipPlanType;
    durationMonths?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const tempPassword = 'Gym_' + Math.random().toString(36).substring(2, 10) + '2026!';
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: params.email,
        password: tempPassword,
        options: {
          data: {
            full_name: params.fullName,
            role: 'client',
          },
        },
      });

      let userId = authData.user?.id;
      if (authErr || !userId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', params.email)
          .single();

        if (existingProfile) {
          userId = existingProfile.id;
        } else {
          return { success: false, error: authErr?.message || 'Failed to create user account' };
        }
      }

      await supabase.from('profiles').upsert({
        id: userId,
        role: 'client',
        full_name: params.fullName,
        email: params.email,
        phone: params.phone || null,
      });

      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .upsert(
          {
            profile_id: userId,
            emergency_contact_name: params.emergencyContactName || null,
            emergency_contact_phone: params.emergencyContactPhone || null,
            medical_conditions: params.medicalConditions || [],
            allergies: params.allergies || [],
            assigned_trainer_id: params.assignedTrainerId || null,
          },
          { onConflict: 'profile_id' }
        )
        .select()
        .single();

      if (clientErr || !client) {
        return { success: false, error: clientErr?.message || 'Failed to create client profile' };
      }

      if (params.initialPlan && params.durationMonths) {
        await this.assignMembership(client.id, params.initialPlan, params.durationMonths);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error in registerNewMember:', err);
      return { success: false, error: err.message || 'Unexpected registration error' };
    }
  }
}

export const clientService = new ClientService();
export default clientService;
