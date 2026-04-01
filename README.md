# Google Sheets Advanced MCP Server

An MCP server that gives AI assistants full control over Google Sheets — not just read/write, but charts, pivot tables, formulas, formatting, and analytics.

## What Makes This Different

Existing Google Sheets MCP servers only support basic CRUD (read cells, write cells). This server exposes the **full** Google Sheets API:

- **15 chart types** — bar, line, pie, scatter, histogram, waterfall, and more
- **Pivot tables** — group, aggregate, cross-tabulate
- **Conditional formatting** — color scales, value-based rules, custom formulas
- **Data validation** — dropdowns, number constraints, checkboxes
- **Server-side analytics** — summary stats, trend analysis, duplicate detection
- **30 tools total** — 9 free, 21 pro

## Installation

```bash
npx mcp-google-sheets-advanced
```

Or install globally:

```bash
pnpm add -g mcp-google-sheets-advanced
```

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-sheets-advanced": {
      "command": "npx",
      "args": ["-y", "mcp-google-sheets-advanced"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

On first run, a browser window opens for Google OAuth authentication.

## Available Tools

### Free Tier (Read Operations)

| Tool                          | Description                   |
| ----------------------------- | ----------------------------- |
| `sheets_list_spreadsheets`    | List accessible spreadsheets  |
| `sheets_get_spreadsheet_info` | Get spreadsheet metadata      |
| `sheets_read_range`           | Read cell values from a range |
| `sheets_read_multiple_ranges` | Batch read multiple ranges    |
| `sheets_get_formulas`         | Get formulas from a range     |
| `sheets_get_sheet_metadata`   | Get sheet properties          |
| `sheets_list_named_ranges`    | List named ranges             |
| `sheets_list_charts`          | List charts                   |
| `sheets_list_filter_views`    | List filter views             |

### Pro Tier ($16/mo)

| Tool                                | Description                           |
| ----------------------------------- | ------------------------------------- |
| `sheets_write_range`                | Write values to a range               |
| `sheets_write_multiple_ranges`      | Batch write to multiple ranges        |
| `sheets_append_rows`                | Append rows to a table                |
| `sheets_clear_range`                | Clear values from a range             |
| `sheets_create_sheet`               | Add a new sheet                       |
| `sheets_delete_sheet`               | Delete a sheet                        |
| `sheets_create_chart`               | Create charts (15 types)              |
| `sheets_update_chart`               | Modify existing charts                |
| `sheets_delete_chart`               | Remove charts                         |
| `sheets_create_pivot_table`         | Create pivot tables                   |
| `sheets_add_conditional_formatting` | Add conditional formatting            |
| `sheets_set_data_validation`        | Set data validation rules             |
| `sheets_format_cells`               | Format cells (fonts, colors, borders) |
| `sheets_summarize_range`            | Compute summary statistics            |
| `sheets_find_duplicates`            | Find duplicate values                 |
| `sheets_analyze_trends`             | Analyze trends with linear regression |
| `sheets_create_named_range`         | Create named ranges                   |
| `sheets_sort_range`                 | Sort data                             |
| `sheets_set_basic_filter`           | Apply/clear filters                   |
| `sheets_protect_range`              | Protect ranges                        |
| `sheets_find_replace`               | Find and replace                      |

## Configuration

### Required Environment Variables

| Variable               | Description                               |
| ---------------------- | ----------------------------------------- |
| `GOOGLE_CLIENT_ID`     | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret                       |

### Optional

| Variable            | Description                | Default                             |
| ------------------- | -------------------------- | ----------------------------------- |
| `GOOGLE_TOKEN_PATH` | Path to store OAuth tokens | `~/.config/mcp-gsheets/tokens.json` |

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Test with MCP Inspector
pnpm inspect
```

## License

MIT
