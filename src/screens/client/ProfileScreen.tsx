import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import healthService from '../../services/healthService';
import clientService from '../../services/clientService';
import { Client, HealthRecord } from '../../types';
import { supabase } from '../../config/supabase';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [latestHealth, setLatestHealth] = useState<HealthRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editMedicalConditions, setEditMedicalConditions] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleOpenEditModal = () => {
    setEditFullName(profile?.full_name || '');
    setEditPhone(profile?.phone || '');
    setEditEmergencyName(clientData?.emergency_contact_name || '');
    setEditEmergencyPhone(clientData?.emergency_contact_phone || '');
    setEditMedicalConditions(
      [...(clientData?.medical_conditions || []), ...(clientData?.allergies || [])].join(', ')
    );
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editFullName.trim()) {
      Alert.alert('Required', 'Full Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      // 1. Update profiles table
      const { error: profError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          phone: editPhone.trim() || null,
        })
        .eq('id', user.id);

      if (profError) throw profError;

      // 2. Update clients table
      if (clientData?.id) {
        const medicalArr = editMedicalConditions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const { error: clientError } = await supabase
          .from('clients')
          .update({
            emergency_contact_name: editEmergencyName.trim() || null,
            emergency_contact_phone: editEmergencyPhone.trim() || null,
            medical_conditions: medicalArr,
          })
          .eq('id', clientData.id);

        if (clientError) throw clientError;
      }

      await refreshProfile();
      await loadData();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (client) {
        const [fullClient, health] = await Promise.all([
          clientService.getClientById(client.id),
          healthService.getLatestHealthRecord(client.id),
        ]);
        setClientData(fullClient);
        setLatestHealth(health);
      }
    } catch (err) {
      console.error('Error loading client profile:', err);
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of GymTrack Pro?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const membership = clientData?.membership;
  const isMembershipActive = membership?.status === 'active';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar
            name={profile?.full_name || 'Member'}
            photoUrl={profile?.photo_url}
            size="xl"
          />
          <Text style={styles.userName}>{profile?.full_name || 'Member'}</Text>
          <Text style={styles.userEmail}>{profile?.email || profile?.phone || ''}</Text>

          <TouchableOpacity style={styles.editProfileBtn} onPress={handleOpenEditModal}>
            <Ionicons name="create-outline" size={15} color={colors.primaryLight} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Digital Membership Pass Card */}
        <LinearGradient
          colors={isMembershipActive ? ['#6C5CE7', '#341f97'] : ['#2d3436', '#1e272e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passCard}
        >
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passGymName}>GYMTRACK PRO PASS</Text>
              <Text style={styles.passTier}>
                {membership?.plan_type ? membership.plan_type.toUpperCase() : 'STANDARD'} ACCESS
              </Text>
            </View>
            <Badge
              label={membership?.status || 'Expired'}
              variant={isMembershipActive ? 'active' : 'expired'}
              size="sm"
            />
          </View>

          <View style={styles.passBody}>
            <View>
              <Text style={styles.passLabel}>Valid Until</Text>
              <Text style={styles.passValue}>
                {membership?.expiry_date || 'No Active Membership'}
              </Text>
            </View>
            <View>
              <Text style={styles.passLabel}>Coach</Text>
              <Text style={styles.passValue}>
                {clientData?.trainer?.full_name || 'Personal'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body Measurements & Vitals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Vitals & Measurements</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalVal}>
                {latestHealth?.weight_kg ? `${latestHealth.weight_kg} kg` : '—'}
              </Text>
              <Text style={styles.vitalLbl}>Weight</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalVal}>
                {latestHealth?.height_cm ? `${latestHealth.height_cm} cm` : '—'}
              </Text>
              <Text style={styles.vitalLbl}>Height</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={[styles.vitalVal, { color: colors.accentLight }]}>
                {latestHealth?.bmi ?? '—'}
              </Text>
              <Text style={styles.vitalLbl}>BMI Score</Text>
            </View>
            <View style={styles.vitalCard}>
              <Text style={styles.vitalVal}>
                {latestHealth?.body_fat_pct ? `${latestHealth.body_fat_pct}%` : '—'}
              </Text>
              <Text style={styles.vitalLbl}>Body Fat</Text>
            </View>
          </View>
        </View>

        {/* Emergency & Medical Safety */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Emergency Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoCol}>
                <Text style={styles.infoLbl}>Emergency Contact</Text>
                <Text style={styles.infoVal}>
                  {clientData?.emergency_contact_name
                    ? `${clientData.emergency_contact_name} (${clientData.emergency_contact_phone || 'N/A'})`
                    : 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons name="medkit-outline" size={18} color={colors.textMuted} />
              <View style={styles.infoCol}>
                <Text style={styles.infoLbl}>Medical Alert / Allergies</Text>
                <Text style={styles.infoVal}>
                  {clientData?.medical_conditions?.length || clientData?.allergies?.length
                    ? [...(clientData?.medical_conditions || []), ...(clientData?.allergies || [])].join(
                        ', '
                      )
                    : 'None reported'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.dangerLight} />
          <Text style={styles.signOutText}>Sign Out of Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSub}>Update your personal & safety details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
                <Input
                  label="Full Name *"
                  placeholder="Your full name"
                  value={editFullName}
                  onChangeText={setEditFullName}
                  icon="person-outline"
                />

                <Input
                  label="Phone Number"
                  placeholder="e.g. +1 555-0199"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  icon="call-outline"
                />

                <Input
                  label="Emergency Contact Name"
                  placeholder="Contact Person Name"
                  value={editEmergencyName}
                  onChangeText={setEditEmergencyName}
                  icon="shield-checkmark-outline"
                />

                <Input
                  label="Emergency Contact Phone"
                  placeholder="e.g. +1 555-0188"
                  value={editEmergencyPhone}
                  onChangeText={setEditEmergencyPhone}
                  keyboardType="phone-pad"
                  icon="call-outline"
                />

                <Input
                  label="Medical Conditions / Allergies"
                  placeholder="e.g. Asthma, Peanut Allergy (comma separated)"
                  value={editMedicalConditions}
                  onChangeText={setEditMedicalConditions}
                  icon="medkit-outline"
                />

                <Button
                  title="Save Profile Changes"
                  onPress={handleSaveProfile}
                  loading={savingProfile}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  passCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  passGymName: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  passTier: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  passBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passLabel: {
    fontSize: fontSize.xs - 2,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  passValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  vitalsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  vitalVal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  vitalLbl: {
    fontSize: fontSize.xs - 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoCol: {
    flex: 1,
  },
  infoLbl: {
    fontSize: fontSize.xs - 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '40',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  signOutText: {
    color: colors.dangerLight,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  editProfileBtnText: {
    color: colors.primaryLight,
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
});
