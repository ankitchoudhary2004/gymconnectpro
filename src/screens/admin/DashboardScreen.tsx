// ============================================
// GymTrack Pro - Admin Dashboard Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Card, StatCard, SectionHeader, AlertBanner } from '../../components/common/Card';
import { supabase } from '../../config/supabase';
import attendanceService from '../../services/attendanceService';
import { Attendance, DashboardStats } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

export default function AdminDashboardScreen({ navigation }: any) {
  const { profile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalTrainers: 0,
    todayCheckIns: 0,
    todayAbsent: 0,
    attendancePercentage: 0,
    expiringMemberships: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<Attendance[]>([]);
  const [absentClients, setAbsentClients] = useState<any[]>([]);
  const [absentTrainers, setAbsentTrainers] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      // Get total counts
      const [clientsRes, trainersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'trainer'),
      ]);

      const totalClients = clientsRes.count || 0;
      const totalTrainers = trainersRes.count || 0;

      // Get today's check-ins
      const todayAttendance = await attendanceService.getTodayAttendance();
      const todayClientCheckIns = todayAttendance.filter((a) => a.role === 'client').length;

      // Get absent today
      const [absentC, absentT] = await Promise.all([
        attendanceService.getAbsentToday('client'),
        attendanceService.getAbsentToday('trainer'),
      ]);

      setAbsentClients(absentC);
      setAbsentTrainers(absentT);
      setRecentCheckIns(todayAttendance.slice(0, 10));

      // Get expiring memberships
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count: expiringCount } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('expiry_date', weekFromNow.toISOString().split('T')[0])
        .gte('expiry_date', today.toISOString().split('T')[0]);

      setStats({
        totalClients,
        totalTrainers,
        todayCheckIns: todayAttendance.length,
        todayAbsent: absentC.length,
        attendancePercentage: totalClients > 0
          ? Math.round((todayClientCheckIns / totalClients) * 100)
          : 0,
        expiringMemberships: expiringCount || 0,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time attendance updates (check-ins and check-outs)
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#2A1B5E', '#1A1A2E']}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.userName}>{profile?.full_name || 'Admin'}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={styles.roleText}>Admin</Text>
              </View>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Alert banners */}
          {absentTrainers.length > 0 && (
            <AlertBanner
              type="danger"
              message={`${absentTrainers.length} trainer${absentTrainers.length > 1 ? 's' : ''} absent today`}
              icon={<Ionicons name="alert-circle" size={18} color={colors.danger} />}
            />
          )}
          {stats.expiringMemberships > 0 && (
            <AlertBanner
              type="warning"
              message={`${stats.expiringMemberships} membership${stats.expiringMemberships > 1 ? 's' : ''} expiring within 7 days`}
              icon={<Ionicons name="time" size={18} color={colors.warning} />}
            />
          )}

          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <StatCard
              icon={<Ionicons name="people" size={22} color={colors.primary} />}
              value={stats.totalClients}
              label="Total Clients"
              color={colors.primary}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={<Ionicons name="fitness" size={22} color={colors.accent} />}
              value={stats.todayCheckIns}
              label="Today Check-ins"
              color={colors.accent}
            />
          </View>
          <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
            <StatCard
              icon={<Ionicons name="close-circle" size={22} color={colors.danger} />}
              value={stats.todayAbsent}
              label="Absent Today"
              color={colors.danger}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={<Ionicons name="trending-up" size={22} color={colors.success} />}
              value={`${stats.attendancePercentage}%`}
              label="Attendance Rate"
              color={colors.success}
            />
          </View>

          {/* Absent Clients */}
          {absentClients.length > 0 && (
            <>
              <SectionHeader
                title="🔴 Absent Clients Today"
                actionLabel={`View all (${absentClients.length})`}
                onAction={() => navigation?.navigate?.('Clients')}
              />
              <Card>
                {absentClients.slice(0, 5).map((client, index) => (
                  <View
                    key={client.id}
                    style={[
                      styles.absentItem,
                      index < Math.min(absentClients.length, 5) - 1 && styles.absentItemBorder,
                    ]}
                  >
                    <View style={styles.avatar}>
                      {client.photo_url ? (
                        <Image source={{ uri: client.photo_url }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.absentName}>{client.full_name}</Text>
                    <View style={styles.absentBadge}>
                      <Text style={styles.absentBadgeText}>Absent</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Recent Check-ins */}
          <SectionHeader
            title="⚡ Recent Check-ins"
            actionLabel="View all"
            onAction={() => navigation?.navigate?.('Clients')}
          />
          {recentCheckIns.length > 0 ? (
            <Card>
              {recentCheckIns.slice(0, 8).map((entry, index) => (
                <View
                  key={entry.id}
                  style={[
                    styles.checkInItem,
                    index < Math.min(recentCheckIns.length, 8) - 1 && styles.checkInItemBorder,
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(entry.profile as any)?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.checkInInfo}>
                    <Text style={styles.checkInName}>
                      {(entry.profile as any)?.full_name || 'Unknown'}
                    </Text>
                    <Text style={styles.checkInRole}>
                      {entry.role === 'client' ? '👤 Client' : '🏋️ Trainer'}
                    </Text>
                  </View>
                  <View style={styles.checkInTime}>
                    <Text style={styles.checkInTimeText}>
                      {formatTime(entry.check_in)}
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: entry.check_out ? colors.textMuted : colors.success }]} />
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No check-ins today yet</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
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
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    fontWeight: fontWeight.semibold,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  absentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  absentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primaryLight,
  },
  absentName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  absentBadge: {
    backgroundColor: colors.danger + '20',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  absentBadgeText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.semibold,
  },
  checkInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  checkInItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  checkInRole: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkInTime: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  checkInTimeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
