# Hungarian Law MCP

[![npm](https://img.shields.io/npm/v/@ansvar/hungarian-law-mcp)](https://www.npmjs.com/package/@ansvar/hungarian-law-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/Hungarian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Hungarian-law-mcp/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server providing access to Hungarian legislation covering data protection, cybersecurity, e-commerce, and criminal law provisions.

**MCP Registry:** `eu.ansvar/hungarian-law-mcp`
**npm:** `@ansvar/hungarian-law-mcp`

## Quick Start

### Claude Desktop / Cursor (stdio)

```json
{
  "mcpServers": {
    "hungarian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/hungarian-law-mcp"]
    }
  }
}
```

### Remote (Streamable HTTP)

```
hungarian-law-mcp.vercel.app/mcp
```

## Data Sources

| Source | Authority | License |
|--------|-----------|---------|
| [Nemzeti Jogszabálytár (National Legislation Database)](https://njt.hu) | Magyar Közlöny (Hungarian Official Gazette) | Hungarian Government Open Data (public domain under Hungarian Copyright Act § 1) |

> Full provenance: [`sources.yml`](./sources.yml)

## Coverage

- Corpus coverage: `4304/4304` laws discovered from the `njt.hu` statute index are represented in `data/seed` (`hu-law-*` IDs), plus curated compatibility IDs.
- Text coverage: `4` legacy laws are metadata-only because their public `njt.hu` pages expose no extractable body text in HTML.
- Metadata-only laws:
  - `hu-law-1946-25-00-00`
  - `hu-law-1972-1-00-00`
  - `hu-law-1989-31-00-00`
  - `hu-law-2010-16-00-00`
- OCR fallback is intentionally not used to avoid introducing non-canonical or error-prone legal text.

## Tools

| Tool | Description |
|------|-------------|
| `search_legislation` | Full-text search across provisions |
| `get_provision` | Retrieve specific article/section |
| `validate_citation` | Validate legal citation |
| `check_currency` | Check if statute is in force |
| `get_eu_basis` | EU legal basis cross-references |
| `get_hungarian_implementations` | National EU implementations |
| `search_eu_implementations` | Search EU documents |
| `validate_eu_compliance` | EU compliance check |
| `build_legal_stance` | Comprehensive legal research |
| `format_citation` | Citation formatting |
| `list_sources` | Data provenance |
| `about` | Server metadata |

## License

Apache-2.0
