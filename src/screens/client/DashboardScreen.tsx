// ============================================
// GymTrack Pro - Client Dashboard Screen
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Card, StatCard, SectionHeader } from '../../components/common/Card';
import attendanceService from '../../services/attendanceService';
import { supabase } from '../../config/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export default function ClientDashboardScreen({ navigation }: any) {
  const { profile, user, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayStatus, setTodayStatus] = useState<'not_checked_in' | 'checked_in' | 'checked_out'>('not_checked_in');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [membershipDaysLeft, setMembershipDaysLeft] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayList } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', user.id)
        .eq('date', today)
        .order('check_in', { ascending: false })
        .limit(1);

      const todayAttendance = todayList?.[0] || null;

      if (todayAttendance) {
        if (todayAttendance.check_out) {
          setTodayStatus('checked_out');
        } else {
          setTodayStatus('checked_in');
        }
        setCheckInTime(todayAttendance.check_in);
      } else {
        setTodayStatus('not_checked_in');
        setCheckInTime(null);
      }

      // Monthly attendance
      const count = await attendanceService.getMonthlyAttendanceCount(user.id);
      setMonthlyCount(count);

      // Calculate streak
      const history = await attendanceService.getAttendanceHistory(user.id);
      let streak = 0;
      if (history.length > 0) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const latestDate = new Date(history[0].date);
        latestDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round(
          (todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 1) {
          const startDate = diffDays === 0 ? todayDate : latestDate;
          for (let i = 0; i < history.length; i++) {
            const attendanceDate = new Date(history[i].date);
            attendanceDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(startDate);
            expectedDate.setDate(expectedDate.getDate() - i);

            if (attendanceDate.getTime() === expectedDate.getTime()) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
      setStreakDays(streak);

      // Membership days left
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (client) {
        const { data: memberships } = await supabase
          .from('memberships')
          .select('expiry_date, status')
          .eq('client_id', client.id)
          .order('expiry_date', { ascending: false })
          .limit(1);

        const membership = memberships?.[0] || null;

        if (membership) {
          const expiry = new Date(membership.expiry_date);
          const daysLeft = Math.ceil(
            (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          setMembershipDaysLeft(daysLeft);
        }
      }
    } catch (err) {
      console.error('Load data error:', err);
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = () => {
    switch (todayStatus) {
      case 'checked_in':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success,
          label: 'Checked In',
          sublabel: `Since ${checkInTime ? formatTime(checkInTime) : '—'}`,
          gradient: ['#00B894', '#55EFC4'] as readonly [string, string, ...string[]],
        };
      case 'checked_out':
        return {
          icon: 'log-out' as const,
          color: colors.textMuted,
          label: 'Session Complete',
          sublabel: 'Great workout today! 💪',
          gradient: ['#636e72', '#b2bec3'] as readonly [string, string, ...string[]],
        };
      default:
        return {
          icon: 'qr-code' as const,
          color: colors.primary,
          label: 'Not Checked In',
          sublabel: 'Scan the gym QR to check in',
          gradient: ['#6C5CE7', '#A29BFE'] as readonly [string, string, ...string[]],
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <LinearGradient colors={['#2A1B5E', '#1A1A2E']} style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.userName}>{profile?.full_name || 'Member'}</Text>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Today's Status Card */}
          <Card gradient gradientColors={statusConfig.gradient}>
            <View style={styles.statusCard}>
              <Ionicons name={statusConfig.icon} size={48} color="#fff" />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>{statusConfig.label}</Text>
                <Text style={styles.statusSublabel}>{statusConfig.sublabel}</Text>
              </View>
            </View>
          </Card>

          {/* Membership alerts */}
          {membershipDaysLeft !== null && membershipDaysLeft <= 7 && membershipDaysLeft >= 0 && (
            <View style={styles.membershipAlert}>
              <Ionicons name="time" size={18} color={colors.warning} />
              <Text style={styles.membershipAlertText}>
                Membership expires {membershipDaysLeft === 0 ? 'today!' : `in ${membershipDaysLeft} day${membershipDaysLeft !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}

          {membershipDaysLeft !== null && membershipDaysLeft < 0 && (
            <View style={[styles.membershipAlert, { borderColor: colors.danger + '60', backgroundColor: colors.danger + '15' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.membershipAlertText, { color: colors.dangerLight }]}>
                Membership expired {Math.abs(membershipDaysLeft)} day{Math.abs(membershipDaysLeft) !== 1 ? 's' : ''} ago. Please renew.
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard
              icon={<Ionicons name="calendar" size={22} color={colors.primary} />}
              value={monthlyCount}
              label="This Month"
              color={colors.primary}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={<Ionicons name="flame" size={22} color={colors.warningDark} />}
              value={streakDays}
              label="Day Streak"
              color={colors.warningDark}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon={
                <Ionicons
                  name="card"
                  size={22}
                  color={
                    membershipDaysLeft === null
                      ? colors.textMuted
                      : membershipDaysLeft < 0
                      ? colors.danger
                      : membershipDaysLeft <= 7
                      ? colors.warning
                      : colors.success
                  }
                />
              }
              value={
                membershipDaysLeft === null
                  ? '—'
                  : membershipDaysLeft < 0
                  ? 'Expired'
                  : `${membershipDaysLeft}d`
              }
              label="Days Left"
              color={
                membershipDaysLeft === null
                  ? colors.textMuted
                  : membershipDaysLeft < 0
                  ? colors.danger
                  : membershipDaysLeft <= 7
                  ? colors.warning
                  : colors.success
              }
            />
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ScanQR')}>
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.actionIcon}>
                <Ionicons name="qr-code" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Scan QR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Attendance')}>
              <LinearGradient colors={['#00D2FF', '#0693E3']} style={styles.actionIcon}>
                <Ionicons name="calendar" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MyRoutine')}>
              <LinearGradient colors={['#00B894', '#55EFC4']} style={styles.actionIcon}>
                <Ionicons name="barbell" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionLabel}>My Routine</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Profile')}>
              <LinearGradient colors={['#E17055', '#FDCB6E']} style={styles.actionIcon}>
                <Ionicons name="person" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Profile</Text>
            </TouchableOpacity>
          </View>

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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  statusSublabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  membershipAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  membershipAlertText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
    flexGrow: 1,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
