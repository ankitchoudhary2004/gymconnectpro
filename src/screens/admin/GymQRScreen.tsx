// ============================================
// GymTrack Pro - Admin Gym QR Screen
// ============================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../config/supabase';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Gym } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

// Generate a random secret for QR
const generateSecret = () => {
  return 'GTP_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
};

export default function GymQRScreen() {
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const loadGym = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') {
        // No gym exists, create one
        const newGym = {
          name: 'My Gym',
          qr_secret: generateSecret(),
          qr_last_rotated: new Date().toISOString().split('T')[0],
        };
        const { data: created, error: createError } = await supabase
          .from('gyms')
          .insert(newGym)
          .select()
          .single();

        if (!createError && created) {
          setGym(created);
        }
      } else if (data) {
        // Check if QR needs rotation (daily)
        const lastRotated = new Date(data.qr_last_rotated);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastRotated.setHours(0, 0, 0, 0);

        if (lastRotated < today) {
          // Rotate QR
          const newSecret = generateSecret();
          const { data: updated } = await supabase
            .from('gyms')
            .update({
              qr_secret: newSecret,
              qr_last_rotated: today.toISOString().split('T')[0],
            })
            .eq('id', data.id)
            .select()
            .single();

          setGym(updated || data);
        } else {
          setGym(data);
        }
      }
    } catch (err) {
      console.error('Load gym error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGym();
  }, [loadGym]);

  const handleRegenerateQR = async () => {
    if (!gym) return;

    Alert.alert(
      'Regenerate QR Code?',
      'This will invalidate the current QR. All members will need to scan the new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            const newSecret = generateSecret();
            const { data: updated } = await supabase
              .from('gyms')
              .update({
                qr_secret: newSecret,
                qr_last_rotated: new Date().toISOString().split('T')[0],
              })
              .eq('id', gym.id)
              .select()
              .single();

            if (updated) setGym(updated);
            setRegenerating(false);
          },
        },
      ]
    );
  };

  const qrValue = gym
    ? JSON.stringify({ gymId: gym.id, secret: gym.qr_secret })
    : '';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#2A1B5E', '#1A1A2E']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Gym QR Code</Text>
          <Text style={styles.headerSubtitle}>
            Display this at your gym entrance for members to scan
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* QR Card */}
          <Card style={styles.qrCard}>
            <View style={styles.qrContainer}>
              {gym && qrValue ? (
                <>
                  <View style={styles.qrFrame}>
                    <LinearGradient
                      colors={['#6C5CE7', '#A29BFE']}
                      style={styles.qrBorder}
                    >
                      <View style={styles.qrInner}>
                        <QRCode
                          value={qrValue}
                          size={220}
                          color={colors.qrForeground}
                          backgroundColor={colors.qrBackground}
                        />
                      </View>
                    </LinearGradient>
                  </View>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  <Text style={styles.qrHint}>
                    Members scan this QR from their app to check in
                  </Text>
                  <View style={styles.qrMeta}>
                    <View style={styles.qrMetaItem}>
                      <Ionicons name="refresh-circle" size={16} color={colors.success} />
                      <Text style={styles.qrMetaText}>
                        Last rotated: {formatDate(gym.qr_last_rotated)}
                      </Text>
                    </View>
                    <View style={styles.qrMetaItem}>
                      <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                      <Text style={styles.qrMetaText}>Auto-rotates daily</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.loadingContainer}>
                  <Ionicons name="qr-code-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.loadingText}>
                    {loading ? 'Loading QR...' : 'Setting up your gym QR...'}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Regenerate QR Code"
              onPress={handleRegenerateQR}
              variant="outline"
              icon={<Ionicons name="refresh" size={18} color={colors.primary} />}
              loading={regenerating}
            />

            <View style={{ height: spacing.sm }} />

            <Button
              title="Print QR Code"
              onPress={() => Alert.alert('Print', 'Open the QR on a larger screen to print or save.')}
              variant="secondary"
              icon={<Ionicons name="print-outline" size={18} color={colors.text} />}
            />
          </View>

          {/* Info Card */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 How it works</Text>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Print or display this QR code at your gym entrance</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>Members open the app and tap "Scan QR"</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>Attendance is recorded automatically with timestamp</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepText}>QR code rotates daily for security — screenshots won't work next day</Text>
            </View>
          </Card>

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
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrFrame: {
    marginBottom: spacing.lg,
  },
  qrBorder: {
    padding: 4,
    borderRadius: borderRadius.lg + 4,
    ...shadows.glow,
  },
  qrInner: {
    backgroundColor: colors.qrBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  gymName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  qrHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrMeta: {
    gap: spacing.sm,
  },
  qrMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.lg,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
