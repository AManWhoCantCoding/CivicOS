import { describe, expect, it } from 'vitest';

import {
  ARTICLE_8_CATEGORY_IDS,
  INSPECTION_CATEGORIES,
  SECURITY_CHECKLIST_CAVEAT,
  SECURITY_VARIANTS,
  checklistForType,
} from '@/modules/inspections/checklist-catalog';

describe('LOCAL/DEMO checklist catalog', () => {
  it('maps the 11 selected categories to distinct, cited templates', () => {
    expect(INSPECTION_CATEGORIES).toHaveLength(11);
    for (const category of INSPECTION_CATEGORIES) {
      const items = checklistForType(category.label)!;
      expect(items.length).toBeGreaterThan(1);
      expect(
        items.every(({ source, sourceUrl }) => Boolean(source && sourceUrl)),
      ).toBe(true);
      expect(new Set(items.map(({ key }) => key)).size).toBe(items.length);
    }
    expect(checklistForType('Kinh doanh khí')).toBeNull();
  });

  it('includes Art. 8 only in the six accepted categories', () => {
    expect(ARTICLE_8_CATEGORY_IDS).toEqual([
      'games',
      'casino',
      'betting',
      'explosive-use',
      'blasting',
      'dance',
    ]);
    for (const category of INSPECTION_CATEGORIES) {
      const hasPlan = checklistForType(category.label)!.some(
        ({ key, required }) => key === 'security-plan' && required,
      );
      expect(hasPlan).toBe(
        ARTICLE_8_CATEGORY_IDS.includes(category.id as never),
      );
    }
  });

  it('maps reward games access and machine prompts to their accepted clauses only', () => {
    const games = checklistForType(
      INSPECTION_CATEGORIES.find(({ id }) => id === 'games')!.label,
    )!;
    const casino = checklistForType(
      INSPECTION_CATEGORIES.find(({ id }) => id === 'casino')!.label,
    )!;
    expect(games.find(({ key }) => key === 'games-access')?.source).toContain(
      '33 khoản 4',
    );
    expect(games.find(({ key }) => key === 'games-machines')?.source).toContain(
      '33 khoản 3',
    );
    expect(casino.some(({ key }) => key.includes('machines'))).toBe(false);
  });

  it('supports four security subvariants without introducing FDI criteria', () => {
    expect(SECURITY_VARIANTS).toHaveLength(4);
    for (const variant of SECURITY_VARIANTS) {
      const items = checklistForType(variant.value)!;
      expect(
        items.some(({ key }) => key === 'security-training-function'),
      ).toBe(variant.training);
      expect(
        items.some(({ label }) => /FDI|đầu tư nước ngoài/i.test(label)),
      ).toBe(false);
      expect(items.some(({ key }) => key === 'security-cross-province')).toBe(
        true,
      );
      expect(
        items.filter(({ key }) => key.startsWith('security-')),
      ).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ evidenceRequired: true }),
        ]),
      );
    }
    expect(SECURITY_CHECKLIST_CAVEAT).toContain('Điều 11');
    expect(SECURITY_CHECKLIST_CAVEAT).toContain('Điều 32 khoản 9');
    expect(SECURITY_CHECKLIST_CAVEAT).toContain('Không tải lên CivicOS');
  });

  it('requires training-function response only on training variants and keeps notices optional', () => {
    for (const variant of SECURITY_VARIANTS) {
      const items = checklistForType(variant.value)!;
      expect(
        items.find(({ key }) => key === 'security-training-function')
          ?.required ?? false,
      ).toBe(variant.training);
      expect(
        items.find(({ key }) => key === 'security-cross-province')?.required,
      ).toBe(false);
    }
  });

  it('cites amendment provisions and source records for pawn and amended prompts', () => {
    const pawn = checklistForType(
      INSPECTION_CATEGORIES.find(({ id }) => id === 'pawn')!.label,
    )!;
    for (const key of ['pawn-authorization', 'pawn-storage']) {
      const source = pawn.find((entry) => entry.key === key)!;
      expect(source.source).toContain('NĐ 56/2023/NĐ-CP, Điều 1 khoản 1');
      expect(source.sourceUrl).toBe(
        'https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-56-2023-nd-cp-39902.htm',
      );
    }
    const security = checklistForType(
      SECURITY_VARIANTS.find(({ training }) => training)!.value,
    )!;
    expect(
      security.find(({ key }) => key === 'security-training-staff')?.source,
    ).toContain('Điều 1 khoản 6, khoản 7');
    expect(
      security.find(({ key }) => key === 'security-training-function')?.source,
    ).toContain('Điều 1 khoản 6, khoản 7');
    const blasting = checklistForType(
      INSPECTION_CATEGORIES.find(({ id }) => id === 'blasting')!.label,
    )!;
    expect(
      blasting.find(({ key }) => key === 'blasting-notice')?.source,
    ).toContain('Điều 1 khoản 17');
  });
});
