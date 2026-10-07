// ============================================
// GymTrack Pro - Client My Routine Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import routineService from '../../services/routineService';
import { ClientRoutine, ClientRoutineExercise } from '../../types';
import { supabase } from '../../config/supabase';
import EmptyState from '../../components/common/EmptyState';

const DAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
];

export default function MyRoutineScreen() {
  const { user } = useAuth();
  const [routine, setRoutine] = useState<ClientRoutine | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay; // 1-indexed Monday=1, Sunday=7
  });
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Interactive Rest Timer State
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);
  const [restTimerInitial, setRestTimerInitial] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && restTimerSeconds !== null && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (restTimerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, restTimerSeconds]);

  const startRestTimer = (seconds: number = 60) => {
    setRestTimerInitial(seconds);
    setRestTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const addTime = (delta: number = 15) => {
    setRestTimerSeconds((prev) => (prev !== null ? prev + delta : delta));
  };

  const togglePauseTimer = () => {
    setTimerRunning((prev) => !prev);
  };

  const stopTimer = () => {
    setRestTimerSeconds(null);
    setTimerRunning(false);
  };

  const loadRoutine = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Get client record for this profile
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (client) {
        const activeRoutine = await routineService.getActiveRoutine(client.id);
        setRoutine(activeRoutine);
      }
    } catch (err) {
      console.error('Error loading routine:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutine();
    setRefreshing(false);
  };

  const toggleComplete = (exerciseId: string, defaultRestSeconds: number = 60) => {
    setCompletedExercises((prev) => {
      const willBeDone = !prev[exerciseId];
      if (willBeDone) {
        startRestTimer(defaultRestSeconds);
      }
      return {
        ...prev,
        [exerciseId]: willBeDone,
      };
    });
  };

  const currentDayExercises = (routine?.exercises || []).filter(
    (ex) => ex.day_of_week === selectedDay
  );

  const doneCount = currentDayExercises.filter((e) => completedExercises[e.id]).length;
  const progressPct =
    currentDayExercises.length > 0
      ? Math.round((doneCount / currentDayExercises.length) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout Routine</Text>
        <Text style={styles.subtitle}>
          {routine ? routine.name : 'Personalized Training Plan'}
        </Text>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        {DAYS.map((d) => {
          const isSelected = selectedDay === d.day;
          return (
            <TouchableOpacity
              key={d.day}
              onPress={() => setSelectedDay(d.day)}
              style={[styles.dayButton, isSelected && styles.dayButtonActive]}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Workout Progress Bar */}
      {routine && currentDayExercises.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Session Progress</Text>
            <Text style={styles.progressPercent}>
              {doneCount}/{currentDayExercises.length} ({progressPct}%)
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          restTimerSeconds !== null && { paddingBottom: 110 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {!routine ? (
          !loading && (
            <EmptyState
              icon="barbell-outline"
              title="No Routine Assigned"
              description="Your trainer hasn't published an active workout routine for you yet."
            />
          )
        ) : currentDayExercises.length === 0 ? (
          <EmptyState
            icon="bed-outline"
            title="Rest Day"
            description="No scheduled exercises for this day. Rest, recover, and hydrate!"
          />
        ) : (
          currentDayExercises.map((ex, index) => {
            const isDone = !!completedExercises[ex.id];

            return (
              <View key={ex.id || index} style={[styles.exerciseCard, isDone && styles.cardDone]}>
                <View style={styles.exerciseHeader}>
                  <TouchableOpacity
                    onPress={() => toggleComplete(ex.id, ex.rest_seconds || 60)}
                    style={[styles.checkbox, isDone && styles.checkboxDone]}
                  >
                    {isDone && <Ionicons name="checkmark" size={16} color={colors.text} />}
                  </TouchableOpacity>

                  <View style={styles.exerciseNameCol}>
                    <Text style={[styles.exerciseName, isDone && styles.textDone]}>
                      {ex.exercise_name}
                    </Text>
                    {ex.muscle_group && (
                      <Text style={styles.muscleGroup}>{ex.muscle_group}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>{ex.sets ?? '—'}</Text>
                    <Text style={styles.metricLbl}>Sets</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>{ex.reps ?? '—'}</Text>
                    <Text style={styles.metricLbl}>Reps</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {ex.weight_kg ? `${ex.weight_kg} kg` : 'Bodyweight'}
                    </Text>
                    <Text style={styles.metricLbl}>Target Weight</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.metricItem, styles.metricItemTap]}
                    onPress={() => startRestTimer(ex.rest_seconds || 60)}
                  >
                    <Text style={[styles.metricVal, { color: colors.primaryLight }]}>
                      {ex.rest_seconds ? `${ex.rest_seconds}s` : '60s'}
                    </Text>
                    <Text style={styles.metricLbl}>⏱️ Rest</Text>
                  </TouchableOpacity>
                </View>

                {ex.notes && (
                  <View style={styles.notesBox}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.notesText}>{ex.notes}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Rest Timer Widget */}
      {restTimerSeconds !== null && (
        <View style={styles.floatingTimer}>
          <View style={styles.timerLeft}>
            <Ionicons
              name={timerRunning ? 'hourglass' : 'pause-circle'}
              size={22}
              color={colors.primaryLight}
            />
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={styles.timerTitle}>
                {restTimerSeconds > 0 ? 'Rest Interval' : 'Rest Finished! 💪'}
              </Text>
              <Text style={styles.timerDigits}>
                {Math.floor(restTimerSeconds / 60)}:
                {String(restTimerSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>

          <View style={styles.timerControls}>
            <TouchableOpacity style={styles.timerBtn} onPress={() => addTime(15)}>
              <Text style={styles.timerBtnText}>+15s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.timerBtnAction} onPress={togglePauseTimer}>
              <Ionicons
                name={timerRunning ? 'pause' : 'play'}
                size={18}
                color={colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.timerBtnDismiss} onPress={stopTimer}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingTop: spacing.xl,
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
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  dayButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 42,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  dayTextActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: {
    opacity: 0.6,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  exerciseNameCol: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  muscleGroup: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  textDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  metricLbl: {
    fontSize: fontSize.xs - 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  notesText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  progressPercent: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primaryLight,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  metricItemTap: {
    backgroundColor: colors.primary + '18',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
  },
  floatingTimer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: fontSize.xs - 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
  },
  timerDigits: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerBtnText: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    fontWeight: fontWeight.bold,
  },
  timerBtnAction: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnDismiss: {
    padding: 6,
    marginLeft: 2,
  },
});
