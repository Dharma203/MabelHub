/**
 * Returns a MongoDB aggregation expression that flexibly parses a date string
 * field from multiple formats into a Date object.
 *
 * Supported formats:
 *   - Date object (already stored as Date in MongoDB)
 *   - "3-Dec-2025"  (%d-%b-%Y, English abbreviated month)
 *   - "3-Des-2025"  (Indonesian abbreviated months: Mei, Agu, Okt, Des)
 *   - "2025-12-03" or "2025-12-03T..." (ISO format)
 *   - "03/12/2025"  (DD/MM/YYYY)
 */
export function flexParseDateExpr(field: string) {
  const safeField = { $ifNull: [field, ''] }

  // Normalize Indonesian month abbreviations → English via $reduce + $replaceAll
  const normalizedField = {
    $let: {
      vars: { low: { $toLower: safeField } },
      in: {
        $reduce: {
          input: [
            ['des', 'dec'], ['okt', 'oct'], ['agu', 'aug'],
            ['mei', 'may'], ['nop', 'nov'], ['peb', 'feb'],
          ],
          initialValue: '$$low',
          in: {
            $replaceAll: {
              input: '$$value',
              find: { $arrayElemAt: ['$$this', 0] },
              replacement: { $arrayElemAt: ['$$this', 1] },
            },
          },
        },
      },
    },
  }

  return {
    $switch: {
      branches: [
        // Already a Date object in MongoDB
        {
          case: { $eq: [{ $type: field }, 'date'] },
          then: field,
        },
        // ISO "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" format
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{4}-\d{2}-\d{2}/ } },
          then: {
            $dateFromString: {
              dateString: { $substrCP: [field, 0, 10] },
              format: '%Y-%m-%d',
              onError: null,
            },
          },
        },
        // "d-Mon-YYYY" format (English or Indonesian month abbreviations)
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: normalizedField,
              format: '%d-%b-%Y',
              onError: null,
            },
          },
        },
        // "d-Mon-YY" format (English or Indonesian, 2-digit year like "5-Jan-26")
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}-[A-Za-z]+-\d{2}$/ } },
          then: {
            $dateFromString: {
              dateString: {
                $let: {
                  vars: { parts: { $split: [normalizedField, '-'] } },
                  in: {
                    $concat: [
                      { $arrayElemAt: ['$$parts', 0] },
                      '-',
                      { $arrayElemAt: ['$$parts', 1] },
                      '-20',
                      { $arrayElemAt: ['$$parts', 2] }
                    ]
                  }
                }
              },
              format: '%d-%b-%Y',
              onError: null,
            },
          },
        },
        // "DD/MM/YYYY" format
        {
          case: { $regexMatch: { input: safeField, regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ } },
          then: {
            $dateFromString: {
              dateString: field,
              format: '%d/%m/%Y',
              onError: null,
            },
          },
        },
      ],
      default: null,
    },
  }
}
