/**
 * ============================================
 * FinanceSync Pro v3.3 - Firestore Database Operations
 * ============================================
 * File ini berisi semua operasi CRUD dan listener untuk Firebase Firestore.
 * Ini adalah layer abstraksi untuk semua database operations.
 */

// ==================== REALTIME LISTENER ====================

/**
 * Mulai realtime listener untuk data submissions
 * Listener ini akan otomatis update UI saat ada perubahan data di Firestore
 */
function startRealtimeListener() {
  // Hapus listener sebelumnya jika ada
  if (state.unsubscribeListener) {
    state.unsubscribeListener();
  }
  
  console.log('[Firestore] Starting realtime listener...');
  
  // Buat query: urutkan descending by timestamp, batasi 50 dokumen
  state.unsubscribeListener = state.db
    .collection('submissions')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .onSnapshot(
      // Snapshot callback (dipanggil saat data berubah)
      function(snapshot) {
        console.log('[Firestore] Received snapshot:', snapshot.size, 'documents');
        
        // Mapping data ke array state.history
        state.history = snapshot.docs.map(function(doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
        
        // Update UI
        renderHistory();
        updateStats();
        updateOverallDriveStatus();
      },
      // Error callback
      function(error) {
        console.error('[Firestore Listener Error]:', error);
        showToast('Realtime listener error: ' + error.message, 'error');
      }
    );
}

// ==================== DATE FILTER LISTENER ====================

/**
 * Apply date filter dan mulai listener dengan filter
 * @param {string} from - Tanggal awal (YYYY-MM-DD)
 * @param {string} to - Tanggal akhir (YYYY-MM-DD)
 */
function applyDateFilter() {
  if (!state.db) return;
  
  var from = state.filterDateFrom;
  var to = state.filterDateTo;

  // Jika tidak ada filter, gunakan default listener
  if (!from && !to) { 
    startRealtimeListener(); 
    return; 
  }

  console.log('[Firestore] Applying date filter:', from, 'to', to);

  // Bangun query dengan filter tanggal
  var query = state.db.collection('submissions').orderBy('tanggal', 'desc');
  
  if (from) {
    query = query.where('tanggal', '>=', from);
  }
  
  if (to) {
    query = query.where('tanggal', '<=', to);
  }

  // Hapus listener sebelumnya
  if (state.unsubscribeListener) {
    state.unsubscribeListener();
  }

  // Buat listener baru dengan filter
  state.unsubscribeListener = query.limit(100).onSnapshot(
    function(snapshot) {
      console.log('[Firestore] Filtered snapshot:', snapshot.size, 'documents');
      
      state.history = snapshot.docs.map(function(doc) {
        return Object.assign({ id: doc.id }, doc.data());
      });
      
      renderHistory();
      updateStats();
      updateOverallDriveStatus();
    },
    function(error) {
      console.error('[Filter Listener Error]:', error);
      showToast('Filter error: ' + error.message, 'error');
    }
  );
}

/**
 * Reset date filter ke default (bulan ini)
 */
window.clearDateFilter = function() {
  state.filterDateFrom = '';
  state.filterDateTo = '';
  
  var f = document.getElementById('filterDateFrom');
  var t = document.getElementById('filterDateTo');
  
  if (f) f.value = '';
  if (t) t.value = '';
  
  // Set ulang state dari input
  if (f) state.filterDateFrom = f.value;
  if (t) state.filterDateTo = t.value;
  
  // Restart listener tanpa filter
  startRealtimeListener();
  
  showToast('Filter tanggal direset', 'info');
};

// ==================== CREATE OPERATION ====================

/**
 * Tambah submission baru ke Firestore
 * @param {Object} data - Data submission yang akan disimpan
 * @returns {Promise<DocumentReference>} Reference ke dokumen yang dibuat
 */
async function createSubmission(data) {
  console.log('[Firestore] Creating new submission...');
  
  // Tambahkan metadata
  data.created_at = new Date().toISOString();
  data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
  data.source = 'FinanceSync Pro v3.3 (Drive Edition)';
  
  // Tambahkan signature defaults
  Object.assign(data, DEFAULT_SIGNATORIES);
  
  // Sync status flags
  data.synced_to_sheets = false;
  data.synced_at = null;
  data.sheets_error = null;
  
  try {
    const docRef = await state.db.collection('submissions').add(data);
    
    console.log('[Firestore] ✅ Document created with ID:', docRef.id);
    
    return docRef;
    
  } catch (error) {
    console.error('[Firestore Create Error]:', error);
    throw error;
  }
}

// ==================== UPDATE OPERATION ====================

/**
 * Update submission yang sudah ada
 * @param {string} docId - ID dokumen yang akan diupdate
 * @param {Object} data - Data baru yang akan disimpan
 * @returns {Promise<void>}
 */
async function updateSubmission(docId, data) {
  console.log('[Firestore] Updating submission:', docId);
  
  try {
    await state.db.collection('submissions').doc(docId).update(data);
    
    console.log('[Firestore] ✅ Document updated:', docId);
    
  } catch (error) {
    console.error('[Firestore Update Error]:', error);
    throw error;
  }
}

// ==================== DELETE OPERATION ====================

/**
 * Hapus submission berdasarkan ID
 * @param {string} docId - ID dokumen yang akan dihapus
 * @returns {Promise<void>}
 */
async function deleteSubmission(docId) {
  console.log('[Firestore] Deleting submission:', docId);
  
  try {
    await state.db.collection('submissions').doc(docId).delete();
    
    console.log('[Firestore] ✅ Document deleted:', docId);
    
  } catch (error) {
    console.error('[Firestore Delete Error]:', error);
    throw error;
  }
}

/**
 * Hapus SEMUA submissions
 * @returns {Promise<void>}
 */
async function deleteAllSubmissions() {
  console.log('[Firestore] Deleting ALL submissions...');
  
  try {
    const snapshot = await state.db.collection('submissions').get();
    
    // Gunakan batch operation untuk efisiensi
    const batch = state.db.batch();
    
    snapshot.docs.forEach(function(doc) {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log('[Firestore] ✅ All documents deleted:', snapshot.size, 'documents');
    
  } catch (error) {
    console.error('[Firestore Delete All Error]:', error);
    throw error;
  }
}

// ==================== READ OPERATIONS ====================

/**
 * Ambil satu submission berdasarkan ID
 * @param {string} docId - ID dokumen
 * @returns {Promise<Object>} Data dokumen
 */
async function getSubmissionById(docId) {
  console.log('[Firestore] Getting submission:', docId);
  
  try {
    const docSnap = await state.db.collection('submissions').doc(docId).get();
    
    if (!docSnap.exists) {
      console.warn('[Firestore] Document not found:', docId);
      return null;
    }
    
    const data = docSnap.data();
    console.log('[Firestore] ✅ Document retrieved:', docId);
    
    return { id: docSnap.id, ...data };
    
  } catch (error) {
    console.error('[Firestore Get Error]:', error);
    throw error;
  }
}

/**
 * Cek duplikat submission
 * @param {Object} data - Data yang akan dicek
 * @returns {Promise<boolean>} True jika ada duplikat
 */
async function checkDuplicate(data) {
  if (!state.db) return false;
  
  try {
    console.log('[Firestore] Checking for duplicates...');
    
    const snapshot = await state.db.collection('submissions')
      .where('tanggal', '==', data.tanggal)
      .where('total_nominal', '==', data.total_nominal)
      .where('dibayarkan_kepada', '==', data.dibayarkan_kepada)
      .get();

    let isDuplicate = false;
    
    snapshot.forEach(function(doc) {
      const existing = doc.data();
      
      // Bandingkan field penting
      if (
        existing.lokasi === data.lokasi &&
        existing.kode === data.kode &&
        existing.jenis_pengajuan === data.jenis_pengajuan &&
        existing.status === data.status &&
        JSON.stringify(existing.items || []) === JSON.stringify(data.items)
      ) {
        isDuplicate = true;
      }
    });
    
    console.log('[Firestore] Duplicate check result:', isDuplicate);
    
    return isDuplicate;
    
  } catch (error) {
    console.error('[Duplicate Check Error]:', error);
    return false; // Jika error, anggap tidak ada duplikat
  }
}

/**
 * Auto-generate nomor invoice berdasarkan bulan ini
 * Format: BKK-NMSA/MM/YYYY/XXXX
 * @returns {Promise<string>} Nomor invoice yang digenerate
 */
async function autoGenerateInvoice() {
  if (!state.db) return null;
  
  try {
    console.log('[Firestore] Auto-generating invoice number...');
    
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    // Range tanggal untuk bulan ini
    const startDate = year + '-' + String(month + 1).padStart(2, '0') + '-01';
    const endDate = year + '-' + String(month + 1).padStart(2, '0') + '-31';

    // Query semua dokumen di bulan ini
    const snapshot = await state.db.collection('submissions')
      .where('tanggal', '>=', startDate)
      .where('tanggal', '<=', endDate)
      .orderBy('tanggal', 'desc')
      .get();

    // Cari nomor terbesar
    let maxNum = 0;
    
    snapshot.forEach(function(doc) {
      const parts = (doc.data().no_invoice || '').split('/');
      const match = parts[parts.length - 1]?.match(/^(\d+)$/);
      
      if (match) {
        const n = parseInt(match[1]);
        if (n > maxNum) maxNum = n;
      }
    });

    // Generate nomor baru
    const invoiceNumber = 'BKK-NMSA/' + toRoman(month + 1) + '/' + year + '/' + String(maxNum + 1).padStart(4, '0');
    
    console.log('[Firestore] Generated invoice:', invoiceNumber);
    
    return invoiceNumber;
    
  } catch (error) {
    console.warn('[Auto Invoice Error]:', error.message);
    
    // Fallback ke format default
    return 'BKK-NMSA/' + toRoman(new Date().getMonth() + 1) + '/' + new Date().getFullYear() + '/0001';
  }
}

// ==================== EXPORT FUNCTIONS ====================
window.startRealtimeListener = startRealtimeListener;
window.applyDateFilter = applyDateFilter;
window.createSubmission = createSubmission;
window.updateSubmission = updateSubmission;
window.deleteSubmission = deleteSubmission;
window.deleteAllSubmissions = deleteAllSubmissions;
window.getSubmissionById = getSubmissionById;
window.checkDuplicate = checkDuplicate;
window.autoGenerateInvoice = autoGenerateInvoice;
