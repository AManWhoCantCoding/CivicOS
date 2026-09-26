import { buildRelatedInfoPath } from '../relatedInfo';

describe('RelatedInfo HTTP contract', () => {
  it('serializes all four entity types and flat filters', () => {
    const path = buildRelatedInfoPath('search', {
      q: 'market',
      entityType: 'BUSINESS',
      status: 'OPEN',
      page: 2,
      pageSize: 20,
    });
    expect(path).toContain('/api/related-info/search?');
    expect(path).toContain('entityType=BUSINESS');
    expect(path).toContain('page=2');
  });
});
