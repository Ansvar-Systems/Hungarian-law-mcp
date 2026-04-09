/**
 * Response metadata utilities for Hungarian Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface CitationRef {
  tool: string;
  params: Record<string, string>;
}

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  data_age?: string;
  source_url?: string;
  copyright?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _meta: ResponseMetadata;
  _error_type?: string;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let data_age: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) data_age = row.value.slice(0, 10);
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
    data_age,
    source_url: 'https://njt.hu',
    copyright: 'Magyar Közlöny — Ministry of Justice, Hungary (public domain)',
  };
}
