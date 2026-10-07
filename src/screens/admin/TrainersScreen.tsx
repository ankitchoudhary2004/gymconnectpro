// ============================================
// GymTrack Pro - Admin Trainers Management Screen
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import trainerService, { TrainerWithStats } from '../../services/trainerService';
import { Client } from '../../types';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function TrainersScreen() {
  const [trainers, setTrainers] = useState<TrainerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal to view clients assigned to a trainer
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithStats | null>(null);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsModalVisible, setClientsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await trainerService.getAllTrainers();
      setTrainers(data);
    } catch (err) {
      console.error('Error loading trainers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenClientsModal = async (trainer: TrainerWithStats) => {
    setSelectedTrainer(trainer);
    setClientsModalVisible(true);
    setLoadingClients(true);
    const clients = await trainerService.getTrainerClients(trainer.id);
    setAssignedClients(clients);
    setLoadingClients(false);
  };

  const totalTrainers = trainers.length;
  const presentToday = trainers.filter((t) => t.todayCheckedIn).length;
  const absentToday = totalTrainers - presentToday;

  const renderTrainerCard = ({ item }: { item: TrainerWithStats }) => {
    return (
      <View style={styles.trainerCard}>
        <View style={styles.cardHeader}>
          <Avatar name={item.full_name} photoUrl={item.photo_url} size="md" />
          <View style={styles.trainerInfo}>
            <Text style={styles.trainerName}>{item.full_name}</Text>
            <Text style={styles.trainerContact}>
              {item.email || item.phone || 'No direct contact'}
            </Text>
          </View>
          <Badge
            label={item.todayCheckedIn ? 'Present' : 'Absent'}
            variant={item.todayCheckedIn ? 'success' : 'danger'}
            size="sm"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.cardStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.assignedClientsCount}</Text>
            <Text style={styles.statLabel}>Assigned Clients</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {item.todayAttendance
                ? new Date(item.todayAttendance.check_in).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Check-in Today</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewClientsBtn}
          onPress={() => handleOpenClientsModal(item)}
        >
          <Ionicons name="people-outline" size={16} color={colors.primaryLight} />
          <Text style={styles.viewClientsText}>View Assigned Members</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trainers & Staff</Text>
        <Text style={styles.subtitle}>Team Attendance & Coaching Load</Text>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>{totalTrainers}</Text>
          <Text style={styles.kpiLbl}>Total Coaches</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.success + '40' }]}>
          <Text style={[styles.kpiVal, { color: colors.successLight }]}>{presentToday}</Text>
          <Text style={styles.kpiLbl}>Present Today</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.danger + '40' }]}>
          <Text style={[styles.kpiVal, { color: colors.dangerLight }]}>{absentToday}</Text>
          <Text style={styles.kpiLbl}>Absent Today</Text>
        </View>
      </View>

      {/* Trainers List */}
      <FlatList
        data={trainers}
        keyExtractor={(item) => item.id}
        renderItem={renderTrainerCard}
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
              icon="barbell-outline"
              title="No Trainers Found"
              description="No registered staff with trainer role in this gym."
            />
          ) : null
        }
      />

      {/* Assigned Clients Modal */}
      <Modal
        visible={clientsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClientsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Coaching Clients</Text>
                <Text style={styles.modalSubtitle}>
                  Assigned to {selectedTrainer?.full_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setClientsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingClients ? (
              <Text style={styles.loadingText}>Loading assigned members...</Text>
            ) : assignedClients.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Clients Assigned"
                description="Assign members from the Clients tab to distribute workload."
              />
            ) : (
              <FlatList
                data={assignedClients}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360, marginTop: spacing.md }}
                renderItem={({ item }) => (
                  <View style={styles.clientItem}>
                    <Avatar
                      name={item.profile?.full_name}
                      photoUrl={item.profile?.photo_url}
                      size="sm"
                    />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={styles.clientItemName}>{item.profile?.full_name}</Text>
                      <Text style={styles.clientItemPlan}>
                        Plan: {item.membership?.plan_type || 'None'}
                      </Text>
                    </View>
                    <Badge
                      label={item.membership?.status || 'inactive'}
                      variant={item.membership?.status === 'active' ? 'active' : 'expired'}
                      size="sm"
                    />
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
  trainerCard: {
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
  trainerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trainerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  trainerContact: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primaryLight,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewClientsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  viewClientsText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primaryLight,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientItemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clientItemPlan: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
