import { describe, it } from 'node:test';
import assert from 'node:assert';
import { colors, spacing, fontSize, borderRadius } from '../src/theme';

// ============================================================
// 1. Theme & Design System Integrity Tests
// ============================================================
describe('Theme & Design Tokens', () => {
  it('should have all essential brand colors defined', () => {
    assert.ok(colors.primary, 'Primary color must be defined');
    assert.ok(colors.background, 'Background color must be defined');
    assert.ok(colors.surface, 'Surface color must be defined');
    assert.ok(colors.success, 'Success color must be defined');
    assert.ok(colors.danger, 'Danger color must be defined');
    assert.ok(colors.warning, 'Warning color must be defined');
    assert.strictEqual(colors.background, '#0F0F1A', 'Background should match dark palette');
    assert.strictEqual(colors.primary, '#6C5CE7', 'Primary accent should match purple glow');
  });

  it('should define structured spacing scales', () => {
    assert.strictEqual(spacing.xs, 4);
    assert.strictEqual(spacing.sm, 8);
    assert.strictEqual(spacing.md, 16);
    assert.strictEqual(spacing.lg, 24);
    assert.strictEqual(spacing.xl, 32);
  });

  it('should define consistent typography and radius scales', () => {
    assert.ok(fontSize.xs < fontSize.sm);
    assert.ok(fontSize.sm < fontSize.md);
    assert.ok(fontSize.md < fontSize.lg);
    assert.ok(borderRadius.sm < borderRadius.md);
    assert.ok(borderRadius.md < borderRadius.lg);
  });
});

// ============================================================
// 2. Health Metrics & BMI Computation Tests
// ============================================================
describe('Health Metrics Calculation', () => {
  const calculateBMI = (weightKg: number, heightCm: number): number => {
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  };

  it('should calculate BMI accurately for normal range', () => {
    // 70 kg, 175 cm => 70 / (1.75 * 1.75) = 22.857... => 22.9
    const bmi = calculateBMI(70, 175);
    assert.strictEqual(bmi, 22.9);
  });

  it('should calculate BMI accurately for athletic/muscular profile', () => {
    // 85 kg, 180 cm => 85 / (1.8 * 1.8) = 26.234... => 26.2
    const bmi = calculateBMI(85, 180);
    assert.strictEqual(bmi, 26.2);
  });

  it('should round correctly to single decimal place', () => {
    const bmi = calculateBMI(60, 165); // 60 / (1.65^2) = 22.038 => 22.0
    assert.strictEqual(bmi, 22.0);
  });
});

// ============================================================
// 3. Attendance Streak Calculation Algorithm Tests
// ============================================================
describe('Attendance Streak Calculation Logic', () => {
  const calculateStreak = (historyDates: string[], referenceDate: Date = new Date()): number => {
    if (!historyDates || historyDates.length === 0) return 0;

    const todayDate = new Date(referenceDate);
    todayDate.setHours(0, 0, 0, 0);

    const latestDate = new Date(historyDates[0]);
    latestDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If latest attendance was more than 1 day ago, streak is broken
    if (diffDays > 1) return 0;

    const startDate = diffDays === 0 ? todayDate : latestDate;
    let streak = 0;

    for (let i = 0; i < historyDates.length; i++) {
      const attendanceDate = new Date(historyDates[i]);
      attendanceDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(startDate);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (attendanceDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  it('should return 0 when attendance history is empty', () => {
    assert.strictEqual(calculateStreak([]), 0);
  });

  it('should calculate continuous 4-day streak including today', () => {
    const refDate = new Date('2026-10-07T10:00:00Z');
    const history = ['2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04'];
    assert.strictEqual(calculateStreak(history, refDate), 4);
  });

  it('should preserve streak if attended yesterday but not yet checked in today (morning use-case)', () => {
    const refDate = new Date('2026-10-07T08:00:00Z');
    // Checked in yesterday, today hasn't happened yet
    const history = ['2026-10-06', '2026-10-05', '2026-10-04'];
    assert.strictEqual(calculateStreak(history, refDate), 3);
  });

  it('should reset streak to 0 if member missed 2 or more consecutive days', () => {
    const refDate = new Date('2026-10-07T10:00:00Z');
    // Last checked in on 2026-10-04 (missed 5th and 6th)
    const history = ['2026-10-04', '2026-10-03', '2026-10-02'];
    assert.strictEqual(calculateStreak(history, refDate), 0);
  });
});

// ============================================================
// 4. Membership Expiry & Validation Rules Tests
// ============================================================
describe('Membership Validity & Rules', () => {
  type MembershipStatusResult = 'active' | 'expiring_soon' | 'expired';

  const evaluateMembership = (
    expiryDateStr: string,
    currentDate: Date = new Date()
  ): { status: MembershipStatusResult; daysLeft: number } => {
    const expiryDate = new Date(expiryDateStr);
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return { status: 'expired', daysLeft };
    }
    if (daysLeft <= 7) {
      return { status: 'expiring_soon', daysLeft };
    }
    return { status: 'active', daysLeft };
  };

  it('should return active for plans with plenty of time remaining', () => {
    const now = new Date('2026-10-07');
    const result = evaluateMembership('2026-11-07', now);
    assert.strictEqual(result.status, 'active');
    assert.ok(result.daysLeft > 7);
  });

  it('should return expiring_soon when within 7-day warning threshold', () => {
    const now = new Date('2026-10-07');
    const result = evaluateMembership('2026-10-12', now);
    assert.strictEqual(result.status, 'expiring_soon');
    assert.strictEqual(result.daysLeft, 5);
  });

  it('should return expiring_soon on the exact expiry day (0 days left)', () => {
    const now = new Date('2026-10-07');
    const result = evaluateMembership('2026-10-07', now);
    assert.strictEqual(result.status, 'expiring_soon');
    assert.strictEqual(result.daysLeft, 0);
  });

  it('should return expired when past expiry date', () => {
    const now = new Date('2026-10-07');
    const result = evaluateMembership('2026-10-05', now);
    assert.strictEqual(result.status, 'expired');
    assert.strictEqual(result.daysLeft, -2);
  });
});

// ============================================================
// 5. Workout Session Duration Formatting Tests
// ============================================================
describe('Workout Session Duration Formatting', () => {
  const formatDuration = (checkInIso: string, checkOutIso: string): { durationMinutes: number; formatted: string } => {
    const checkIn = new Date(checkInIso);
    const checkOut = new Date(checkOutIso);
    const durationMinutes = Math.max(
      1,
      Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60))
    );
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const formatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    return { durationMinutes, formatted };
  };

  it('should format short sessions under 1 hour correctly', () => {
    const inTime = '2026-10-07T09:00:00Z';
    const outTime = '2026-10-07T09:45:00Z';
    const res = formatDuration(inTime, outTime);
    assert.strictEqual(res.durationMinutes, 45);
    assert.strictEqual(res.formatted, '45 min');
  });

  it('should format sessions over 1 hour into hours and minutes', () => {
    const inTime = '2026-10-07T09:00:00Z';
    const outTime = '2026-10-07T10:25:00Z';
    const res = formatDuration(inTime, outTime);
    assert.strictEqual(res.durationMinutes, 85);
    assert.strictEqual(res.formatted, '1h 25m');
  });

  it('should enforce minimum 1 minute duration for instant scans', () => {
    const inTime = '2026-10-07T09:00:00Z';
    const outTime = '2026-10-07T09:00:10Z';
    const res = formatDuration(inTime, outTime);
    assert.strictEqual(res.durationMinutes, 1);
    assert.strictEqual(res.formatted, '1 min');
  });
});

// ============================================================
// 6. Device Fingerprinting & Buddy-Punching Prevention Tests
// ============================================================
describe('Device Fingerprinting & Lock Security', () => {
  const verifyDevice = (
    registeredDeviceId: string | null,
    currentDeviceId: string
  ): { allowed: boolean; reason?: 'device_mismatch' | 'registered_new' } => {
    if (!registeredDeviceId) {
      return { allowed: true, reason: 'registered_new' };
    }
    if (registeredDeviceId === currentDeviceId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'device_mismatch' };
  };

  it('should register and allow check-in on first device scan', () => {
    const check = verifyDevice(null, 'Apple_iPhone15Pro_iOS18_JohnsPhone');
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.reason, 'registered_new');
  });

  it('should allow check-in from the authorized registered device', () => {
    const check = verifyDevice(
      'Samsung_GalaxyS24_Android14_AdminPhone',
      'Samsung_GalaxyS24_Android14_AdminPhone'
    );
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.reason, undefined);
  });

  it('should block check-in and detect mismatch when attempted from different device', () => {
    const check = verifyDevice(
      'Apple_iPhone15Pro_iOS18_JohnsPhone',
      'Google_Pixel8_Android14_AttackerPhone'
    );
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'device_mismatch');
  });
});

// ============================================================
// 7. Accidental Double-Tap / Debounce Check-in Protection Tests
// ============================================================
describe('Anti-Double-Scan Debouncing', () => {
  const isDuplicateCheckOut = (
    lastCheckOutIso: string,
    currentAttemptTime: number,
    windowMs: number = 3 * 60 * 1000
  ): boolean => {
    const lastCheckOut = new Date(lastCheckOutIso).getTime();
    return currentAttemptTime - lastCheckOut < windowMs;
  };

  it('should detect and prevent double scan within 3 minutes', () => {
    const lastOut = '2026-10-07T10:00:00.000Z';
    const attemptTime = new Date('2026-10-07T10:01:30.000Z').getTime(); // 1.5 min later
    assert.strictEqual(isDuplicateCheckOut(lastOut, attemptTime), true);
  });

  it('should allow new scan after 3 minute debounce window elapses', () => {
    const lastOut = '2026-10-07T10:00:00.000Z';
    const attemptTime = new Date('2026-10-07T10:04:00.000Z').getTime(); // 4 min later
    assert.strictEqual(isDuplicateCheckOut(lastOut, attemptTime), false);
  });
});
