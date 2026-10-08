/**
 * Comprehensive directory of Sri Lanka's cities, municipal suburbs, and townships
 * across all 9 provinces and 25 districts. Used by the Combobox in PersonalInfoStep.
 * Sorted alphabetically within each province group for fast searching.
 */

// ── Western Province ──────────────────────────────────────────────
const WESTERN_COLOMBO = [
  'Angoda', 'Athurugiriya', 'Attidiya', 'Avissawella',
  'Battaramulla', 'Boralesgamuwa',
  'Colombo', 'Sri Jayawardenepura Kotte',
  'Dehiwala-Mount Lavinia',
  'Egoda Uyana',
  'Godagama', 'Gotatuwa',
  'Hanwella', 'Homagama',
  'Kaduwela', 'Katubedda', 'Kohuwala', 'Kolonnawa', 'Kottawa',
  'Madiwela', 'Maharagama', 'Makumbura', 'Malabe', 'Meegoda', 'Mirihana', 'Moratuwa', 'Mulleriyawa',
  'Nawinna', 'Nugegoda',
  'Padukka', 'Pamunuwa', 'Pannipitiya', 'Pepiliyana', 'Piliyandala',
  'Rathmalana',
  'Thalawathugoda',
  'Wellampitiya', 'Wijerama',
];

const WESTERN_GAMPAHA = [
  'Biyagama',
  'Delgoda', 'Divulapitiya',
  'Gampaha', 'Ganemulla',
  'Ja-Ela',
  'Kadawatha', 'Kandana', 'Katunayake', 'Kelaniya', 'Kiribathgoda',
  'Minuwangoda', 'Mirigama',
  'Negombo', 'Nittambuwa',
  'Pugoda',
  'Ragama',
  'Sapugaskanda', 'Seeduwa',
  'Veyangoda',
  'Wattala', 'Weliveria',
  'Yakkala',
];

const WESTERN_KALUTARA = [
  'Agalawatte', 'Aluthgama', 'Ambalangoda',
  'Bandaragama', 'Beruwala', 'Bulathsinhala',
  'Dharga Town',
  'Horana',
  'Ingiriya',
  'Kalutara',
  'Matugama',
  'Panadura',
  'Wadduwa',
];

// ── Central Province ──────────────────────────────────────────────
const CENTRAL_KANDY = [
  'Digana',
  'Gampola', 'Gelioya',
  'Hasalaka',
  'Kadugannawa', 'Kandy', 'Katugastota', 'Kundasale',
  'Madawala', 'Menikhinna',
  'Nawalapitiya',
  'Peradeniya', 'Pilimathalawa', 'Pussellawa',
  'Teldeniya',
  'Wattegama',
];

const CENTRAL_MATALE = [
  'Dambulla',
  'Galewela',
  'Matale',
  'Pallepola',
  'Rattota',
  'Sigiriya',
  'Ukuwela',
  'Wilgamuwa',
];

const CENTRAL_NUWARA_ELIYA = [
  'Agarapatana',
  'Ginigathena',
  'Hanguranketha', 'Hatton',
  'Maskeliya',
  'Nanu Oya', 'Nuwara Eliya',
  'Ragala',
  'Talawakele',
  'Walapane',
];

// ── Southern Province ─────────────────────────────────────────────
const SOUTHERN_GALLE = [
  'Ahangama',
  'Baddegama', 'Bentota',
  'Elpitiya',
  'Galle',
  'Habaraduwa', 'Hikkaduwa',
  'Imaduwa',
  'Karapitiya',
  'Neluwa',
  'Unawatuna',
];

const SOUTHERN_MATARA = [
  'Akuressa',
  'Deniyaya', 'Devinuwara', 'Dikwella',
  'Gandara',
  'Kamburupitiya', 'Kekanadura',
  'Matara', 'Mirissa',
  'Weligama',
];

const SOUTHERN_HAMBANTOTA = [
  'Ambalantota',
  'Beliatta',
  'Hambantota',
  'Kataragama',
  'Middeniya',
  'Ranna',
  'Tangalle', 'Tissamaharama',
  'Weeraketiya',
];

// ── Northern Province ─────────────────────────────────────────────
const NORTHERN_JAFFNA = [
  'Chavakachcheri', 'Chunnakam',
  'Jaffna',
  'Kankesanthurai', 'Karainagar', 'Kopay',
  'Nallur',
  'Point Pedro',
  'Valvettithurai', 'Velanai',
];

const NORTHERN_OTHER = [
  'Cheddikulam',
  'Kilinochchi',
  'Madhu', 'Mannar', 'Mullaittivu', 'Murunkan',
  'Nedunkeni',
  'Oddusuddan',
  'Paranthan', 'Pooneryn', 'Puthukkudiyiruppu',
  'Vavuniya',
];

// ── Eastern Province ──────────────────────────────────────────────
const EASTERN_TRINCOMALEE = [
  'Kantalai', 'Kinniya', 'Kuchchaveli',
  'Mutur',
  'Nilaveli',
  'Trincomalee',
];

const EASTERN_BATTICALOA = [
  'Batticaloa',
  'Eravur',
  'Kalkudah', 'Kattankudy',
  'Pasikudah',
  'Vakarai', 'Valachchenai',
];

const EASTERN_AMPARA = [
  'Akkaraipattu', 'Ampara', 'Arugam Bay',
  'Kalmunai',
  'Pottuvil',
  'Sainthamaruthu', 'Sammanthurai',
];

// ── North Central Province ────────────────────────────────────────
const NORTH_CENTRAL = [
  'Anuradhapura',
  'Eppawala',
  'Galnewa', 'Giritale',
  'Habarana', 'Hingurakgoda',
  'Kaduruwela', 'Kekirawa',
  'Medawachchhiya', 'Medirigiriya', 'Mihintale',
  'Padaviya', 'Polonnaruwa',
  'Talawa', 'Tambuttegama',
  'Welanda',
];

// ── North Western Province ────────────────────────────────────────
const NORTH_WESTERN_KURUNEGALA = [
  'Alawwa',
  'Giriulla',
  'Ibbagamuwa',
  'Kuliyapitiya', 'Kurunegala',
  'Maho', 'Mawathagama',
  'Narammala',
  'Pannala', 'Polgahawela',
  'Wariyapola',
];

const NORTH_WESTERN_PUTTALAM = [
  'Anamaduwa',
  'Chilaw',
  'Dankotuwa',
  'Kalpitiya',
  'Madampe', 'Marawila',
  'Nattandiya',
  'Puttalam',
  'Wennappuwa',
];

// ── Sabaragamuwa Province ─────────────────────────────────────────
const SABARAGAMUWA_RATNAPURA = [
  'Balangoda',
  'Eheliyagoda', 'Embilipitiya',
  'Godakawela',
  'Kahawatte', 'Kuruwita',
  'Pelmadulla',
  'Ratnapura',
];

const SABARAGAMUWA_KEGALLE = [
  'Dehiowita', 'Deraniyagala',
  'Hemmathagama',
  'Kegalle',
  'Mawanella',
  'Rambukkana', 'Ruwanwella',
];

// ── Uva Province ──────────────────────────────────────────────────
const UVA_BADULLA = [
  'Badulla', 'Bandarawela',
  'Demodara', 'Diyatalawa',
  'Ella',
  'Haputale',
  'Mahiyanganaya',
  'Passara',
  'Welimada',
];

const UVA_MONARAGALA = [
  'Bibile', 'Buttala',
  'Monaragala',
  'Tanamanwila',
  'Wellawaya',
];

/**
 * All cities combined and sorted alphabetically.
 */
export const SRI_LANKAN_CITIES = [
  ...WESTERN_COLOMBO,
  ...WESTERN_GAMPAHA,
  ...WESTERN_KALUTARA,
  ...CENTRAL_KANDY,
  ...CENTRAL_MATALE,
  ...CENTRAL_NUWARA_ELIYA,
  ...SOUTHERN_GALLE,
  ...SOUTHERN_MATARA,
  ...SOUTHERN_HAMBANTOTA,
  ...NORTHERN_JAFFNA,
  ...NORTHERN_OTHER,
  ...EASTERN_TRINCOMALEE,
  ...EASTERN_BATTICALOA,
  ...EASTERN_AMPARA,
  ...NORTH_CENTRAL,
  ...NORTH_WESTERN_KURUNEGALA,
  ...NORTH_WESTERN_PUTTALAM,
  ...SABARAGAMUWA_RATNAPURA,
  ...SABARAGAMUWA_KEGALLE,
  ...UVA_BADULLA,
  ...UVA_MONARAGALA,
].sort((a, b) => a.localeCompare(b));
