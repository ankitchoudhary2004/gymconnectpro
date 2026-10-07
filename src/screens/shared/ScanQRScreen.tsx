// ============================================
// GymTrack Pro - QR Scanner Screen (Client & Trainer)
// ============================================
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import attendanceService from '../../services/attendanceService';
import Button from '../../components/common/Button';
import { ScanResult } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

export default function ScanQRScreen() {
  const { user, role } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);

  // Animation for scan line
  const scanLineAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!scanned) {
      // Animate scan line
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [scanned, scanLineAnim]);

  const getDeviceId = (): string => {
    // Use device info to create a fingerprint
    return `${Device.brand}_${Device.modelName}_${Device.osVersion}_${Device.deviceName}`;
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || !user || !role) return;

    setScanned(true);
    setProcessing(true);

    try {
      const qrData = JSON.parse(data);

      if (!qrData.gymId || !qrData.secret) {
        setScanResult({
          status: 'error',
          message: 'Invalid QR code. This is not a GymTrack Pro QR.',
        });
        setProcessing(false);
        return;
      }

      const deviceId = getDeviceId();
      const result = await attendanceService.processScan(
        user.id,
        role,
        deviceId,
        qrData.secret,
        qrData.gymId
      );

      setScanResult(result);
    } catch (err) {
      setScanResult({
        status: 'error',
        message: 'Could not read QR code. Please try again.',
      });
    }

    setProcessing(false);
  };

  const handleSimulatedScan = async () => {
    if (scanned || processing || !user || !role) return;
    setScanned(true);
    setProcessing(true);
    try {
      const { data: gym } = await supabase
        .from('gyms')
        .select('id, qr_secret')
        .limit(1)
        .maybeSingle();

      if (!gym) {
        setScanResult({
          status: 'error',
          message: 'No active gym record found in database.',
        });
        setProcessing(false);
        return;
      }

      const deviceId = getDeviceId();
      const result = await attendanceService.processScan(
        user.id,
        role,
        deviceId,
        gym.qr_secret,
        gym.id
      );
      setScanResult(result);
    } catch (err: any) {
      setScanResult({
        status: 'error',
        message: err.message || 'Simulation failed.',
      });
    }
    setProcessing(false);
  };

  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
  };

  const getResultConfig = (status: string, message?: string) => {
    const isCheckOut = message?.toLowerCase().includes('checked out');
    if (isCheckOut) {
      return {
        icon: 'log-out' as const,
        color: '#00D2FF',
        gradient: ['#0984E3', '#00D2FF'] as [string, string],
        title: status === 'expiring_soon' ? 'Checked Out (Expiring Soon)' : 'Check-out Successful!',
      };
    }

    switch (status) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success,
          gradient: ['#00B894', '#55EFC4'] as [string, string],
          title: 'Check-in Successful!',
        };
      case 'expiring_soon':
        return {
          icon: 'time' as const,
          color: colors.warning,
          gradient: ['#FDCB6E', '#E17055'] as [string, string],
          title: 'Checked In — Membership Expiring',
        };
      case 'expired':
        return {
          icon: 'close-circle' as const,
          color: colors.danger,
          gradient: ['#FF6B6B', '#E17055'] as [string, string],
          title: 'Membership Expired',
        };
      case 'device_mismatch':
        return {
          icon: 'phone-portrait' as const,
          color: colors.danger,
          gradient: ['#FF6B6B', '#E17055'] as [string, string],
          title: 'Device Mismatch',
        };
      default:
        return {
          icon: 'alert-circle' as const,
          color: colors.danger,
          gradient: ['#FF6B6B', '#E17055'] as [string, string],
          title: 'Scan Error',
        };
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera" size={64} color={colors.textMuted} />
        <Text style={styles.permissionText}>Checking camera access...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.warning} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          GymTrack Pro requires camera access to scan entrance QR codes.
        </Text>
        <Button
          title="Grant Camera Permission"
          onPress={requestPermission}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {!scanned ? (
        // Camera view with scanner overlay
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />

          {/* Scanner overlay */}
          <View style={styles.overlay}>
            {/* Top */}
            <View style={styles.overlaySection}>
              <Text style={styles.scanTitle}>Scan Gym QR Code</Text>
              <Text style={styles.scanSubtitle}>
                Point your camera at the QR code at the gym entrance
              </Text>
            </View>

            {/* Middle - scan area */}
            <View style={styles.scanAreaRow}>
              <View style={styles.overlayFill} />
              <View style={styles.scanArea}>
                {/* Corner accents */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Animated scan line */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, SCAN_AREA_SIZE - 4],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <View style={styles.overlayFill} />
            </View>

            {/* Bottom */}
            <View style={styles.overlaySection}>
              {processing ? (
                <View style={styles.processingBadge}>
                  <Ionicons name="hourglass" size={16} color={colors.accent} />
                  <Text style={styles.processingText}>Verifying...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.simButton}
                  onPress={handleSimulatedScan}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={16} color={colors.warning} />
                  <Text style={styles.simButtonText}>⚡ Quick Test Scan (Simulator)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : (
        // Result view
        <View style={styles.resultContainer}>
          {scanResult && (() => {
            const config = getResultConfig(scanResult.status, scanResult.message);
            return (
              <>
                <LinearGradient
                  colors={config.gradient}
                  style={styles.resultIconContainer}
                >
                  <Ionicons name={config.icon} size={64} color="#fff" />
                </LinearGradient>
                <Text style={[styles.resultTitle, { color: config.color }]}>
                  {config.title}
                </Text>
                <Text style={styles.resultMessage}>{scanResult.message}</Text>

                {scanResult.daysUntilExpiry !== undefined && (
                  <View style={styles.expiryBadge}>
                    <Ionicons name="calendar" size={16} color={colors.warning} />
                    <Text style={styles.expiryText}>
                      {scanResult.daysUntilExpiry} days remaining
                    </Text>
                  </View>
                )}

                <View style={styles.resultActions}>
                  <Button
                    title="Scan Again"
                    onPress={resetScanner}
                    variant="primary"
                    icon={<Ionicons name="qr-code" size={18} color="#fff" />}
                  />
                </View>
              </>
            );
          })()}
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  overlayFill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanAreaRow: {
    flexDirection: 'row',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  scanSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
  },
  processingText: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  resultIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.glow,
  },
  resultTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  expiryText: {
    fontSize: fontSize.md,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
  resultActions: {
    width: '100%',
    marginTop: spacing.md,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderWidth: 1,
    borderColor: colors.warning + '60',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    marginTop: spacing.sm,
  },
  simButtonText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
});
