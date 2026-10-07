// ============================================
// GymTrack Pro - Trainer Service
// ============================================
import { supabase } from '../config/supabase';
import { Profile, Attendance, Client } from '../types';

export interface TrainerWithStats extends Profile {
  assignedClientsCount: number;
  todayCheckedIn: boolean;
  todayAttendance?: Attendance;
}

class TrainerService {
  /**
   * Get all trainers with their client counts and today's attendance
   */
  async getAllTrainers(): Promise<TrainerWithStats[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Get all profiles with role = 'trainer'
      const { data: trainers, error: trainersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('full_name', { ascending: true });

      if (trainersError || !trainers) {
        console.error('Error fetching trainers:', trainersError?.message);
        return [];
      }

      // 2. Get client counts per trainer
      const { data: clients } = await supabase
        .from('clients')
        .select('id, assigned_trainer_id');

      const countMap: Record<string, number> = {};
      (clients || []).forEach((c) => {
        if (c.assigned_trainer_id) {
          countMap[c.assigned_trainer_id] = (countMap[c.assigned_trainer_id] || 0) + 1;
        }
      });

      // 3. Get today's attendance for trainers
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .eq('role', 'trainer');

      const attendanceMap: Record<string, Attendance> = {};
      (attendance || []).forEach((a) => {
        attendanceMap[a.profile_id] = a;
      });

      return trainers.map((t) => ({
        ...t,
        assignedClientsCount: countMap[t.id] || 0,
        todayCheckedIn: !!attendanceMap[t.id],
        todayAttendance: attendanceMap[t.id],
      }));
    } catch (err) {
      console.error('Error in getAllTrainers:', err);
      return [];
    }
  }

  /**
   * Get clients assigned to a specific trainer
   */
  async getTrainerClients(trainerProfileId: string): Promise<Client[]> {
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
          membership:memberships(*)
        `)
        .eq('assigned_trainer_id', trainerProfileId);

      if (error || !data) return [];

      return data.map((item: any) => {
        const memberships = Array.isArray(item.membership) ? item.membership : item.membership ? [item.membership] : [];
        const activeMembership = memberships.sort(
          (a: any, b: any) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
        )[0];

        return {
          ...item,
          profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
          membership: activeMembership,
        };
      }) as unknown as Client[];
    } catch (err) {
      console.error('Error in getTrainerClients:', err);
      return [];
    }
  }

  /**
   * Get trainer's own attendance history
   */
  async getTrainerAttendance(trainerProfileId: string): Promise<Attendance[]> {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', trainerProfileId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching trainer attendance:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Error in getTrainerAttendance:', err);
      return [];
    }
  }
}

export const trainerService = new TrainerService();
export default trainerService;
