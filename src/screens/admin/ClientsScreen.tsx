// ============================================
// GymTrack Pro - Admin Clients Management Screen
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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import clientService from '../../services/clientService';
import trainerService, { TrainerWithStats } from '../../services/trainerService';
import { Client, MembershipStatus, MembershipPlanType } from '../../types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import Badge, { BadgeVariant } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<TrainerWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Trainer Assignment
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick-Add Member Modal State
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newMedicalNotes, setNewMedicalNotes] = useState('');
  const [newAssignedTrainerId, setNewAssignedTrainerId] = useState<string | null>(null);
  const [newPlanType, setNewPlanType] = useState<MembershipPlanType>('monthly');
  const [newPlanMonths, setNewPlanMonths] = useState(1);
  const [creatingMember, setCreatingMember] = useState(false);

  const resetAddMemberForm = () => {
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewEmergencyName('');
    setNewEmergencyPhone('');
    setNewMedicalNotes('');
    setNewAssignedTrainerId(null);
    setNewPlanType('monthly');
    setNewPlanMonths(1);
  };

  const handleCreateMember = async () => {
    if (!newFullName.trim() || !newEmail.trim()) {
      Alert.alert('Required Fields', 'Please enter member full name and email address.');
      return;
    }

    setCreatingMember(true);
    const medicalArray = newMedicalNotes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await clientService.registerNewMember({
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || undefined,
      emergencyContactName: newEmergencyName.trim() || undefined,
      emergencyContactPhone: newEmergencyPhone.trim() || undefined,
      medicalConditions: medicalArray,
      assignedTrainerId: newAssignedTrainerId,
      initialPlan: newPlanType,
      durationMonths: newPlanMonths,
    });

    setCreatingMember(false);
    if (result.success) {
      Alert.alert('Success', `${newFullName} has been enrolled successfully!`);
      setAddMemberVisible(false);
      resetAddMemberForm();
      loadData();
    } else {
      Alert.alert('Registration Failed', result.error || 'Could not enroll member.');
    }
  };

  // Load clients and trainers
  const loadData = useCallback(async () => {
    try {
      const [clientList, trainerList] = await Promise.all([
        clientService.getAllClients(search, statusFilter),
        trainerService.getAllTrainers(),
      ]);
      setClients(clientList);
      setTrainers(trainerList);
    } catch (err) {
      console.error('Error loading clients screen data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignTrainer = async (trainerId: string | null) => {
    if (!selectedClient) return;
    setSubmitting(true);
    const success = await clientService.assignTrainer(selectedClient.id, trainerId);
    setSubmitting(false);
    if (success) {
      setAssignModalVisible(false);
      setSelectedClient(null);
      loadData();
    } else {
      Alert.alert('Error', 'Failed to update trainer assignment.');
    }
  };

  const handleAssignMembership = async (planType: MembershipPlanType, durationMonths: number) => {
    if (!selectedClient) return;
    setSubmitting(true);
    const success = await clientService.assignMembership(selectedClient.id, planType, durationMonths);
    setSubmitting(false);
    if (success) {
      setMembershipModalVisible(false);
      setSelectedClient(null);
      loadData();
    } else {
      Alert.alert('Error', 'Failed to activate membership.');
    }
  };

  const getStatusBadgeVariant = (status?: MembershipStatus): BadgeVariant => {
    switch (status) {
      case 'active':
        return 'active';
      case 'expired':
        return 'expired';
      case 'frozen':
        return 'frozen';
      default:
        return 'neutral';
    }
  };

  const renderClientCard = ({ item }: { item: Client }) => {
    const hasMembership = !!item.membership;
    const status = item.membership?.status;
    const expiry = item.membership?.expiry_date;

    return (
      <View style={styles.clientCard}>
        <View style={styles.cardHeader}>
          <Avatar
            name={item.profile?.full_name || 'Client'}
            photoUrl={item.profile?.photo_url}
            size="md"
          />
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.profile?.full_name || 'Unnamed Client'}</Text>
            <Text style={styles.clientContact}>
              {item.profile?.email || item.profile?.phone || 'No contact provided'}
            </Text>
          </View>
          <Badge
            label={hasMembership && status ? status : 'no plan'}
            variant={hasMembership ? getStatusBadgeVariant(status) : 'neutral'}
            size="sm"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailLabel}>Trainer:</Text>
            <Text style={styles.detailValue}>
              {item.trainer?.full_name || 'Unassigned'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={styles.detailValue}>{expiry ? expiry : 'No Plan'}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => {
              setSelectedClient(item);
              setAssignModalVisible(true);
            }}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.primaryLight} />
            <Text style={styles.actionTextSecondary}>Assign Trainer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => {
              setSelectedClient(item);
              setMembershipModalVisible(true);
            }}
          >
            <Ionicons name="card-outline" size={16} color={colors.text} />
            <Text style={styles.actionTextPrimary}>Plan</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Members & Clients</Text>
          <Text style={styles.subtitle}>{clients.length} Total Registered</Text>
        </View>
        <TouchableOpacity
          style={styles.addMemberBtn}
          onPress={() => setAddMemberVisible(true)}
        >
          <Ionicons name="person-add" size={15} color="#fff" />
          <Text style={styles.addMemberBtnText}>Enroll Member</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Search member name, email or phone..."
          value={search}
          onChangeText={setSearch}
          icon="search-outline"
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'active', 'expired', 'frozen'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setStatusFilter(tab)}
            style={[
              styles.filterTab,
              statusFilter === tab && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
              title="No Clients Found"
              description={
                search
                  ? "We couldn't find any member matching your search query."
                  : 'Start adding new members to view them here.'
              }
            />
          ) : null
        }
      />

      {/* Trainer Assignment Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Trainer</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select a coach for {selectedClient?.profile?.full_name}
            </Text>

            <View style={styles.trainerList}>
              <TouchableOpacity
                style={styles.trainerOption}
                onPress={() => handleAssignTrainer(null)}
              >
                <Text style={styles.unassignText}>— Unassign Trainer —</Text>
              </TouchableOpacity>

              {trainers.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.trainerOption,
                    selectedClient?.assigned_trainer_id === t.id && styles.trainerOptionSelected,
                  ]}
                  onPress={() => handleAssignTrainer(t.id)}
                  disabled={submitting}
                >
                  <Avatar name={t.full_name} photoUrl={t.photo_url} size="sm" />
                  <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                    <Text style={styles.trainerOptionName}>{t.full_name}</Text>
                    <Text style={styles.trainerOptionSub}>
                      {t.assignedClientsCount} Active Clients
                    </Text>
                  </View>
                  {selectedClient?.assigned_trainer_id === t.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Membership Plan Assignment Modal */}
      <Modal
        visible={membershipModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMembershipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renew / Assign Plan</Text>
              <TouchableOpacity onPress={() => setMembershipModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Update subscription for {selectedClient?.profile?.full_name}
            </Text>

            <View style={styles.planOptions}>
              {[
                { type: 'monthly' as MembershipPlanType, months: 1, label: 'Monthly (1 Month)' },
                { type: 'quarterly' as MembershipPlanType, months: 3, label: 'Quarterly (3 Months)' },
                { type: 'half_yearly' as MembershipPlanType, months: 6, label: 'Half-Yearly (6 Months)' },
                { type: 'yearly' as MembershipPlanType, months: 12, label: 'Yearly (12 Months)' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.type}
                  style={styles.planCard}
                  onPress={() => handleAssignMembership(p.type, p.months)}
                  disabled={submitting}
                >
                  <View>
                    <Text style={styles.planName}>{p.label}</Text>
                    <Text style={styles.planDuration}>Full Facility Access</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.primaryLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick-Enroll Member Modal */}
      <Modal
        visible={addMemberVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMemberVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Enroll New Member</Text>
                <Text style={styles.modalSub}>Create profile & assign membership</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAddMemberVisible(false);
                  resetAddMemberForm();
                }}
              >
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={() => 'form'}
              showsVerticalScrollIndicator={false}
              renderItem={() => (
                <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
                  <Input
                    label="Full Name *"
                    placeholder="e.g. John Doe"
                    value={newFullName}
                    onChangeText={setNewFullName}
                    icon="person-outline"
                  />

                  <Input
                    label="Email Address *"
                    placeholder="e.g. john@example.com"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    icon="mail-outline"
                  />

                  <Input
                    label="Phone Number"
                    placeholder="e.g. +1 555-0199"
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                    icon="call-outline"
                  />

                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Emergency Contact"
                        placeholder="Name"
                        value={newEmergencyName}
                        onChangeText={setNewEmergencyName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Emergency Phone"
                        placeholder="Phone"
                        value={newEmergencyPhone}
                        onChangeText={setNewEmergencyPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <Input
                    label="Medical Notes / Allergies"
                    placeholder="e.g. Asthma, Knee Injury (comma separated)"
                    value={newMedicalNotes}
                    onChangeText={setNewMedicalNotes}
                    icon="medkit-outline"
                  />

                  {/* Initial Membership Plan Selection */}
                  <Text style={styles.formSectionTitle}>Initial Membership Plan</Text>
                  <View style={styles.planPillContainer}>
                    {[
                      { type: 'monthly' as MembershipPlanType, months: 1, label: '1M' },
                      { type: 'quarterly' as MembershipPlanType, months: 3, label: '3M' },
                      { type: 'half_yearly' as MembershipPlanType, months: 6, label: '6M' },
                      { type: 'yearly' as MembershipPlanType, months: 12, label: '1Y' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.type}
                        style={[
                          styles.planPill,
                          newPlanType === p.type && styles.planPillActive,
                        ]}
                        onPress={() => {
                          setNewPlanType(p.type);
                          setNewPlanMonths(p.months);
                        }}
                      >
                        <Text
                          style={[
                            styles.planPillText,
                            newPlanType === p.type && styles.planPillTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Assign Coach Selection */}
                  <Text style={styles.formSectionTitle}>Assign Coach (Optional)</Text>
                  <View style={styles.trainerChipList}>
                    <TouchableOpacity
                      style={[
                        styles.trainerChip,
                        newAssignedTrainerId === null && styles.trainerChipActive,
                      ]}
                      onPress={() => setNewAssignedTrainerId(null)}
                    >
                      <Text
                        style={[
                          styles.trainerChipText,
                          newAssignedTrainerId === null && styles.trainerChipTextActive,
                        ]}
                      >
                        Unassigned
                      </Text>
                    </TouchableOpacity>
                    {trainers.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.trainerChip,
                          newAssignedTrainerId === t.id && styles.trainerChipActive,
                        ]}
                        onPress={() => setNewAssignedTrainerId(t.id)}
                      >
                        <Text
                          style={[
                            styles.trainerChipText,
                            newAssignedTrainerId === t.id && styles.trainerChipTextActive,
                          ]}
                        >
                          {t.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Button
                    title="Enroll Member"
                    onPress={handleCreateMember}
                    loading={creatingMember}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              )}
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  filterTabTextActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
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
  clientInfo: {
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionTextSecondary: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionTextPrimary: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  trainerList: {
    gap: spacing.sm,
  },
  trainerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  trainerOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  trainerOptionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  trainerOptionSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  unassignText: {
    color: colors.dangerLight,
    fontSize: fontSize.xs,
    textAlign: 'center',
    flex: 1,
  },
  planOptions: {
    gap: spacing.sm,
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planDuration: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addMemberBtnText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  formSectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  planPillContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  planPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  planPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '25',
  },
  planPillText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  planPillTextActive: {
    color: colors.primaryLight,
    fontWeight: fontWeight.bold,
  },
  trainerChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  trainerChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trainerChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '25',
  },
  trainerChipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  trainerChipTextActive: {
    color: colors.primaryLight,
    fontWeight: fontWeight.semibold,
  },
});
