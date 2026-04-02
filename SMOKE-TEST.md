# Smoke Test Instructions

Step-by-step manual test to verify the MCP server works with a real Google Sheet.

## Prerequisites

- Node.js 20+
- The `.env` file exists at the project root with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- You are logged into the Google account `vic.logunov.main@gmail.com` in your browser

## Test Spreadsheet

**Name:** MCP Server Test Data
**ID:** `12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk`
**URL:** https://docs.google.com/spreadsheets/d/12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk/edit

**Contents:**
- Sheet1 with 7 columns: Date, Product, Region, Revenue, Cost, Units Sold, Profit
- 14 data rows (3 products, 3 regions, Jan-Mar 2026)
- Column G (Profit) contains formulas: `=D2-E2` through `=D15-E15`

---

## Step 1: Build the Server

```bash
cd ~/projects/aiagency/mcp-google-sheets-advanced
pnpm build
```

Expected: `Build success` message, `dist/index.js` created.

---

## Step 2: Start MCP Inspector

```bash
pnpm inspect
```

This runs: `npx @modelcontextprotocol/inspector node dist/index.js`

Expected: MCP Inspector opens in browser at `http://localhost:6274`.

**Note:** The first time you connect, the server will open a Google OAuth consent page in your browser. Click "Allow" to grant access to Google Sheets and Drive.

---

## Step 3: Verify Tool Listing

In MCP Inspector:
1. Click "Connect" to connect to the server
2. Click the "Tools" tab
3. Verify you see **30 tools** listed, all starting with `sheets_`

Expected: All 30 tools appear with descriptions.

---

## Step 4: Test Read Operations (Free Tier)

### 4a. List Spreadsheets

Call: `sheets_list_spreadsheets`
Parameters: `{}`

Expected: Returns a list of spreadsheets including "MCP Server Test Data".

### 4b. Get Spreadsheet Info

Call: `sheets_get_spreadsheet_info`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk"
}
```

Expected: Returns title "MCP Server Test Data", sheet list with "Sheet1".

### 4c. Read Range

Call: `sheets_read_range`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!A1:G5"
}
```

Expected: Returns 5 rows × 7 columns with headers and first 4 data rows.

### 4d. Get Formulas

Call: `sheets_get_formulas`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!G1:G15"
}
```

Expected: Returns 14 formulas (`=D2-E2` through `=D15-E15`).

---

## Step 5: Test Write Operations (Paid Tier)

### 5a. Write Range

Call: `sheets_write_range`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!H1:H2",
  "values": [["Margin %"], ["=G2/D2"]]
}
```

Expected: Writes "Margin %" header and formula to H1:H2. Verify in the spreadsheet.

### 5b. Append Rows

Call: `sheets_append_rows`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!A:G",
  "values": [["2026-04-01", "Widget D", "US", 5000, 3000, 200, "=D16-E16"]]
}
```

Expected: New row appended at row 16.

---

## Step 6: Test Chart Creation

Call: `sheets_create_chart`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "sheet_name": "Sheet1",
  "data_range": "B1:D15",
  "chart_type": "bar",
  "title": "Revenue by Product"
}
```

Expected: A bar chart appears in Sheet1. Verify in the spreadsheet.

---

## Step 7: Test Analytics

### 7a. Summarize Range

Call: `sheets_summarize_range`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!A1:G15"
}
```

Expected: Returns statistics for Revenue, Cost, Units Sold, and Profit columns (mean, median, min, max, etc.).

### 7b. Find Duplicates

Call: `sheets_find_duplicates`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!B1:B15",
  "columns": [0]
}
```

Expected: Finds duplicate products (Widget A appears 5 times, Widget B 5 times, Widget C 4 times).

### 7c. Analyze Trends

Call: `sheets_analyze_trends`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!A1:D15",
  "value_column": 2
}
```

Expected: Returns trend analysis for Revenue column with slope, R-squared, and interpretation.

---

## Step 8: Test Pivot Table

Call: `sheets_create_pivot_table`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "source_range": "Sheet1!A1:G15",
  "destination": "Sheet1!J1",
  "rows": [{"column": "Product"}],
  "columns": [{"column": "Region"}],
  "values": [{"column": "Revenue", "aggregation": "sum"}]
}
```

Expected: A pivot table appears at J1 showing Revenue summed by Product (rows) and Region (columns).

---

## Step 9: Test Formatting

Call: `sheets_add_conditional_formatting`
Parameters:
```json
{
  "spreadsheet_id": "12nelezZ3WzvBiWiMgO9IzZ8yK0GkeJ26SSAxu5fPDbk",
  "range": "Sheet1!G2:G15",
  "rule_type": "greater_than",
  "values": ["1000"],
  "format": {
    "background_color": "#00FF00",
    "bold": true
  }
}
```

Expected: Cells in the Profit column with values > 1000 are highlighted green and bold.

---

## Pass Criteria

| Test | Pass if... |
|------|-----------|
| Step 1 | Build succeeds |
| Step 2 | Inspector connects, OAuth completes |
| Step 3 | 30 tools listed |
| Step 4a | Spreadsheets returned |
| Step 4b | Metadata with correct title |
| Step 4c | 5×7 data grid returned |
| Step 4d | 14 formulas returned |
| Step 5a | Data written to H1:H2 |
| Step 5b | Row appended at row 16 |
| Step 6 | Chart visible in spreadsheet |
| Step 7a | Statistics computed |
| Step 7b | Duplicates found |
| Step 7c | Trend analysis with R² value |
| Step 8 | Pivot table at J1 |
| Step 9 | Green highlighting on profit > 1000 |

**All 15 checks must pass before merging PR #1 and deploying.**

---

## Cleanup After Testing

After testing, you may want to:
1. Delete the chart (or leave it for demo purposes)
2. Delete column H (Margin %)
3. Delete the appended row 16
4. Delete the pivot table at J1
5. Remove conditional formatting

Or simply keep everything — it makes a good demo dataset.
