import {
  countMissingPhoneStreak,
  getMissingPhoneSeverity,
  isPhoneFilled,
  isVisitedStatus,
  missingPhoneEntityExpr,
  normalizeSatuanKerjaKey,
} from './missing-phone-alert'

describe('missing phone streak', () => {
  it('stops at a filled phone and treats blank sentinels as empty', () => {
    expect(
      countMissingPhoneStreak([
        { pic_phone: '  ' },
        { pic_phone: '-' },
        { pic_phone: '0' },
        { pic_phone: '0812345678' },
        { pic_phone: '' },
      ]),
    ).toBe(3)

    expect(isPhoneFilled(undefined)).toBe(false)
    expect(isPhoneFilled(null)).toBe(false)
    expect(isPhoneFilled('0812345678')).toBe(true)
  })

  it('recognizes visited status regardless of casing or surrounding spaces', () => {
    expect(isVisitedStatus('Visited')).toBe(true)
    expect(isVisitedStatus(' VISITED ')).toBe(true)
    expect(isVisitedStatus('Not Visited')).toBe(false)
  })

  it('groups satuan kerja regardless of casing or surrounding spaces', () => {
    expect(normalizeSatuanKerjaKey('  Direktorat Sistem Informasi  ')).toBe(
      normalizeSatuanKerjaKey('DIREKTORAT SISTEM INFORMASI'),
    )
  })

  it('uses the displayed entity when satuan kerja is empty', () => {
    expect(missingPhoneEntityExpr()).toEqual({
      $ifNull: [
        {
          $cond: [
            { $ne: ['$satuan_kerja', ''] },
            '$satuan_kerja',
            null,
          ],
        },
        {
          $ifNull: [
            '$namaEntitas',
            { $ifNull: ['$nama_entitas', '$institusi_kerja'] },
          ],
        },
      ],
    })
  })

  it('escalates at the configured streak thresholds', () => {
    expect(
      countMissingPhoneStreak(
        Array.from({ length: 5 }, () => ({ pic_phone: null })),
      ),
    ).toBe(5)
    expect(getMissingPhoneSeverity(3)).toBe('warning')
    expect(getMissingPhoneSeverity(4)).toBe('warning')
    expect(getMissingPhoneSeverity(5)).toBe('danger')
    expect(getMissingPhoneSeverity(7)).toBe('danger')
    expect(getMissingPhoneSeverity(8)).toBe('critical')
    expect(getMissingPhoneSeverity(10)).toBe('critical')
  })
})
