/**
 * Sub-department display utilities.
 * Replaces the old mockData.ts helpers — no mock data, no hardcoded colors.
 */

/** Map sub-department names to display labels */
export function getSubDeptDisplayName(name: string): string {
  const map: Record<string, string> = {
    Timhert:   'Timhert (ትምህርት)',
    Mezmur:    'Mezmur (መዝሙር)',
    Kinetibeb: 'Kinetibeb (ቅኔ ትቤ)',
    Kuttr:     'Kuttr (ቁጥር)',
    Ekd:       'Ekd (እቅድ)',
    Department:'Department',
  };
  return map[name] ?? name;
}

/** Map sub-department names to brand colors */
export const SUBDEPT_COLORS: Record<string, string> = {
  Timhert:   '#b45309',
  Mezmur:    '#7c3aed',
  Kinetibeb: '#be185d',
  Kuttr:     '#047857',
  Ekd:       '#0369a1',
  Department:'#5f0113',
};

/** Get color for a sub-department name, with fallback */
export function getSubDeptColor(name: string): string {
  return SUBDEPT_COLORS[name] ?? '#6b7280';
}
