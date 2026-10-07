// ============================================
// GymTrack Pro - Client Attendance Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import attendanceService from '../../services/attendanceService';
import { Attendance } from '../../types';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([
        attendanceService.getAttendanceHistory(user.id),
        attendanceService.getMonthlyAttendanceCount(user.id),
      ]);
      setHistory(list);
      setMonthlyCount(count);
    } catch (err) {
      console.error('Error loading client attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderAttendanceItem = ({ item }: { item: Attendance }) => {
    const checkInTime = new Date(item.check_in).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const checkOutTime = item.check_out
      ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'In Progress';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color={colors.primaryLight} />
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          <Badge
            label={item.duration_minutes ? `${item.duration_minutes} min workout` : 'Active'}
            variant={item.duration_minutes ? 'success' : 'warning'}
            size="sm"
          />
        </View>

        <View style={styles.timesContainer}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeVal}>{checkInTime}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeVal}>{checkOutTime}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout Log</Text>
        <Text style={styles.subtitle}>Consistency & Check-in History</Text>
      </View>

      {/* Streak / Monthly Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="flame" size={24} color={colors.warning} />
          <Text style={styles.statVal}>{history.length}</Text>
          <Text style={styles.statLbl}>Total Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={24} color={colors.accentLight} />
          <Text style={styles.statVal}>{monthlyCount}</Text>
          <Text style={styles.statLbl}>This Month</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="fitness-outline"
              title="No Workouts Recorded"
              description="Scan the Gym QR code at the entrance to log your workout sessions."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLbl: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  timesContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: fontSize.xs - 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  timeVal: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
});
