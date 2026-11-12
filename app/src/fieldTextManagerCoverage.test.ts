import { describe, expect, it } from 'vitest';
import { FIELD_CONTROL_INVENTORY, RENDERED_FIELD_TEXT_IDS, isActiveVisibilityControl, orderFieldIdsWithinSection } from './fieldInventory';
import { FIELD_DEFINITION_BY_ID } from './fieldDefinitions';

describe('Field Manager complete rendered text-editor coverage', () => {
  it('lists unique connected, formally defined and live-presented controls', () => {
    expect(new Set(RENDERED_FIELD_TEXT_IDS).size).toBe(RENDERED_FIELD_TEXT_IDS.length);
    expect(RENDERED_FIELD_TEXT_IDS).toHaveLength(35);
    for (const id of RENDERED_FIELD_TEXT_IDS) {
      expect(FIELD_CONTROL_INVENTORY.some(item => item.id===id)).toBe(true);
      expect(FIELD_DEFINITION_BY_ID[id]).toBeDefined();
      expect(isActiveVisibilityControl(id)).toBe(true);
    }
  });
  it('includes all Review and Psychology labels consumed by the current editor', () => {
    for (const id of [
      'review.mistakes','review.exitReason','review.exitNote','review.note',
      'review.decisionQuality','review.executionQuality','review.managementQuality',
      'psychology.intensity','rule.note',
    ]) expect(RENDERED_FIELD_TEXT_IDS).toContain(id);
  });
  it('reorders all four live Review summary fields without changing their identity or content', () => {
    const ids=['review.decisionQuality','review.executionQuality','review.managementQuality','review.exitReason'] as const;
    expect(orderFieldIdsWithinSection(ids,{})).toEqual(ids);
    const reordered=orderFieldIdsWithinSection(ids,{'review.exitReason':0,'review.decisionQuality':1,'review.executionQuality':2,'review.managementQuality':3});
    expect(reordered).toEqual(['review.exitReason','review.decisionQuality','review.executionQuality','review.managementQuality']);
    expect(new Set(reordered)).toEqual(new Set(ids));
  });
});
