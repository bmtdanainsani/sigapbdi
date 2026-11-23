import { User, SurveyApplication, AuditLog, AppNotification, ScoringFormulaConfig, AppSettings } from '../types';

export const LEGACY_TRIAL_USER_IDS = [
  'usr-admin-cabang',
  'usr-analis-kredit',
  'usr-branch-manager',
  'usr-risk-management',
  'usr-manajemen-direksi',
  'usr-marketing-ao',
];

export const DEFAULT_SUPERADMIN: User = {
  id: 'usr-superadmin',
  name: 'Super Administrator',
  email: 'bmtdanainsani@gmail.com',
  role: 'super_admin',
  roleTitle: 'Super Administrator & Kadiv Operasional',
  department: 'Kantor Pusat & Manajemen Risiko',
  branch: 'Kantor Pusat',
  phone: '081288990011',
  createdAt: new Date().toISOString(),
  status: 'active',
  username: 'superadmin',
  initialUsername: 'superadmin',
  password: '••••••••',
  initialPassword: '••••••••',
};

// Initial users: clean production state with only Super Admin
export const INITIAL_USERS: User[] = [DEFAULT_SUPERADMIN];

// Initial applications: clean production state with 0 trial records
export const INITIAL_APPLICATIONS: SurveyApplication[] = [];

// Initial audit logs: clean production state
export const INITIAL_LOGS: AuditLog[] = [];

// Initial notifications: clean production state
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Konfigurasi rumus dan kebijakan default credit scoring & risk engine BMT
export const DEFAULT_SCORING_FORMULA_CONFIG: ScoringFormulaConfig = {
  id: 'scoring-config-bmt',
  policyName: 'Kebijakan Standar Scoring & Mitigasi Risiko BMT Dana Insani',
  policyVersion: 'v2.6-2026',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Administrator',
  weights5C: {
    capacity: 30, // 30%
    character: 25, // 25%
    collateral: 15, // 15%
    capital: 15, // 15%
    condition: 15, // 15%
  },
  gradeThresholds: {
    minScoreGradeA: 80, // Skor >= 80 -> Grade A
    maxDsrGradeA: 35, // DSR <= 35% -> Grade A
    minScoreGradeB: 65, // Skor >= 65 -> Grade B
    maxDsrGradeB: 42, // DSR <= 42% -> Grade B
    minScoreGradeC: 50, // Skor >= 50 -> Grade C
    maxDsrGradeC: 50, // DSR <= 50% -> Grade C
    maxRedFlagsGradeC: 1, // Max 1 temuan red flag untuk Grade C
  },
  financialSettings: {
    annualMarginRate: 0.12, // 12% per tahun (flat margin standard microfinance)
    safeDsrLimit: 35, // 35% batas aman beban angsuran
    criticalDsrLimit: 45, // 45% batas kritis beban angsuran
    stressTestDropPct: 20, // 20% skenario penurunan omzet usaha
    safeCashflowMultiplier: 0.65, // 65% batas aman pemakaian sisa cashflow bebas
  },
  fraudSettings: {
    criticalPenaltyPoints: 18, // -18 poin jika parameter kritis bermasalah
    highPenaltyPoints: 10, // -10 poin jika parameter high bermasalah
    autoRejectRedFlagCount: 2, // Auto-reject jika >= 2 temuan red flag
  },
  collateralSettings: {
    shmMaxLtv: 85, // 85% untuk SHM Tanah/Bangunan
    bpkbMobilMaxLtv: 75, // 75% untuk BPKB Mobil
    bpkbMotorMaxLtv: 65, // 65% untuk BPKB Motor
    ajbMaxLtv: 60, // 60% untuk Akta Jual Beli
    depositoMaxLtv: 90, // 90% untuk Deposito BMT
    lainnyaMaxLtv: 50, // 50% untuk agunan lainnya
    haircutLiquidationRate: 75, // Nilai likuidasi default 75% nilai pasar
  },
  notes: 'Formula standar operasional lembaga disesuaikan dengan pedoman evaluasi 5C dan ketentuan Kemenkop UKM RI.',
};

// Konfigurasi identitas lembaga & pengaturan aplikasi default
export const DEFAULT_APP_SETTINGS: AppSettings = {
  // 1. Identitas & Branding Aplikasi
  appName: 'BMT Dana Insani',
  appSubtitle: 'Sistem Credit Scoring 5C & Komite Pembiayaan',
  institutionName: 'KSPPS BMT DANA INSANI',
  institutionTagline: 'Mitra Usaha Syariah Terpercaya, Barakah & Bertumbuh Bersama',
  institutionLegalNumber: 'AHU-0004123.AH.01.26.TAHUN 2021 / Kemenkop RI',
  institutionAddress: 'Jl. Raya Condet No. 88, Pasar Minggu, Jakarta Selatan, DKI Jakarta 12510',
  institutionPhone: '(021) 7888-2345 / 0812-8899-0011',
  institutionEmail: 'operasional@danainsani.bmt.co.id',
  institutionWebsite: 'https://danainsani.bmt.co.id',

  // 2. Tema & Visual
  colorTheme: 'emerald',
  defaultMode: 'dark',
  brandBadgeText: 'Sistem Terintegrasi v3.5',
  showWatermarkOnPrint: true,

  // 3. Kop Surat & Cetak Berkas
  printHeaderTitle: 'KSPPS BMT DANA INSANI - DIVISI MANAJEMEN RISIKO',
  printHeaderSubtitle: 'BERITA ACARA KEPUTUSAN KOMITE PEMBIAYAAN & HASIL SURVEY ON-SITE',
  printLegalFooterNotice: 'Dokumen ini merupakan rahasia lembaga internal komite pembiayaan dan berkekuatan hukum yang sah.',
  defaultCityDecision: 'Jakarta Selatan',

  // 4. Parameter Operasional
  defaultMarginRatePa: 12,
  maxLoanPlafon: 500000000,
  maxTenorMonths: 60,
  minNikKkDigits: 16,
  minPhoneDigits: 10,
  requireSpouseKtpWhenMarried: true,
  requireParentKtpWhenSingle: true,
  maxCollateralsCount: 10,

  // 5. Master Data Pilihan Kantor & Nama AO
  officeAoCatalog: [
    {
      id: 'office-pasar-minggu',
      officeName: 'Cabang Pasar Minggu',
      aoNames: [],
    },
    {
      id: 'office-kantor-pusat',
      officeName: 'Kantor Pusat',
      aoNames: [],
    },
  ],

  // 6. Metadata
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Administrator',
};
