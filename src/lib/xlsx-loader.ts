export async function loadXLSX() {
    const XLSX = await import('xlsx-js-style')
    return XLSX.default ?? XLSX
}