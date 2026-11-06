import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import type { EmergencySymptom } from '../types';

describe('Clinical Math Engine - ACC/AHA v1.1', () => {
  
  // --- BOUNDARY TESTS ---
  it('classifies 119/79 as Normal', () => {
    const result = evaluate(119, 79, undefined, [], false);
    expect(result.category).toBe('Normal');
  });

  it('classifies 120/79 as Elevated', () => {
    const result = evaluate(120, 79, undefined, [], false);
    expect(result.category).toBe('Elevated');
  });

  it('classifies 130/79 as Stage 1', () => {
    const result = evaluate(130, 79, undefined, [], false);
    expect(result.category).toBe('Stage 1');
  });

  it('classifies 140/89 as Stage 2', () => {
    const result = evaluate(140, 89, undefined, [], false);
    expect(result.category).toBe('Stage 2');
  });

  it('classifies 120/85 as Stage 1 (Diastolic drives the category)', () => {
    const result = evaluate(120, 85, undefined, [], false);
    expect(result.category).toBe('Stage 1');
  });

  // --- SEVERE RECHECK TESTS ---
  it('flags 180/80 as a Severe Recheck', () => {
    const result = evaluate(180, 80, undefined, [], false);
    expect(result.kind).toBe('severe_recheck');
  });

  it('flags 120/120 as a Severe Recheck', () => {
    const result = evaluate(120, 120, undefined, [], false);
    expect(result.kind).toBe('severe_recheck');
  });

  // --- THE P0 EMERGENCY OVERRIDE TESTS ---
  it('OVERRIDES normal BP (118/78) if a red-flag symptom is present', () => {
    const symptoms: EmergencySymptom[] = ['chest_pain'];
    const result = evaluate(118, 78, undefined, symptoms, false);
    expect(result.kind).toBe('emergency');
  });

  it('OVERRIDES severe BP (180/120) if a red-flag symptom is present', () => {
    const symptoms: EmergencySymptom[] = ['shortness_of_breath'];
    const result = evaluate(180, 120, undefined, symptoms, false);
    expect(result.kind).toBe('emergency');
  });

  // --- PULSE ALERT TESTS (Your Micro-fix) ---
  it('adds a pulse alert if pulse is >= 100', () => {
    const result = evaluate(120, 80, 105, [], false);
    expect(result.pulse_alert).toBe(true);
  });

  it('does not add a pulse alert if pulse is normal', () => {
    const result = evaluate(120, 80, 85, [], false);
    expect(result.pulse_alert).toBe(false);
  });

});