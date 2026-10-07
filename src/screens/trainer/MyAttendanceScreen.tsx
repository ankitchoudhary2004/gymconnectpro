// ============================================
// GymTrack Pro - Trainer My Attendance Screen
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
import trainerService from '../../services/trainerService';
import { Attendance } from '../../types';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function MyAttendanceScreen() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const records = await trainerService.getTrainerAttendance(user.id);
      setAttendance(records);
    } catch (err) {
      console.error('Error loading trainer attendance:', err);
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

  // Calculate statistics
  const totalDays = attendance.length;
  const totalMinutes = attendance.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const renderAttendanceItem = ({ item }: { item: Attendance }) => {
    const checkInTime = new Date(item.check_in).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const checkOutTime = item.check_out
      ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Active / Pending';

    return (
      <View style={styles.recordCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateCol}>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
          <Badge
            label={item.check_out ? `${item.duration_minutes ?? 0} mins` : 'Active'}
            variant={item.check_out ? 'success' : 'warning'}
            size="sm"
          />
        </View>

        <View style={styles.timesRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>In</Text>
            <Text style={styles.timeValue}>{checkInTime}</Text>
          </View>
          <View style={styles.arrowBox}>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Out</Text>
            <Text style={styles.timeValue}>{checkOutTime}</Text>
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
        <Text style={styles.title}>My Attendance</Text>
        <Text style={styles.subtitle}>Check-in History & Coaching Hours</Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{totalDays}</Text>
          <Text style={styles.kpiLbl}>Total Shifts</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: colors.accentLight }]}>{totalHours}h</Text>
          <Text style={styles.kpiLbl}>Hours Logged</Text>
        </View>
      </View>

      {/* Log list */}
      <FlatList
        data={attendance}
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
              icon="calendar-outline"
              title="No Attendance History"
              description="Scan the Gym QR code when arriving to start recording your attendance."
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
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  kpiLbl: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateCol: {},
  dateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  arrowBox: {
    paddingHorizontal: spacing.sm,
  },
  timeLabel: {
    fontSize: fontSize.xs - 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
});
