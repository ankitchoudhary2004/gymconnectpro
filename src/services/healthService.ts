// ============================================
// GymTrack Pro - Health Records Service
// ============================================
import { supabase } from '../config/supabase';
import { HealthRecord } from '../types';

class HealthService {
  /**
   * Fetch all health records for a client, sorted newest first
   */
  async getHealthRecords(clientId: string): Promise<HealthRecord[]> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Error fetching health records:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getHealthRecords:', err);
      return [];
    }
  }

  /**
   * Get the most recent health record for a client
   */
  async getLatestHealthRecord(clientId: string): Promise<HealthRecord | null> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return data as HealthRecord;
    } catch (err) {
      console.error('Error in getLatestHealthRecord:', err);
      return null;
    }
  }

  /**
   * Add a new health measurement record
   */
  async addHealthRecord(
    record: Omit<HealthRecord, 'id' | 'recorded_at' | 'bmi'> & { bmi?: number | null }
  ): Promise<HealthRecord | null> {
    try {
      let computedBmi = record.bmi;
      if (!computedBmi && record.weight_kg && record.height_cm) {
        const heightMeters = record.height_cm / 100;
        computedBmi = parseFloat((record.weight_kg / (heightMeters * heightMeters)).toFixed(1));
      }

      const { data, error } = await supabase
        .from('health_records')
        .insert({
          ...record,
          bmi: computedBmi,
          recorded_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error adding health record:', error.message);
        return null;
      }

      return data as HealthRecord;
    } catch (err) {
      console.error('Error in addHealthRecord:', err);
      return null;
    }
  }
}

export const healthService = new HealthService();
export default healthService;
