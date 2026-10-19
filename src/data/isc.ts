/**
 * Impuesto Selectivo al Consumo on imported goods — Ley 11-92 (Código Tributario) título IV,
 * art. 375 as amended by Ley 253-12. Source: "ISC-BIENES Y SERVICIOS GRAVADOS.pdf" in the repo.
 *
 * Three regimes, and each line falls in at most one:
 *  1. The art. 375 table: an ad-valorem rate on (CIF RD$ + gravamen). A 4-digit code covers
 *     the whole partida; an 8-digit code is one subpartida and wins over its partida
 *     (85.29 is 20% but its antennas 8529.10.10/20 are 10%).
 *  2. Alcohol (partidas 22.03–22.08, art. 379): 10% of the retail price, plus a specific
 *     amount per litre of absolute alcohol — unified across partidas since 2017 and indexed
 *     quarterly by DGII, which is why the amount lives in Settings and not here.
 *  3. Cigarettes (art. 375 párrafos VII–VIII): 20% of the retail price, plus a specific amount
 *     per pack. The law tabulates 20-unit packs at twice the 10-unit amount.
 */

/** [código, % ISC, descripción del anexo]. Generated from the PDF; do not hand-edit rates. */
export const ISC_AD_VALOREM: ReadonlyArray<readonly [string, number, string]> = [
  ['16043100', 20, 'Caviar'],
  ['16043200', 20, 'Sucedáneos del caviar'],
  ['24031100', 130, 'Tabaco para pipa de agua'],
  ['24031900', 130, 'Los demás'],
  ['24039990', 130, 'Los demás'],
  ['3303', 20, 'Perfumes y aguas de tocador'],
  ['39221011', 20, 'Bañeras Tipo "jacuzzi", de plástico reforzado con fibra de vidrio'],
  ['73242110', 20, 'Bañeras Tipo "jacuzzi", de fundición, incluso esmaltadas'],
  ['74182000', 20, 'Bañeras Tipo "jacuzzi" de cobre, latón, incluso bronceado'],
  ['76152000', 20, 'Bañera Tipo "jacuzzi", de aluminio'],
  ['90191012', 20, 'Bañeras de plástico, reforzado con fibra de vidrio, "Tipo jacuzzi", (incluidas las de hidromasaje) equipadas con bombas, tuberías y accesorios apropiados para su funcionamiento'],
  ['5701', 20, 'Alfombras de nudo de materia textiles, incluso confeccionadas'],
  ['5702', 20, 'Alfombras y demás revestimientos para el suelo de materia textil, excepto los de mechón insertado y los flocados, aunque estén confeccionados, incluidas las alfombras llamadas "Kilim", "Schumacks", "Soumak" o "Karamanie" y alfombras similares hechas a mano'],
  ['5703', 20, 'Alfombras y demás revestimientos para el suelo, de materia textil, con mechón insertado, incluso confeccionados'],
  ['5805', 20, 'Tapicería tejida a mano (Gobelinos, Flandes, Aubusson , Beauvais y similares) y tapicería de aguja, (por ejemplo de petitpoint, de punto de cruz) Incluso confeccionadas'],
  ['7113', 20, 'Artículos de Joyería y sus partes, de metal precioso o de chapado precioso (plaqué)'],
  ['7114', 20, 'Artículos de Orfebrería y sus partes, de metal precioso o de chapado precioso (plaqué)'],
  ['7116', 20, 'Manufacturas de perlas finas (naturales) o cultivadas, de piedras preciosas o semipreciosas (naturales, sintéticas o reconstituidas)'],
  ['7117', 20, 'Bisutería'],
  ['71171100', 20, '- Gemelos y pasadores similares'],
  ['71171911', 20, '- De metal común, plateado, dorado o platinado'],
  ['71171912', 20, '- De imitación de metal precioso (goldfill)'],
  ['71171913', 20, '- De metal común, combinadas con otras materias'],
  ['71171919', 20, '- Las demás'],
  ['71179011', 20, '- De imitación de piedras preciosas, combinadas con otras materia,'],
  ['71179012', 20, '- De imitación de perlas, combinadas con otras materias'],
  ['71179019', 20, '- Las demás'],
  ['8415', 20, 'Máquinas y aparatos para acondicionamiento de aire que comprendan un ventilador con motor y los dispositivos adecuados para modificar la temperatura y la humedad, separadamente el grado higrométrico, aunque no regulen.'],
  ['84151000', 20, 'Máquinas y aparatos para acondicionamiento de Aire acondicionado de pared o para ventanas, formando un solo cuerpo o del tipo sistema de elementos separados ("split-system").'],
  ['84152000', 20, 'Aire acondicionado del tipo de los utilizados en vehículos automóviles para comodidad de sus ocupantes'],
  ['84158100', 20, 'Aire acondicionado con equipo de enfriamiento y válvula de inversión del ciclo término (bombas de calor reversibles)'],
  ['84158200', 20, 'Los demás máquinas y aparatos con equipo de enfriamiento'],
  ['84158300', 20, 'Los demás máquinas y aparatos sin equipo de enfriamiento'],
  ['84159000', 20, 'Partes de máquinas y aparatos para acondicionamiento de aire'],
  ['84796000', 20, 'Aparatos de evaporación para refrigerar el aire.'],
  ['85081100', 20, 'Aspiradoras con motor eléctrico incorporado'],
  ['85081900', 20, 'De potencia inferior o igual al 1 500 W y de capacidad del depósito o bolsa para el polvo inferior o igual a 201'],
  ['85086000', 20, 'Las demás'],
  ['85098010', 20, 'Enceradoras (lustradoras) de pisos.'],
  ['85098020', 20, 'Trituradores de desperdicios de cocina'],
  ['85094090', 20, 'Los demás (trituradores y mezcladoras de alimentos)'],
  ['85098090', 20, 'Los demás aparatos'],
  ['85161000', 20, 'Calentadores eléctricos de agua de calentamiento instantáneo o acumulación y calentadores eléctricos de inmersión'],
  ['85165000', 20, 'Hornos de microondas'],
  ['85166010', 20, 'Hornos'],
  ['85166030', 20, 'Calentadores, parrillas y asadores'],
  ['85167100', 20, 'Aparatos para la preparación de café o té'],
  ['85167200', 20, 'Tostadoras de Pan'],
  ['85167900', 20, 'Los demás aparatos electro térmicos'],
  ['85176920', 20, 'Videófonos.'],
  ['85193000', 20, 'Giradiscos'],
  ['85198191', 20, 'Reproductores de casetes (toca casetes) de bolsillo'],
  ['85192000', 20, 'Tocadiscos que funcionen por ficha o moneda'],
  ['85219010', 20, 'De grabación o reproducción de imagen y sonido, mediante disco óptico'],
  ['85219020', 20, 'De reproducción de imagen y sonido en formato mp3 y similares'],
  ['85219090', 20, 'Los demás'],
  ['8521', 20, 'Aparatos de grabación o reproducción de imagen y sonido (videos), Incluso con receptor de señales de imagen y sonido incorporado.'],
  ['85211000', 20, 'Aparatos de grabación y reproducción de imagen y de sonido (video) de cinta magnética'],
  ['85258020', 20, 'Cámaras digitales'],
  ['85258030', 20, 'Videocámaras'],
  ['85271310', 20, 'Los demás aparatos combinados con grabador o reproductor de sonido por sistema óptico de lectura'],
  ['85272110', 20, 'Aparatos receptores de radiodifusión combinados con grabador o reproductor de sonido por sistema óptico de lectura'],
  ['85279110', 20, 'Los demás aparatos receptores de radiodifusión combinados con grabador o reproductor de sonido por sistema óptico de lectura'],
  ['85287200', 10, 'Aparatos receptores de televisión, en colores'],
  ['85285910', 10, 'Videomonitores en colores'],
  ['8529', 20, 'Partes identificables como destinadas, exclusivas o principalmente a los aparatos de las partidas nos. 85 25 a 85.28.'],
  ['85291010', 10, 'Antenas exteriores para receptores de televisión o radiodifusión'],
  ['85291020', 10, 'Antenas parabólicas para recepción directa desde satélites.'],
  ['85291091', 10, 'Antenas para transmisión de telefonía celular y transmisión de mensajes a través de aparatos buscapersonas'],
  ['8801', 20, 'Globos y dirigibles; planeadores, a las planeadoras y demás aeronaves no concebidas para la propulsión con motor.'],
  ['89039110', 20, 'Yates'],
  ['89039920', 20, 'Motocicletas acuáticas ("jet ski")'],
  ['9101', 20, 'Relojes de pulsera, de bolsillo y relojes similares (incluido los contadores de tiempo de los mismos tipos), con caja de metales preciosos o chapados de metales preciosos (plaqué)'],
  ['91111000', 20, 'Cajas de metal precioso o chapado de metal precioso (plaqué).'],
  ['91131000', 20, 'Pulseras de metal precioso o chapado de metal precioso (plaqué)'],
  ['9302', 78, 'Revólveres y pistolas, excepto los de las partidas 93.03 ó 93.04'],];

/**
 * The annex still prints some codes in a nomenclature the current arancel has since split.
 * These are mapped to their successors by description; only unambiguous matches are listed.
 * (8415.90.00 needs no mapping: partida 84.15 already covers it.)
 */
export const ISC_SUCESORES: Readonly<Record<string, readonly string[]>> = {
  '74182000': ['74182011'],                         // bañeras tipo jacuzzi de cobre
  '76152000': ['76152011'],                         // bañeras tipo jacuzzi de aluminio
  '85167900': ['85167911', '85167912', '85167919'], // los demás aparatos electrotérmicos
  '89039110': ['89033111', '89033211', '89033311'], // yates
};

/**
 * Annex codes with no clear successor. Their own rate is NOT applied automatically: lines in
 * the subheading they moved to get a "verify" note instead, whatever rate they did get (the
 * 10% cell antennas now sit inside 8529.10.90, which partida 85.29 puts at 20%).
 */
export const ISC_SIN_SUCESOR: ReadonlyArray<{ codigo: string; subpartida: string; descripcion: string }> = [
  { codigo: '85198191', subpartida: '851981', descripcion: 'Reproductores de casetes de bolsillo' },
  { codigo: '85258020', subpartida: '852589', descripcion: 'Cámaras digitales' },
  { codigo: '85258030', subpartida: '852589', descripcion: 'Videocámaras' },
  { codigo: '85291091', subpartida: '852910', descripcion: 'Antenas para telefonía celular y buscapersonas' },
];

export const ISC_ALCOHOL = {
  partidas: ['2203', '2204', '2205', '2206', '2207', '2208'],
  /** % of the retail price (art. 375 párrafo II). */
  adValoremVentaMenor: 10,
} as const;

export const ISC_TABACO = {
  /** Productos del tabaco (art. 379). 24.03 is in the ad-valorem table instead. */
  partida: '2402',
  cajetilla20: ['24022010', '24022020', '24029000'],
  cajetilla10: ['24022030', '24022040'],
  /** % of the retail price (art. 375 párrafo VIII). */
  adValoremVentaMenor: 20,
} as const;

/**
 * Specific amounts as of the 2026 DGA course material. DGII re-indexes them every quarter,
 * so these are only the Settings defaults.
 */
export const ISC_MONTOS_DEFAULT = {
  /** RD$ per litre of absolute alcohol. */
  alcoholPorLitro: 764.29,
  /** RD$ per pack of 10 cigarettes. */
  cajetilla10: 32.33,
  /** RD$ per pack of 20: the law's table keeps it at twice the 10-unit amount. */
  cajetilla20: 64.66,
} as const;
