// ============================================
// GymTrack Pro - Trainer My Clients Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import trainerService from '../../services/trainerService';
import healthService from '../../services/healthService';
import routineService from '../../services/routineService';
import { Client, HealthRecord, WorkoutTemplate, ClientRoutine } from '../../types';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

export default function MyClientsScreen() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Health Record Modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [healthModalVisible, setHealthModalVisible] = useState(false);
  const [latestHealth, setLatestHealth] = useState<HealthRecord | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingHealth, setSubmittingHealth] = useState(false);

  // Routine Assignment Modal
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [currentRoutine, setCurrentRoutine] = useState<ClientRoutine | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [assigningRoutine, setAssigningRoutine] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const list = await trainerService.getTrainerClients(user.id);
      setClients(list);
    } catch (err) {
      console.error('Error loading trainer clients:', err);
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

  const handleOpenHealthModal = async (client: Client) => {
    setSelectedClient(client);
    setHealthModalVisible(true);
    setWeight('');
    setHeight('');
    setBpSystolic('');
    setBpDiastolic('');
    setBodyFat('');
    setNotes('');

    const latest = await healthService.getLatestHealthRecord(client.id);
    setLatestHealth(latest);
    if (latest) {
      if (latest.weight_kg) setWeight(latest.weight_kg.toString());
      if (latest.height_cm) setHeight(latest.height_cm.toString());
    }
  };

  const handleSaveHealthRecord = async () => {
    if (!selectedClient || !user) return;
    if (!weight) {
      Alert.alert('Required', 'Please enter at least client weight.');
      return;
    }

    setSubmittingHealth(true);
    const res = await healthService.addHealthRecord({
      client_id: selectedClient.id,
      recorded_by: user.id,
      weight_kg: parseFloat(weight) || null,
      height_cm: height ? parseFloat(height) : null,
      bp_systolic: bpSystolic ? parseInt(bpSystolic, 10) : null,
      bp_diastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : null,
      body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
      heart_rate: null,
      notes: notes || null,
    });

    setSubmittingHealth(false);
    if (res) {
      Alert.alert('Success', 'Health record logged successfully!');
      setHealthModalVisible(false);
      setSelectedClient(null);
    } else {
      Alert.alert('Error', 'Failed to save health record.');
    }
  };

  const handleOpenRoutineModal = async (client: Client) => {
    setSelectedClient(client);
    setRoutineModalVisible(true);
    setLoadingTemplates(true);
    try {
      const [templates, activeRoutine] = await Promise.all([
        routineService.getWorkoutTemplates(),
        routineService.getActiveRoutine(client.id),
      ]);
      setWorkoutTemplates(templates);
      setCurrentRoutine(activeRoutine);
    } catch (err) {
      console.error('Error loading routine templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAssignTemplate = async (templateId: string) => {
    if (!selectedClient || !user) return;
    setAssigningRoutine(true);
    const success = await routineService.assignTemplateToClient(
      selectedClient.id,
      templateId,
      user.id
    );
    setAssigningRoutine(false);
    if (success) {
      Alert.alert('Success', 'Workout routine assigned successfully!');
      setRoutineModalVisible(false);
      setSelectedClient(null);
    } else {
      Alert.alert('Error', 'Failed to assign workout routine.');
    }
  };

  const renderClientCard = ({ item }: { item: Client }) => {
    const hasMedicalAlert =
      (item.medical_conditions && item.medical_conditions.length > 0) ||
      (item.allergies && item.allergies.length > 0);

    return (
      <View style={styles.clientCard}>
        <View style={styles.cardHeader}>
          <Avatar name={item.profile?.full_name} photoUrl={item.profile?.photo_url} size="md" />
          <View style={styles.info}>
            <Text style={styles.clientName}>{item.profile?.full_name}</Text>
            <Text style={styles.clientContact}>
              {item.profile?.phone || item.profile?.email || 'No contact'}
            </Text>
          </View>
          <Badge
            label={item.membership?.status || 'inactive'}
            variant={item.membership?.status === 'active' ? 'active' : 'expired'}
            size="sm"
          />
        </View>

        {hasMedicalAlert && (
          <View style={styles.medicalAlert}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.medicalText}>
              Medical: {[...(item.medical_conditions || []), ...(item.allergies || [])].join(', ')}
            </Text>
          </View>
        )}

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.healthBtn}
            onPress={() => handleOpenHealthModal(item)}
          >
            <Ionicons name="fitness-outline" size={15} color={colors.text} />
            <Text style={styles.actionBtnText}>Vitals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.routineBtn}
            onPress={() => handleOpenRoutineModal(item)}
          >
            <Ionicons name="barbell-outline" size={15} color={colors.text} />
            <Text style={styles.actionBtnText}>Routine</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Assigned Clients</Text>
        <Text style={styles.subtitle}>{clients.length} Clients Under Your Care</Text>
      </View>

      {/* Clients List */}
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClientCard}
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
              icon="people-outline"
              title="No Clients Assigned Yet"
              description="Your gym administrator will assign members to you soon."
            />
          ) : null
        }
      />

      {/* Health Vitals Modal */}
      <Modal
        visible={healthModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHealthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Health & Measurements</Text>
                <Text style={styles.modalSub}>{selectedClient?.profile?.full_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setHealthModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {latestHealth && (
              <View style={styles.latestStatsBanner}>
                <Text style={styles.latestStatsTitle}>Previous Record:</Text>
                <Text style={styles.latestStatsVal}>
                  {latestHealth.weight_kg ? `${latestHealth.weight_kg} kg` : ''} •{' '}
                  {latestHealth.bmi ? `BMI ${latestHealth.bmi}` : ''} •{' '}
                  {latestHealth.bp_systolic && latestHealth.bp_diastolic
                    ? `BP ${latestHealth.bp_systolic}/${latestHealth.bp_diastolic}`
                    : ''}
                </Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Weight (kg)"
                  placeholder="e.g. 74.5"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Input
                  label="Height (cm)"
                  placeholder="e.g. 178"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Systolic BP"
                  placeholder="e.g. 120"
                  keyboardType="numeric"
                  value={bpSystolic}
                  onChangeText={setBpSystolic}
                />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Input
                  label="Diastolic BP"
                  placeholder="e.g. 80"
                  keyboardType="numeric"
                  value={bpDiastolic}
                  onChangeText={setBpDiastolic}
                />
              </View>
            </View>

            <Input
              label="Body Fat % (Optional)"
              placeholder="e.g. 18.2"
              keyboardType="numeric"
              value={bodyFat}
              onChangeText={setBodyFat}
            />

            <Input
              label="Trainer Notes"
              placeholder="Progress notes, posture advice, diet adjustments..."
              value={notes}
              onChangeText={setNotes}
            />

            <Button
              title="Save Measurement Record"
              onPress={handleSaveHealthRecord}
              loading={submittingHealth}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </Modal>

      {/* Routine Assignment Modal */}
      <Modal
        visible={routineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoutineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Workout Plan</Text>
                <Text style={styles.modalSub}>{selectedClient?.profile?.full_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setRoutineModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Current Active Routine Info */}
            <View style={styles.currentRoutineBanner}>
              <Ionicons name="barbell-outline" size={18} color={colors.primaryLight} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.currentRoutineLabel}>Active Routine:</Text>
                <Text style={styles.currentRoutineName}>
                  {currentRoutine ? `${currentRoutine.name} (${currentRoutine.exercises?.length || 0} exercises)` : 'No active routine assigned'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionHeaderTitle}>Select Workout Template</Text>

            {loadingTemplates ? (
              <Text style={styles.loadingText}>Loading templates...</Text>
            ) : workoutTemplates.length === 0 ? (
              <EmptyState
                icon="barbell-outline"
                title="No Templates"
                description="Create templates in Admin or assign exercises directly."
              />
            ) : (
              <FlatList
                data={workoutTemplates}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 260 }}
                renderItem={({ item }) => (
                  <View style={styles.templateCard}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.templateName}>{item.name}</Text>
                      {item.goal && <Text style={styles.templateGoal}>🎯 {item.goal}</Text>}
                      <View style={styles.templateMeta}>
                        <Badge label={item.difficulty} variant="neutral" size="sm" />
                        <Text style={styles.exerciseCountText}>
                          {item.exercises?.length || 0} exercises
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => handleAssignTemplate(item.id)}
                      disabled={assigningRoutine}
                    >
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  clientCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  clientContact: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  medicalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  medicalText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  healthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  routineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: fontSize.xs,
    color: colors.primaryLight,
    marginTop: 2,
  },
  latestStatsBanner: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  latestStatsTitle: {
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  latestStatsVal: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
  },
  currentRoutineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentRoutineLabel: {
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  currentRoutineName: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginTop: 1,
  },
  sectionHeaderTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  templateGoal: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  exerciseCountText: {
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
  },
  assignBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  assignBtnText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
