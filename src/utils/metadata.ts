/**
 * Response metadata utilities for Hungarian Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: 'Nemzeti Jogszabálytár (National Legislation Database) (njt.hu) — Magyar Közlöny (Hungarian Official Gazette)',
    jurisdiction: 'HU',
    disclaimer:
      'This data is sourced from the Nemzeti Jogszabálytár (National Legislation Database) under public domain. ' +
      'The authoritative versions are maintained by Magyar Közlöny (Hungarian Official Gazette). ' +
      'Always verify with the official Nemzeti Jogszabálytár (National Legislation Database) portal (njt.hu).',
    freshness,
  };
}
