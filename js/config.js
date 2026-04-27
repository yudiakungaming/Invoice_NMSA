/**
 * ============================================
 * FinanceSync Pro v3.3 - Configuration & Global State
 * ============================================
 * File ini berisi semua konfigurasi dan variabel global
 * yang digunakan di seluruh aplikasi.
 */

// ==================== CONFIGURATION KEYS ====================
const CONFIG_KEYS = {
  FIREBASE_CONFIG: 'financesync_firebase_config_v33',
  APPS_SCRIPT_URL: 'financesync_apps_script_url_v33'
};

// ==================== GLOBAL STATE ====================
const state = {
  // Firebase Connection State
  isConnected: false,
  isConnecting: true,
  
  // Database Reference
  db: null,
  
  // Application Data
  history: [],
  currentTab: 'Lunas',
  lastFormData: null,
  lastSavedDocId: null,
  
  // Form Items State
  items: [{ ket: '', qty: '', nominal: 0, keterangan: '' }],
  
  // File Upload State
  selectedFiles: [],
  
  // Listener Management
  unsubscribeListener: null,
  driveSyncListeners: {},
  pollingInterval: null,
  
  // Sync State
  isSyncing: false,
  appsScriptUrl: localStorage.getItem(CONFIG_KEYS.APPS_SCRIPT_URL) || '',
  
  // Edit Mode State
  editingDocId: null,
  pendingDeleteId: null,
  pendingDeleteKode: null,
  
  // Filter State
  filterDateFrom: '',
  filterDateTo: ''
};

// ==================== DOM ELEMENTS CACHE ====================
let elements = {};

// ==================== TOAST TIMEOUT ====================
let toastTimeout = null;

// ==================== DEFAULT SIGNATORIES ====================
const DEFAULT_SIGNATORIES = {
  dibuat_oleh: 'Nur Wahyudi',
  disetujui_oleh: 'Harijon',
  keuangan: 'Andi Dhiya Salsabila',
  dir_keuangan: 'Harijon',
  direktur_utama: 'H. Andi Nursyam Halid',
  accounting: 'Sri Ekowati'
};

// ==================== EXPORT FOR GLOBAL ACCESS ====================
// Membuat fungsi dan variabel dapat diakses secara global
window.CONFIG_KEYS = CONFIG_KEYS;
window.state = state;
window.elements = elements;
window.DEFAULT_SIGNATORIES = DEFAULT_SIGNATORIES;
