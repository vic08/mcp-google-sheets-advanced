import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SheetsService } from '../services/sheets.service.js';
import { handleToolError } from '../middleware/error-handler.js';
import { a1ToGridRange, parseA1Notation } from '../utils/a1-notation.js';
import { hexToGoogleColor } from '../utils/color.js';

const BOOLEAN_RULE_TYPE_MAP: Record<string, string> = {
  greater_than: 'NUMBER_GREATER',
  less_than: 'NUMBER_LESS',
  equal_to: 'NUMBER_EQ',
  between: 'NUMBER_BETWEEN',
  text_contains: 'TEXT_CONTAINS',
  text_not_contains: 'TEXT_NOT_CONTAINS',
  is_empty: 'BLANK',
  is_not_empty: 'NOT_BLANK',
  custom_formula: 'CUSTOM_FORMULA',
};

const VALIDATION_TYPE_MAP: Record<string, string> = {
  dropdown: 'ONE_OF_LIST',
  number_between: 'NUMBER_BETWEEN',
  number_greater_than: 'NUMBER_GREATER',
  number_less_than: 'NUMBER_LESS',
  text_contains: 'TEXT_CONTAINS',
  checkbox: 'BOOLEAN',
  custom_formula: 'CUSTOM_FORMULA',
};

const H_ALIGN_MAP: Record<string, string> = {
  left: 'LEFT',
  center: 'CENTER',
  right: 'RIGHT',
};

const V_ALIGN_MAP: Record<string, string> = {
  top: 'TOP',
  middle: 'MIDDLE',
  bottom: 'BOTTOM',
};

const WRAP_MAP: Record<string, string> = {
  overflow: 'OVERFLOW_CELL',
  clip: 'CLIP',
  wrap: 'WRAP',
};

export function registerFormattingTools(server: McpServer, sheetsService: SheetsService): void {
  server.tool(
    'sheets_add_conditional_formatting',
    'Adds a conditional formatting rule to a range in a spreadsheet',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to apply formatting to'),
      rule_type: z
        .enum([
          'greater_than',
          'less_than',
          'equal_to',
          'between',
          'text_contains',
          'text_not_contains',
          'is_empty',
          'is_not_empty',
          'custom_formula',
          'color_scale',
        ])
        .describe('The type of conditional formatting rule'),
      values: z
        .array(z.string())
        .optional()
        .describe('Condition values (e.g. threshold numbers, text to match, formula)'),
      format: z
        .object({
          background_color: z
            .string()
            .optional()
            .describe('Background color as hex (e.g. #FF0000)'),
          text_color: z.string().optional().describe('Text color as hex'),
          bold: z.boolean().optional().describe('Whether text should be bold'),
          italic: z.boolean().optional().describe('Whether text should be italic'),
        })
        .optional()
        .describe('Cell format to apply when condition is met'),
      color_scale: z
        .object({
          min_color: z.string().optional().describe('Color for minimum value as hex'),
          mid_color: z.string().optional().describe('Color for midpoint value as hex'),
          max_color: z.string().optional().describe('Color for maximum value as hex'),
        })
        .optional()
        .describe('Color scale configuration (only used when rule_type is color_scale)'),
    },
    async ({ spreadsheet_id, range, rule_type, values, format, color_scale }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        let rule: Record<string, unknown>;

        if (rule_type === 'color_scale') {
          const gradientRule: Record<string, unknown> = {};

          gradientRule.minpoint = {
            type: 'MIN',
            color: hexToGoogleColor(color_scale?.min_color ?? '#57BB8A'),
          };

          if (color_scale?.mid_color) {
            gradientRule.midpoint = {
              type: 'PERCENTILE',
              value: '50',
              color: hexToGoogleColor(color_scale.mid_color),
            };
          }

          gradientRule.maxpoint = {
            type: 'MAX',
            color: hexToGoogleColor(color_scale?.max_color ?? '#E67C73'),
          };

          rule = {
            ranges: [gridRange],
            gradientRule,
          };
        } else {
          const conditionType = BOOLEAN_RULE_TYPE_MAP[rule_type];
          const conditionValues = (values ?? []).map((v) => ({ userEnteredValue: v }));

          const cellFormat: Record<string, unknown> = {};

          if (format?.background_color) {
            cellFormat.backgroundColor = hexToGoogleColor(format.background_color);
          }
          if (format?.text_color || format?.bold !== undefined || format?.italic !== undefined) {
            const textFormat: Record<string, unknown> = {};
            if (format?.text_color) {
              textFormat.foregroundColor = hexToGoogleColor(format.text_color);
            }
            if (format?.bold !== undefined) {
              textFormat.bold = format.bold;
            }
            if (format?.italic !== undefined) {
              textFormat.italic = format.italic;
            }
            cellFormat.textFormat = textFormat;
          }

          rule = {
            ranges: [gridRange],
            booleanRule: {
              condition: {
                type: conditionType,
                values: conditionValues.length > 0 ? conditionValues : undefined,
              },
              format: cellFormat,
            },
          };
        }

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            addConditionalFormatRule: {
              rule,
              index: 0,
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ rule_added: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_set_data_validation',
    'Sets data validation rules on a range of cells',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to validate'),
      validation_type: z
        .enum([
          'dropdown',
          'number_between',
          'number_greater_than',
          'number_less_than',
          'text_contains',
          'checkbox',
          'custom_formula',
        ])
        .describe('The type of validation to apply'),
      values: z
        .array(z.string())
        .optional()
        .describe('Validation values (dropdown options, number bounds, formula, etc.)'),
      strict: z
        .boolean()
        .default(true)
        .describe('Whether to reject invalid input (true) or show a warning (false)'),
    },
    async ({ spreadsheet_id, range, validation_type, values, strict }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        const conditionType = VALIDATION_TYPE_MAP[validation_type];
        const conditionValues = (values ?? []).map((v) => ({ userEnteredValue: v }));

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            setDataValidation: {
              range: gridRange,
              rule: {
                condition: {
                  type: conditionType,
                  values: conditionValues.length > 0 ? conditionValues : undefined,
                },
                strict,
                showCustomUi: validation_type === 'dropdown' || validation_type === 'checkbox',
              },
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ validation_set: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    'sheets_format_cells',
    'Formats cells in a range with font, color, alignment, and number format options',
    {
      spreadsheet_id: z.string().describe('The ID of the spreadsheet'),
      range: z.string().describe('The A1 notation range to format'),
      format: z
        .object({
          bold: z.boolean().optional().describe('Bold text'),
          italic: z.boolean().optional().describe('Italic text'),
          underline: z.boolean().optional().describe('Underline text'),
          strikethrough: z.boolean().optional().describe('Strikethrough text'),
          font_size: z.number().optional().describe('Font size in points'),
          font_family: z.string().optional().describe('Font family name'),
          text_color: z.string().optional().describe('Text color as hex (e.g. #000000)'),
          background_color: z
            .string()
            .optional()
            .describe('Background color as hex (e.g. #FFFFFF)'),
          number_format: z.string().optional().describe('Number format pattern (e.g. #,##0.00)'),
          horizontal_alignment: z
            .enum(['left', 'center', 'right'])
            .optional()
            .describe('Horizontal text alignment'),
          vertical_alignment: z
            .enum(['top', 'middle', 'bottom'])
            .optional()
            .describe('Vertical text alignment'),
          wrap_strategy: z
            .enum(['overflow', 'clip', 'wrap'])
            .optional()
            .describe('Text wrapping strategy'),
        })
        .describe('Formatting options to apply'),
    },
    async ({ spreadsheet_id, range, format }) => {
      try {
        const parsed = parseA1Notation(range);
        const sheetName = parsed.sheetName ?? 'Sheet1';
        const sheetId = await sheetsService.resolveSheetId(spreadsheet_id, sheetName);
        const gridRange = a1ToGridRange(range, sheetId);

        const cellFormat: Record<string, unknown> = {};
        const fields: string[] = [];

        // Text format properties
        const textFormat: Record<string, unknown> = {};
        if (format.bold !== undefined) {
          textFormat.bold = format.bold;
          fields.push('userEnteredFormat.textFormat.bold');
        }
        if (format.italic !== undefined) {
          textFormat.italic = format.italic;
          fields.push('userEnteredFormat.textFormat.italic');
        }
        if (format.underline !== undefined) {
          textFormat.underline = format.underline;
          fields.push('userEnteredFormat.textFormat.underline');
        }
        if (format.strikethrough !== undefined) {
          textFormat.strikethrough = format.strikethrough;
          fields.push('userEnteredFormat.textFormat.strikethrough');
        }
        if (format.font_size !== undefined) {
          textFormat.fontSize = format.font_size;
          fields.push('userEnteredFormat.textFormat.fontSize');
        }
        if (format.font_family !== undefined) {
          textFormat.fontFamily = format.font_family;
          fields.push('userEnteredFormat.textFormat.fontFamily');
        }
        if (format.text_color !== undefined) {
          textFormat.foregroundColorStyle = { rgbColor: hexToGoogleColor(format.text_color) };
          fields.push('userEnteredFormat.textFormat.foregroundColorStyle');
        }

        if (Object.keys(textFormat).length > 0) {
          cellFormat.textFormat = textFormat;
        }

        if (format.background_color !== undefined) {
          cellFormat.backgroundColorStyle = { rgbColor: hexToGoogleColor(format.background_color) };
          fields.push('userEnteredFormat.backgroundColorStyle');
        }

        if (format.number_format !== undefined) {
          cellFormat.numberFormat = { type: 'NUMBER', pattern: format.number_format };
          fields.push('userEnteredFormat.numberFormat');
        }

        if (format.horizontal_alignment !== undefined) {
          cellFormat.horizontalAlignment = H_ALIGN_MAP[format.horizontal_alignment];
          fields.push('userEnteredFormat.horizontalAlignment');
        }

        if (format.vertical_alignment !== undefined) {
          cellFormat.verticalAlignment = V_ALIGN_MAP[format.vertical_alignment];
          fields.push('userEnteredFormat.verticalAlignment');
        }

        if (format.wrap_strategy !== undefined) {
          cellFormat.wrapStrategy = WRAP_MAP[format.wrap_strategy];
          fields.push('userEnteredFormat.wrapStrategy');
        }

        await sheetsService.batchUpdate(spreadsheet_id, [
          {
            repeatCell: {
              range: gridRange,
              cell: {
                userEnteredFormat: cellFormat,
              },
              fields: fields.join(','),
            },
          },
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ formatted_range: range }, null, 2),
            },
          ],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
