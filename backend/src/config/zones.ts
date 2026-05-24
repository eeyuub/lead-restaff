// Predefined search zones per city. Multi-zone fixes Google Maps' clustering bias
// (a single search returns only places near one center point).

export const CITY_ZONES: Record<string, string[]> = {
  Casablanca: [
    'Maarif Casablanca',
    'Gauthier Casablanca',
    'Anfa Casablanca',
    'Racine Casablanca',
    'Sidi Maarouf Casablanca',
    'Ain Diab Casablanca',
    'Corniche Casablanca',
    'Bourgogne Casablanca',
    'Bd Zerktouni Casablanca',
    'Bd Ghandi Casablanca',
    'CFC Casa Finance City',
    'Hay Hassani Casablanca',
    'Oasis Casablanca',
    'Californie Casablanca',
    'Ain Sebaa Casablanca',
    'Derb Ghallef Casablanca',
    'Mers Sultan Casablanca',
    'Belvedere Casablanca',
  ],
  Marrakech: [
    'Gueliz Marrakech',
    'Hivernage Marrakech',
    'Medina Marrakech',
    'Jemaa el-Fnaa Marrakech',
    'Palmeraie Marrakech',
    'Targa Marrakech',
    'Sidi Ghanem Marrakech',
    'Route de Fes Marrakech',
    'Agdal Marrakech',
    'Mhamid Marrakech',
    'Semlalia Marrakech',
    'Kasbah Marrakech',
  ],
  Tangier: [
    'Centre-ville Tangier',
    'Malabata Tangier',
    'Cap Spartel Tangier',
    'Iberia Tangier',
    'Marshan Tangier',
    'Medina Tangier',
    'Kasbah Tangier',
    'California Tangier',
    'Mghogha Tangier',
    'Boukhalef Tangier',
  ],
  Agadir: [
    'Centre-ville Agadir',
    'Founty Agadir',
    'Hay Mohammadi Agadir',
    'Secteur Touristique Agadir',
    'Marina Agadir',
    'Talborjt Agadir',
    'Cité Suisse Agadir',
    'Tikiouine Agadir',
    'Anza Agadir',
  ],
  Rabat: [
    'Agdal Rabat',
    'Hassan Rabat',
    'Souissi Rabat',
    'Hay Riad Rabat',
    'Medina Rabat',
    'Océan Rabat',
    'L\'Océan Rabat',
    'Ryad Rabat',
    'Yacoub El Mansour Rabat',
    'Aviation Rabat',
  ],
  Fes: [
    'Ville Nouvelle Fes',
    'Medina Fes',
    'Fes el-Bali',
    'Fes el-Jdid',
    'Atlas Fes',
    'Saiss Fes',
    'Route d\'Imouzzer Fes',
    'Champ de Course Fes',
  ],
  Meknes: [
    'Hamria Meknes',
    'Medina Meknes',
    'Ville Nouvelle Meknes',
    'Marjane Meknes',
    'Hay Salam Meknes',
  ],
  Oujda: [
    'Centre-ville Oujda',
    'Sidi Yahya Oujda',
    'Al Qods Oujda',
    'Hay Al Andalous Oujda',
  ],
  Tetouan: [
    'Centre-ville Tetouan',
    'Medina Tetouan',
    'Ensanche Tetouan',
    'Martil Tetouan',
    'Cabo Negro Tetouan',
    'M\'diq Tetouan',
  ],
  Kenitra: [
    'Centre-ville Kenitra',
    'Maamora Kenitra',
    'Mehdia Kenitra',
    'Bir Rami Kenitra',
  ],
  Mohammedia: [
    'Centre-ville Mohammedia',
    'Plage Mohammedia',
    'Parc Mohammedia',
    'Alia Mohammedia',
  ],
  Sale: [
    'Medina Sale',
    'Hay Salam Sale',
    'Bettana Sale',
    'Tabriquet Sale',
    'Sale Al Jadida',
  ],
  Essaouira: [
    'Medina Essaouira',
    'Borj Essaouira',
    'Diabat Essaouira',
    'Quartier des Dunes Essaouira',
  ],
  Chefchaouen: [
    'Medina Chefchaouen',
    'Centre Chefchaouen',
    'Ras El Maa Chefchaouen',
  ],
  Ifrane: ['Centre Ifrane', 'Université Ifrane', 'Mischliffen Ifrane'],
  'El Jadida': [
    'Centre-ville El Jadida',
    'Cité Portugaise El Jadida',
    'Plage El Jadida',
    'Mazagan El Jadida',
  ],
  Nador: ['Centre-ville Nador', 'Marchica Nador', 'Beni Ensar Nador'],
  Dakhla: ['Centre-ville Dakhla', 'Baie de Dakhla', 'PK25 Dakhla'],
  Laayoune: ['Centre-ville Laayoune', 'Hay Mataar Laayoune'],
  Ouarzazate: ['Centre Ouarzazate', 'Tabounte Ouarzazate', 'Atlas Studios Ouarzazate'],
};

export const SEARCH_CATEGORIES = [
  'restaurant',
  'café',
  'hotel',
  'pizzeria',
  'fast-food',
  'bar',
  'boulangerie',
  'coffee shop',
  'lounge',
  'traiteur',
] as const;
export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export interface BuildQueriesOptions {
  /** If provided, use these specific zones instead of expanding cities. */
  zones?: string[];
  /** Extra free-text queries to append (e.g. "rooftop bar Marrakech"). */
  customQueries?: string[];
}

export function buildSearchQueries(
  cities: string[],
  categories: string[],
  opts: BuildQueriesOptions = {},
): string[] {
  const queries: string[] = [];

  const targetZones = opts.zones?.length
    ? opts.zones
    : cities.flatMap((city) => {
        const zones = CITY_ZONES[city];
        if (!zones) throw new Error(`Unknown city: ${city}. Add it to CITY_ZONES.`);
        return zones;
      });

  for (const cat of categories) {
    for (const zone of targetZones) {
      queries.push(`${cat} ${zone} Morocco`);
    }
  }

  if (opts.customQueries?.length) {
    queries.push(...opts.customQueries.map((q) => q.trim()).filter(Boolean));
  }

  return queries;
}
