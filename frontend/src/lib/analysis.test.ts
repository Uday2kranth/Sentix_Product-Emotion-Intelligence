import { describe, expect, it } from 'vitest';
import { buildDemoAnalysisResult, mapHeadersToColumns } from './analysis';

describe('mapHeadersToColumns', () => {
  it('maps review, brand, and model headers', () => {
    const mapping = mapHeadersToColumns(['Date', 'Review Content', 'Stars', 'Brand Name', 'Model No']);

    expect(mapping).toEqual({
      reviewColumn: 'Review Content',
      productName: null,
      brand: 'Brand Name',
      modelNumber: 'Model No'
    });
  });
});

describe('buildDemoAnalysisResult', () => {
  it('returns schema-compatible data', () => {
    const result = buildDemoAnalysisResult({
      id: 'row-1',
      text: 'Amazing battery life and crisp display.',
      metadata: { brand: 'Acme' }
    });

    expect(result.id).toBe('row-1');
    expect(result.text).toContain('Amazing battery life');
    expect(result.primaryEmotion).toBeDefined();
    expect(result.emotions).toHaveLength(7);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.timestamp).toBeTypeOf('number');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
  });
});
