// ============================================
// GymTrack Pro - Trainer Dashboard Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Card, StatCard, SectionHeader } from '../../components/common/Card';
import attendanceService from '../../services/attendanceService';
import { supabase } from '../../config/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export default function TrainerDashboardScreen({ navigation }: any) {
  const { profile, user, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [todayClientCheckIns, setTodayClientCheckIns] = useState(0);
  const [monthlyAttendance, setMonthlyAttendance] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Check if trainer checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: trainerAttendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('profile_id', user.id)
        .eq('date', today)
        .single();
      setTodayCheckedIn(!!trainerAttendance);

      // Get assigned clients
      const { data: clients } = await supabase
        .from('clients')
        .select(`
          id,
          profile:profiles!clients_profile_id_fkey(id, full_name, photo_url),
          membership:memberships(status, expiry_date)
        `)
        .eq('assigned_trainer_id', user.id);

      setAssignedClients(clients || []);

      // Count today's check-ins for assigned clients
      if (clients && clients.length > 0) {
        const clientProfileIds = clients.map((c: any) => c.profile?.id).filter(Boolean);
        const { count } = await supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', clientProfileIds)
          .eq('date', today);
        setTodayClientCheckIns(count || 0);
      }

      // Trainer's monthly attendance
      const count = await attendanceService.getMonthlyAttendanceCount(user.id);
      setMonthlyAttendance(count);
    } catch (err) {
      console.error('Trainer dashboard load error:', err);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <LinearGradient colors={['#2A1B5E', '#1A1A2E']} style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.userName}>{profile?.full_name || 'Trainer'}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="barbell" size={12} color={colors.accent} />
                <Text style={styles.roleText}>Trainer</Text>
              </View>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Today check-in status */}
          <Card
            gradient
            gradientColors={
              todayCheckedIn
                ? (['#00B894', '#55EFC4'] as readonly [string, string, ...string[]])
                : (['#6C5CE7', '#A29BFE'] as readonly [string, string, ...string[]])
            }
          >
            <View style={styles.statusRow}>
              <Ionicons
                name={todayCheckedIn ? 'checkmark-circle' : 'qr-code'}
                size={40}
                color="#fff"
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.statusLabel}>
                  {todayCheckedIn ? 'You\'re Checked In!' : 'Not Checked In Yet'}
                </Text>
                <Text style={styles.statusSub}>
                  {todayCheckedIn ? 'Have a great session today' : 'Scan the gym QR to check in'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard
              icon={<Ionicons name="people" size={22} color={colors.primary} />}
              value={assignedClients.length}
              label="My Clients"
              color={colors.primary}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={<Ionicons name="checkmark-done" size={22} color={colors.success} />}
              value={todayClientCheckIns}
              label="Clients Today"
              color={colors.success}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={<Ionicons name="calendar" size={22} color={colors.accent} />}
              value={monthlyAttendance}
              label="My Days"
              color={colors.accent}
            />
          </View>

          {/* Assigned Clients */}
          <SectionHeader
            title="My Clients"
            actionLabel="View all"
            onAction={() => navigation.navigate('MyClients')}
          />
          {assignedClients.length > 0 ? (
            <Card>
              {assignedClients.slice(0, 5).map((client: any, index: number) => {
                const mem = Array.isArray(client.membership)
                  ? client.membership[0]
                  : client.membership;
                const isActive = mem?.status === 'active';

                return (
                  <View
                    key={client.id}
                    style={[
                      styles.clientItem,
                      index < Math.min(assignedClients.length, 5) - 1 && styles.clientItemBorder,
                    ]}
                  >
                    <View style={styles.avatar}>
                      {client.profile?.photo_url ? (
                        <Image source={{ uri: client.profile.photo_url }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {client.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{client.profile?.full_name || 'Unknown'}</Text>
                      <Text style={styles.clientSub}>
                        {isActive ? '✅ Active Plan' : '⚠️ Inactive / No Plan'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No clients assigned yet</Text>
              </View>
            </Card>
          )}

          <View style={{ height: spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerGradient: {
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: fontSize.md, color: colors.textSecondary },
  userName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  roleText: { fontSize: fontSize.xs, color: colors.accentLight, fontWeight: fontWeight.semibold },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.lg, marginTop: -spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff' },
  statusSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', marginTop: spacing.lg },
  clientItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2 },
  clientItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 40, height: 40, borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarImage: { width: 40, height: 40, borderRadius: borderRadius.round },
  avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primaryLight },
  clientName: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  clientSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
});
