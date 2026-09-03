/**
 * Dominican ports of entry from the DGA master port table
 * ("Tabla maestra códigos puertos", aduanas.gob.do, Nov 2019). Codes are UN/LOCODE style and
 * are what SIGA expects in the DUA `EntryPort` / `DeparturePort` field.
 */
export interface Puerto {
  codigo: string;
  nombre: string;
}

export const PUERTOS_RD: Puerto[] = [
  { codigo: 'DOHAI', nombre: 'RIO HAINA' },
  { codigo: 'DOCAU', nombre: 'CAUCEDO' },
  { codigo: 'DOSDQ', nombre: 'SANTO DOMINGO' },
  { codigo: 'DOBCC', nombre: 'BOCA CHICA' },
  { codigo: 'DOPOP', nombre: 'PUERTO PLATA' },
  { codigo: 'DOSPM', nombre: 'SAN PEDRO DE MACORIS' },
  { codigo: 'DOPLC', nombre: 'PUERTO LA CANA' },
  { codigo: 'DOLRM', nombre: 'LA ROMANA' },
  { codigo: 'DOMAN', nombre: 'MANZANILLO' },
  { codigo: 'DOSAM', nombre: 'SAMANA' },
  { codigo: 'DOEPS', nombre: 'EL PORTILLO/SAMANA' },
  { codigo: 'DOBRX', nombre: 'BARAHONA' },
  { codigo: 'DOCBJ', nombre: 'CABO ROJO' },
  { codigo: 'DOAZU', nombre: 'AZUA' },
  { codigo: 'DOPVA', nombre: 'PUERTO VIEJO DE AZUA' },
  { codigo: 'DOPDR', nombre: 'PEDERNALES' },
  { codigo: 'DODAJ', nombre: 'DAJABON' },
  { codigo: 'DOJIM', nombre: 'JIMANI' },
  { codigo: 'DOEPI', nombre: 'ELIAS PIÑA' },
  { codigo: 'DOMCR', nombre: 'SAN FERNANDO DE MONTE CRISTI' },
  { codigo: 'DOPUJ', nombre: 'PUNTA CANA APT' },
  { codigo: 'DOSNX', nombre: 'AEROPUERTO DR. JOAQUIN BALAGUER' },
  { codigo: 'DOAZS', nombre: 'AEROP. PRESIDENTE JUAN BOSCH (CATEY)' },
  { codigo: 'DOJQB', nombre: 'HIGUERO' },
  { codigo: 'DOSTI', nombre: 'SANTIAGO DE LOS CABALLEROS' },
  { codigo: 'DOHIG', nombre: 'HIGUEY' },
  { codigo: 'DOCDC', nombre: 'CASA DE CAMPO' },
  { codigo: 'DOCAL', nombre: 'CAYO LEVANTADO' },
  { codigo: 'DOCAI', nombre: 'ISLA CATALINA' },
  { codigo: 'DOJDL', nombre: 'JUAN DOLIO' },
  { codigo: 'DOLCS', nombre: 'LAS CALDERAS' },
  { codigo: 'DOPAL', nombre: 'PUERTO PALENQUE' },
  { codigo: 'DOPUD', nombre: 'PUERTO DUARTE' },
  { codigo: 'DOPUO', nombre: 'PUERTO LIBERTADOR' },
  { codigo: 'DOSNZ', nombre: 'SANCHEZ' },
  { codigo: 'DOBAN', nombre: 'BANI' },
  { codigo: 'DOSCR', nombre: 'SAN CRISTOBAL' },
  { codigo: 'DOSDD', nombre: 'HAINAMOSA' },
  { codigo: 'DOBQL', nombre: 'BARCEQUILLO' },
  { codigo: 'DOGRA', nombre: 'GUERRA' },
  { codigo: 'DOHDY', nombre: 'HATO DEL YAQUE' },
  { codigo: 'DOJBC', nombre: 'JARABACOA' },
  { codigo: 'DOLAV', nombre: 'LA VEGA' },
  { codigo: 'DOLCY', nombre: 'LICEY' },
  { codigo: 'DOLVC', nombre: 'CONSTANZA' },
  { codigo: 'DOPIM', nombre: 'PIMENTEL' },
  { codigo: 'DOSAL', nombre: 'SALCEDO' },
  { codigo: 'DOSFN', nombre: 'SAN FRANCISCO DE MACORIS' },
  { codigo: 'DOSIS', nombre: 'SAN IGNACIO SABANETA' },
  { codigo: 'DOSJM', nombre: 'SAN JUAN DE LA MAGUANA' },
  { codigo: 'DOESP', nombre: 'ESPERANZA' },
  { codigo: 'DOVAL', nombre: 'VILLA ALTAGRACIA' },
];

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Accepts a code ("DOHAI"), an exact name, or a loose name ("Haina", "Puerto de Haina"). */
export function findPuerto(value: string): Puerto | undefined {
  const v = norm(value);
  if (!v) return undefined;
  return (
    PUERTOS_RD.find((p) => p.codigo === value.trim().toUpperCase()) ??
    PUERTOS_RD.find((p) => norm(p.nombre) === v) ??
    PUERTOS_RD.find((p) => norm(p.nombre).includes(v) || v.includes(norm(p.nombre)))
  );
}
