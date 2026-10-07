// ============================================
// GymTrack Pro - Routine Service
// ============================================
import { supabase } from '../config/supabase';
import { ClientRoutine, ClientRoutineExercise, WorkoutTemplate } from '../types';

class RoutineService {
  /**
   * Get active workout routine for a client with all exercises
   */
  async getActiveRoutine(clientId: string): Promise<ClientRoutine | null> {
    try {
      const { data: routine, error } = await supabase
        .from('client_routines')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !routine) return null;

      // Fetch exercises for this routine
      const { data: exercises, error: exError } = await supabase
        .from('client_routine_exercises')
        .select('*')
        .eq('routine_id', routine.id)
        .order('day_of_week', { ascending: true })
        .order('order_index', { ascending: true });

      if (exError) {
        console.error('Error fetching routine exercises:', exError.message);
      }

      return {
        ...routine,
        exercises: exercises || [],
      };
    } catch (err) {
      console.error('Error in getActiveRoutine:', err);
      return null;
    }
  }

  /**
   * Get all workout templates created by admin/trainers
   */
  async getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:template_exercises(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getWorkoutTemplates:', err);
      return [];
    }
  }

  /**
   * Assign routine to a client
   */
  async assignRoutine(
    clientId: string,
    routineName: string,
    assignedBy: string,
    exercises: Omit<ClientRoutineExercise, 'id' | 'routine_id'>[]
  ): Promise<boolean> {
    try {
      // 1. Deactivate old active routines
      await supabase
        .from('client_routines')
        .update({ is_active: false })
        .eq('client_id', clientId);

      // 2. Insert new routine
      const { data: routine, error } = await supabase
        .from('client_routines')
        .insert({
          client_id: clientId,
          assigned_by: assignedBy,
          name: routineName,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error || !routine) {
        console.error('Error creating routine:', error?.message);
        return false;
      }

      // 3. Insert exercises
      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex, idx) => ({
          routine_id: routine.id,
          day_of_week: ex.day_of_week,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          rest_seconds: ex.rest_seconds,
          order_index: ex.order_index ?? idx,
          notes: ex.notes,
        }));

        const { error: exError } = await supabase
          .from('client_routine_exercises')
          .insert(exercisesToInsert);

        if (exError) {
          console.error('Error inserting exercises:', exError.message);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error assigning routine:', err);
      return false;
    }
  }

  /**
   * Assign a pre-defined workout template to a client
   */
  async assignTemplateToClient(
    clientId: string,
    templateId: string,
    assignedBy: string
  ): Promise<boolean> {
    try {
      // 1. Fetch template with exercises
      const { data: template, error: tplError } = await supabase
        .from('workout_templates')
        .select(`*, exercises:template_exercises(*)`)
        .eq('id', templateId)
        .maybeSingle();

      if (tplError || !template) {
        console.error('Error fetching template for assignment:', tplError?.message);
        return false;
      }

      const exercises = (template.exercises || []).map((e: any) => ({
        day_of_week: e.day_of_week,
        exercise_name: e.exercise_name,
        muscle_group: e.muscle_group,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg,
        rest_seconds: e.rest_seconds,
        order_index: e.order_index,
        notes: e.notes,
      }));

      return await this.assignRoutine(clientId, template.name, assignedBy, exercises);
    } catch (err) {
      console.error('Error in assignTemplateToClient:', err);
      return false;
    }
  }
}

export const routineService = new RoutineService();
export default routineService;
