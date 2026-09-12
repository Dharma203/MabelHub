import { flexParseDateExpr } from './flex-date-expr'

describe('flexParseDateExpr', () => {
  it('builds a parser for supported date formats', () => {
    const expression = flexParseDateExpr('$visit_date') as {
      $switch: { branches: Array<Record<string, unknown>> }
    }

    expect(expression.$switch.branches).toHaveLength(5)
    expect(expression.$switch.branches[1].case).toEqual({
      $regexMatch: {
        input: { $ifNull: ['$visit_date', ''] },
        regex: /^\d{4}-\d{2}-\d{2}/,
      },
    })
    expect(expression.$switch.branches[2].then).toEqual(
      expect.objectContaining({
        $dateFromString: expect.objectContaining({
          format: '%d-%b-%Y',
        }),
      }),
    )
  })

  it('pads one-digit days before parsing abbreviated month dates', () => {
    const expression = flexParseDateExpr('$visit_date') as {
      $switch: { branches: Array<Record<string, unknown>> }
    }
    const dateExpression = expression.$switch.branches[2].then as {
      $dateFromString: {
        dateString: { $let: { in: { $concat: unknown[] } } }
      }
    }

    expect(dateExpression.$dateFromString.dateString.$let.in.$concat[0]).toEqual(
      expect.objectContaining({
        $cond: expect.any(Array),
      }),
    )
  })
})
