// ============================================
// GymTrack Pro - Attendance Service
// ============================================
import { supabase } from '../config/supabase';
import { Attendance, ScanResult, UserRole } from '../types';

class AttendanceService {
  /**
   * Process a QR scan for check-in/check-out
   * Runs membership validation and device lock checks
   */
  async processScan(
    profileId: string,
    role: UserRole,
    deviceId: string,
    qrSecret: string,
    gymId: string
  ): Promise<ScanResult> {
    try {
      // 1. Verify QR code is valid (matches today's gym secret)
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .eq('qr_secret', qrSecret)
        .maybeSingle();

      if (gymError || !gym) {
        return { status: 'error', message: 'Invalid QR code. Please try again.' };
      }

      // 2. Device lock check
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('device_id')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError || !profile) {
        return { status: 'error', message: 'Could not verify your profile.' };
      }

      // If device_id is set and doesn't match, block
      if (profile.device_id && profile.device_id !== deviceId) {
        // Notify admin about device mismatch
        await this.sendAdminNotification(
          gymId,
          'device_mismatch',
          'Device Mismatch Detected',
          `User attempted check-in from a different device.`,
          { profileId }
        );
        return {
          status: 'device_mismatch',
          message: 'This account is linked to a different device. Contact admin to update.',
        };
      }

      // If no device_id yet, save this device
      if (!profile.device_id) {
        await supabase
          .from('profiles')
          .update({ device_id: deviceId })
          .eq('id', profileId);
      }

      // 3. Membership check (for clients only)
      let daysUntilExpiry: number | undefined;
      let isExpiringSoon = false;

      if (role === 'client') {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profileId)
          .maybeSingle();

        if (client) {
          const { data: membership } = await supabase
            .from('memberships')
            .select('*')
            .eq('client_id', client.id)
            .order('expiry_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (membership) {
            const expiryDate = new Date(membership.expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            daysUntilExpiry = Math.ceil(
              (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiry < 0) {
              // Membership expired — block and notify admin
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', profileId)
                .maybeSingle();

              await this.sendAdminNotification(
                gymId,
                'membership_expired_scan',
                'Expired Member Scan Attempt',
                `${profileData?.full_name || 'A member'} (expired ${Math.abs(daysUntilExpiry)} days ago) tried to check in.`,
                { profileId, daysExpired: Math.abs(daysUntilExpiry) }
              );

              return {
                status: 'expired',
                message: `Your membership expired ${Math.abs(daysUntilExpiry)} days ago. Please renew to continue.`,
              };
            }

            if (daysUntilExpiry <= 7) {
              isExpiringSoon = true;
            }
          }
        }
      }

      // 4. Check if active check-in exists today (for check-out)
      const today = new Date().toISOString().split('T')[0];
      const { data: openAttendances } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', today)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1);

      const activeAttendance = openAttendances?.[0] || null;

      if (activeAttendance) {
        // Check out
        const checkOut = new Date();
        const checkIn = new Date(activeAttendance.check_in);
        const durationMinutes = Math.max(
          1,
          Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60))
        );

        const { data: updated, error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out: checkOut.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq('id', activeAttendance.id)
          .select()
          .single();

        if (updateError) {
          return { status: 'error', message: 'Failed to record check-out.' };
        }

        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

        return {
          status: isExpiringSoon ? 'expiring_soon' : 'success',
          message: isExpiringSoon
            ? `Checked out! Session: ${durStr}. (⚠️ Plan expires in ${daysUntilExpiry}d)`
            : `Checked out! Session: ${durStr}. Great workout! 💪`,
          attendance: updated,
          daysUntilExpiry,
        };
      }

      // Check if recently checked out (within 3 minutes) to prevent accidental double-tap
      const { data: recentCompleted } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', today)
        .not('check_out', 'is', null)
        .order('check_out', { ascending: false })
        .limit(1);

      if (recentCompleted && recentCompleted.length > 0) {
        const lastCheckOut = new Date(recentCompleted[0].check_out).getTime();
        if (Date.now() - lastCheckOut < 3 * 60 * 1000) {
          return {
            status: isExpiringSoon ? 'expiring_soon' : 'success',
            message: 'You already completed check-out moments ago! Have a great recovery! 👍',
            attendance: recentCompleted[0],
            daysUntilExpiry,
          };
        }
      }

      // 5. Record new check-in
      const attendance = await this.recordCheckIn(profileId, role);
      if (isExpiringSoon) {
        return {
          status: 'expiring_soon',
          message: `Checked in! 💪 (⚠️ Membership expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please renew soon!)`,
          attendance,
          daysUntilExpiry,
        };
      }

      return {
        status: 'success',
        message: 'Checked in successfully! 💪',
        attendance,
      };
    } catch (err: any) {
      console.error('Scan processing error:', err);
      return { status: 'error', message: err.message || 'An unexpected error occurred.' };
    }
  }

  /**
   * Record a new check-in
   */
  private async recordCheckIn(profileId: string, role: UserRole): Promise<Attendance | undefined> {
    const now = new Date();
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        profile_id: profileId,
        role,
        date: now.toISOString().split('T')[0],
        check_in: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Check-in error:', error.message);
      return undefined;
    }

    return data;
  }

  /**
   * Send a notification to admin(s)
   */
  private async sendAdminNotification(
    gymId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      // Get all admin profiles
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          recipient_id: admin.id,
          type,
          title,
          message,
          metadata: { ...metadata, gymId },
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  /**
   * Get today's attendance for admin dashboard
   */
  async getTodayAttendance(role?: UserRole): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('attendance')
      .select('*, profile:profiles(*)')
      .eq('date', today)
      .order('check_in', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Get today attendance error:', error.message);
      return [];
    }
    return (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
    })) as Attendance[];
  }

  /**
   * Get attendance history for a specific profile
   */
  async getAttendanceHistory(
    profileId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Attendance[]> {
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) {
      console.error('Get attendance history error:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Get absent clients for today
   */
  async getAbsentToday(role: UserRole = 'client'): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];

    // Get all profiles of given role
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url')
      .eq('role', role);

    if (!allProfiles) return [];

    // Get today's check-ins
    const { data: checkedIn } = await supabase
      .from('attendance')
      .select('profile_id')
      .eq('date', today)
      .eq('role', role);

    const checkedInIds = new Set((checkedIn || []).map((a) => a.profile_id));

    // Filter out those who checked in
    return allProfiles.filter((p) => !checkedInIds.has(p.id));
  }

  /**
   * Get monthly attendance count for a profile
   */
  async getMonthlyAttendanceCount(profileId: string, month?: number, year?: number): Promise<number> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

    const { count, error } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) return 0;
    return count || 0;
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
