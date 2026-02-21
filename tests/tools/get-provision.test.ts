import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getProvision } from '../../src/tools/get-provision.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../data/database.db');

describe('getProvision', () => {
  let db: InstanceType<typeof Database>;

  beforeAll(() => {
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  });
  afterAll(() => {
    db.close();
  });

  it('should retrieve Infotörvény § 1 (data protection scope)', async () => {
    const result = await getProvision(db, { document_id: 'act-cxii-2011-info-self-determination', section: '1' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toContain('informational self-determination');
    expect(result.results[0].content).toContain('Regulation (EU) 2016/679');
  });

  it('should retrieve Ibtv. § 11 (incident reporting)', async () => {
    const result = await getProvision(db, { document_id: 'act-l-2013-electronic-info-security', section: '11' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toContain('24 hours');
    expect(result.results[0].content).toContain('incident');
  });

  it('should retrieve Criminal Code § 422 (unauthorised access)', async () => {
    const result = await getProvision(db, { document_id: 'criminal-code-cybercrime', section: '422' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toContain('unauthorised access');
    expect(result.results[0].content).toContain('information system');
  });

  it('should retrieve Trade Secrets Act § 2 (definition)', async () => {
    const result = await getProvision(db, { document_id: 'act-liv-2018-trade-secrets', section: '2' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toContain('trade secret');
    expect(result.results[0].content).toContain('Directive (EU) 2016/943');
  });

  it('should retrieve eIDAS Act § 10 (electronic signatures)', async () => {
    const result = await getProvision(db, { document_id: 'act-ccxxii-2015-trust-services', section: '10' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].content).toContain('electronic signature');
    expect(result.results[0].content).toContain('eIDAS');
  });

  it('should retrieve all provisions for a document when no ref given', async () => {
    const result = await getProvision(db, { document_id: 'act-l-2013-electronic-info-security' });
    expect(result.results.length).toBeGreaterThanOrEqual(15);
    expect(result.results[0].document_id).toBe('act-l-2013-electronic-info-security');
  });

  it('should return empty for non-existent document', async () => {
    const result = await getProvision(db, { document_id: '2099-evi-MMMM-torveny', section: '1' });
    expect(result.results).toHaveLength(0);
  });

  it('should return empty for non-existent provision', async () => {
    const result = await getProvision(db, { document_id: 'act-cxii-2011-info-self-determination', section: '999ZZZ' });
    expect(result.results).toHaveLength(0);
  });

  it('should resolve document by title_en via fuzzy match', async () => {
    const result = await getProvision(db, { document_id: 'Informational Self-Determination', section: '1' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].document_id).toBe('act-cxii-2011-info-self-determination');
  });

  it('should resolve document by short_name', async () => {
    const result = await getProvision(db, { document_id: 'Ibtv.', section: '1' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].document_id).toBe('act-l-2013-electronic-info-security');
  });

  it('should include URL from njt.hu', async () => {
    const result = await getProvision(db, { document_id: 'act-cxii-2011-info-self-determination', section: '1' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toContain('njt.hu');
  });

  it('should include metadata in response', async () => {
    const result = await getProvision(db, { document_id: 'act-cxii-2011-info-self-determination', section: '1' });
    expect(result._metadata).toBeDefined();
  });
});
