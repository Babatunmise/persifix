import { describe, it, expect } from 'vitest';
import { interpret, type Input } from '../interpret';
import { getCategory } from '../evaluate';
import type { Baseline, Medication } from '../types';

const base = (sys: number, dia: number, distinctDays = 10): Baseline => ({
  sys, dia, distinctDays, sessions: distinctDays, sdSys: 0, sdDia: 0,
});

const run = (sys: number, dia: number, baseline: Baseline | null = null, medication: Medication = 'unknown') => {
  const input: Input = { current: { sys, dia, readingsInSession: 2 }, baseline, medication };
  return interpret(input, getCategory);
};

describe('baseline status', () => {
  it('is driven by distinct days', () => {
    expect(run(118, 76, base(118, 76, 2)).state).toBe('HEALTHY_FIRST');
    expect(run(118, 76, base(118, 76, 3)).state).toBe('STEADY');
  });
});

describe('first-reading family', () => {
  it('healthy first reading', () => expect(run(116, 74).state).toBe('HEALTHY_FIRST'));
  it('120/80 is borderline, not high first', () => {
    const r = run(120, 80);
    expect(r.state).toBe('BORDERLINE_FIRST');
    expect(r.copyKey).toContain('edge');
    expect(r.actionLevel).toBe('keep_logging');
  });
  it('134/84 is borderline but not on edge', () => {
    expect(run(134, 84).copyKey).not.toContain('edge');
  });
  it('150/90 on day one needs action', () => {
    const r = run(150, 90);
    expect(r.state).toBe('HIGH_FIRST');
    expect(r.actionLevel).toBe('recheck_now');
    expect(r.escalateIfRecheckPersists).toBe(true);
  });
  it('severe is never reassuring', () => {
    const r = run(185, 125);
    expect(r.state).toBe('HIGH_FIRST');
    expect(r.actionLevel).toBe('urgent');
  });
});

describe('relative states', () => {
  it('steady', () => {
    const r = run(118, 76, base(115, 75));
    expect(r.state).toBe('STEADY');
    expect(r.actionLevel).toBe('none');
  });
  it('provisional baseline hedges copy', () => {
    expect(run(117, 74, base(115, 75, 4)).copyKey).toContain('hedged');
  });
  it('150/90 vs 115/75 is significantly higher', () => {
    const r = run(150, 90, base(115, 75));
    expect(r.state).toBe('SIGNIFICANTLY_HIGHER');
  });
  it('slightly higher, Stage 1', () => {
    const r = run(134, 82, base(125, 78));
    expect(r.state).toBe('SLIGHTLY_HIGHER');
    expect(r.actionLevel).toBe('keep_logging');
  });
  it('big jump to healthy-ish number does not alarm', () => {
    const r = run(125, 78, base(100, 65));
    expect(r.state).toBe('SLIGHTLY_HIGHER');
    expect(r.copyKey).toContain('big_rise');
  });
  it('crossing into Stage 2 from lower usual is significant', () => {
    expect(run(142, 88, base(130, 84)).state).toBe('SIGNIFICANTLY_HIGHER');
  });
  it('chronic Stage 2 drifting up is calm', () => {
    const r = run(148, 92, base(140, 88));
    expect(r.state).toBe('SLIGHTLY_HIGHER');
    expect(r.actionLevel).toBe('see_clinician_soon');
  });
  it('steady at Stage 2 is not celebrated', () => {
    const r = run(152, 91, base(150, 90));
    expect(r.state).toBe('STEADY');
    expect(r.actionLevel).toBe('see_clinician_soon');
    expect(r.copyKey).toContain('above_goal');
  });
  it('better than usual healthy', () => {
    const r = run(122, 76, base(135, 85));
    expect(r.state).toBe('BETTER_THAN_USUAL');
    expect(r.copyKey).not.toContain('above_goal');
  });
  it('better than usual but above goal says so', () => {
    const r = run(132, 82, base(150, 95));
    expect(r.state).toBe('BETTER_THAN_USUAL');
    expect(r.copyKey).toContain('above_goal');
  });
});

describe('low guard', () => {
  it('never praises a low number', () => expect(run(85, 55, base(125, 80)).state).toBe('LOW_CHECK'));
  it('a person whose usual is low is not nagged', () => expect(run(89, 57, base(85, 55)).state).toBe('STEADY'));
  it('fires on a first reading too', () => expect(run(85, 55).state).toBe('LOW_CHECK'));
});

describe('medication context', () => {
  it('missed meds changes copy, never state', () => {
    const taken = run(132, 84, base(115, 75), 'taken');
    const missed = run(132, 84, base(115, 75), 'missed');
    expect(missed.state).toBe(taken.state);
    expect(missed.actionLevel).toBe(taken.actionLevel);
    expect(missed.copyKey).toContain('missed_meds');
    expect(taken.copyKey).not.toContain('missed_meds');
  });
  it('missed meds never softens high first reading', () => {
    expect(run(150, 90, null, 'missed').actionLevel).toBe('recheck_now');
  });
});