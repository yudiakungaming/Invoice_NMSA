/**
 * ============================================
 * FinanceSync Pro v3.3 - Google Drive Sync Functions
 * ============================================
 * File ini menangani semua fungsi terkait sinkronisasi ke Google Drive,
 * termasuk status tracking, polling, dan manual sync trigger.
 */

// ==================== DRIVE SYNC LISTENER (PER DOCUMENT) ====================

/**
 * Mulai listener untuk monitoring sync status satu dokumen
 * Listener ini akan update UI saat status sync berubah di Firestore
 * @param {string} docId - ID dokumen yang akan dimonitor
 */
function startDriveSyncListener(docId) {
  if (!state.db || !docId) return;

  // Hapus listener sebelumnya untuk doc ini jika ada
  if (state.driveSyncListeners[docId]) {
    state.driveSyncListeners[docId]();
  }

  console.log('[Drive Sync] Starting listener for document:', docId);

  // Buat realtime listener untuk dokumen spesifik
  state.driveSyncListeners[docId] = state.db
    .collection('submissions')
    .doc(docId)
    .onSnapshot(
      // Snapshot callback
      function(docSnapshot) {
        if (!docSnapshot.exists) {
          console.warn('[Drive Sync] Document not found:', docId);
          return;
        }

        const data = docSnapshot.data();
        const files = data.files || [];

        // Hitung status file
        const syncedFiles = files.filter(function(f) {
          const fData = f.mapValue?.fields || f;
          return fData.driveUrl?.stringValue || fData.driveUrl;
        });

        const pendingFiles = files.filter(function(f) {
          const fData = f.mapValue?.fields || f;
          return !fData.driveUrl?.stringValue && !fData.driveUrl && fData.status !== 'synced';
        });

        const errorFiles = files.filter(function(f) {
          const fData = f.mapValue?.fields || f;
          return fData.status?.stringValue === 'error' || fData.status === 'error';
        });

        console.log(
          '[Drive Sync] Document:', docId,
          '- Synced:', syncedFiles.length,
          '- Pending:', pendingFiles.length,
          '- Error:', errorFiles.length
        );

        // Update UI berdasarkan status
        if (syncedFiles.length === files.length && files.length > 0) {
          // Semua file sudah synced
          updateDriveStatusBanner('synced', '✅ Semua file berhasil disinkronkan ke Google Spreadsheet!');
          showToast('✅ File berhasil sync ke Google Spreadsheet!', 'drive');
          
          // Update stats dan history
          updateStats();
          renderHistory();
          
          // Stop listener karena sudah selesai
          if (state.driveSyncListeners[docId]) {
            state.driveSyncListeners[docId]();
            delete state.driveSyncListeners[docId];
          }
          
        } else if (errorFiles.length > 0) {
          // Ada error
          const errorMsg = errorFiles[0].mapValue?.fields?.errorMessage?.stringValue || 'Unknown error';
          updateDriveStatusBanner('error', '❌ Error sync: ' + errorMsg);
          showToast('Error sync Drive: ' + errorMsg, 'error');
          
        } else if (pendingFiles.length > 0) {
          // Masih pending
          updateDriveStatusBanner(
            'pending', 
            '⏳ Menunggu ' + pendingFiles.length + ' file untuk sync ke Google Spreadsheet...'
          );
          
        } else if (files.length === 0) {
          // Tidak ada file
          hideDriveStatusBanner();
        }
      },
      // Error callback
      function(error) {
        console.error('[Drive Listener Error]:', error);
        updateDriveStatusBanner('error', '❌ Error monitoring sync status');
      }
    );
}

// ==================== DRIVE STATUS POLLING ====================

/**
 * Mulai polling untuk cek status sync secara berkala
 * Polling dilakukan setiap 30 detik
 */
function startDriveStatusPolling() {
  // Hanya mulai polling jika belum ada
  if (state.pollingInterval) {
    console.log('[Drive Sync] Polling already running');
    return;
  }

  console.log('[Drive Sync] Starting status polling (every 30s)...');

  state.pollingInterval = setInterval(function() {
    // Skip jika tidak terhubung
    if (!state.db || !state.isConnected) return;

    // Hitung total documents dengan pending files
    const totalPendingDocs = state.history.filter(function(doc) {
      if (!doc.files || doc.files.length === 0) return false;
      
      return doc.files.some(function(f) {
        const fData = f.mapValue?.fields || f;
        return !fData.driveUrl?.stringValue && !fData.driveUrl && fData.status !== 'synced';
      });
    }).length;

    // Update banner jika ada pending
    if (totalPendingDocs > 0 && elements.driveStatusBanner) {
      if (elements.driveStatusBanner.style.display === 'none') {
        elements.driveStatusBanner.style.display = 'flex';
      }
      
      elements.driveStatusText.textContent = 
        totalPendingDocs + ' transaksi dengan file menunggu sync ke Google Spreadsheet...';
    }

  }, 30000); // Setiap 30 detik
}

/**
 * Hentikan polling dan semua drive listeners
 */
function stopDriveStatusPolling() {
  console.log('[Drive Sync] Stopping all polling and listeners...');
  
  // Clear polling interval
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
  }

  // Unsubscribe dari semua document listeners
  Object.keys(state.driveSyncListeners).forEach(function(docId) {
    if (state.driveSyncListeners[docId]) {
      state.driveSyncListeners[docId]();
    }
  });
  
  state.driveSyncListeners = {};
}

// ==================== DRIVE STATUS BANNER MANAGEMENT ====================

/**
 * Update tampilan drive status banner
 * @param {string} status - Status ('pending', 'synced', 'error')
 * @param {string} message - Pesan yang ditampilkan
 */
function updateDriveStatusBanner(status, message) {
  if (!elements.driveStatusBanner) return;

  // Tampilkan banner
  elements.driveStatusBanner.style.display = 'flex';
  
  // Update class berdasarkan status
  elements.driveStatusBanner.className = 
    'drive-status-banner no-print ' + (status === 'synced' ? 'active' : '');
  
  // Update pesan
  elements.driveStatusText.textContent = message;

  // Update badge
  if (elements.driveStatusBadge) {
    elements.driveStatusBadge.className = 'drive-status-badge ' + status;
    
    switch (status) {
      case 'synced':
        elements.driveStatusBadge.innerHTML = '✅ Done';
        break;
      case 'pending':
        elements.driveStatusBadge.innerHTML = '⏳ Pending';
        break;
      case 'error':
        elements.driveStatusBadge.innerHTML = '❌ Error';
        break;
      default:
        elements.driveStatusBadge.innerHTML = '⏳ Unknown';
    }
  }
}

/**
 * Sembunyikan drive status banner
 */
function hideDriveStatusBanner() {
  if (elements.driveStatusBanner) {
    elements.driveStatusBanner.style.display = 'none';
  }
}

// ==================== OVERALL DRIVE STATUS UPDATE ====================

/**
 * Update overall drive status berdasarkan semua data di history
 * Dipanggil setiap kali history berubah
 */
function updateOverallDriveStatus() {
  if (!state.history || state.history.length === 0) {
    hideDriveStatusBanner();
    return;
  }

  let totalPendingDocs = 0;
  let totalSyncedDocs = 0;

  // Iterasi semua documents
  state.history.forEach(function(item) {
    const files = item.files || [];
    
    if (files.length === 0) return; // Skip tanpa files

    const hasPending = files.some(function(f) {
      const fData = f.mapValue?.fields || f;
      return !fData.driveUrl?.stringValue && !fData.driveUrl && fData.status !== 'synced';
    });

    if (hasPending) {
      totalPendingDocs++;
    } else {
      totalSyncedDocs++;
    }
  });

  // Update banner berdasarkan hasil
  if (totalPendingDocs > 0) {
    updateDriveStatusBanner(
      'pending',
      totalPendingDocs + ' transaksi dengan file menunggu sync ke Google Spreadsheet...'
    );
  } else if (totalSyncedDocs > 0) {
    updateDriveStatusBanner(
      'synced',
      '✅ Semua file (' + totalSyncedDocs + ') sudah sync ke Google Spreadsheet!'
    );
    
    // Auto-hide setelah 5 detik
    setTimeout(hideDriveStatusBanner, 5000);
  } else {
    hideDriveStatusBanner();
  }
}

// ==================== MANUAL SYNC TRIGGER ====================

/**
 * Trigger manual sync (tombol "Sync Sekarang")
 * Fungsi ini mengecek status sync dan memberikan feedback ke user
 */
window.triggerManualSync = async function() {
  // Validasi koneksi Firebase
  if (!state.db) {
    showToast('Firebase belum terhubung!', 'error');
    return;
  }

  const btn = elements.forceSyncBtn;
  if (!btn) return;

  // Update button UI ke state "checking"
  btn.disabled = true;
  btn.classList.add('syncing');
  btn.innerHTML = `
    <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v1a3 3 0 003 3 3h10a3 3 0 002-4 2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    <span>Checking...</span>
  `;

  try {
    // Cek apakah ada document yang tersimpan
    if (!state.lastSavedDocId) {
      showToast('Tidak ada data untuk di-sync. Submit form dulu!', 'info');
      resetSyncButton(btn);
      return;
    }

    // Ambil data document terakhir
    const docSnap = await state.db.collection('submissions').doc(state.lastSavedDocId).get();
    
    if (!docSnap.exists) {
      showToast('Document tidak ditemukan!', 'error');
      resetSyncButton(btn);
      return;
    }

    const data = docSnap.data();
    const files = data.files || [];

    // Jika tidak ada file
    if (files.length === 0) {
      showToast('Tidak ada file untuk di-sync pada transaksi ini.', 'info');
      resetSyncButton(btn);
      return;
    }

    // Hitung status file
    const syncedCount = files.filter(function(f) {
      const fData = f.mapValue?.fields || f;
      return fData.driveUrl?.stringValue || fData.driveUrl;
    }).length;

    const pendingCount = files.filter(function(f) {
      const fData = f.mapValue?.fields || f;
      return !fData.driveUrl?.stringValue && !fData.driveUrl && fData.status !== 'synced';
    }).length;

    const errorCount = files.filter(function(f) {
      const fData = f.mapValue?.fields || f;
      return fData.status?.stringValue === 'error' || fData.status === 'error';
    }).length;

    // Berikan feedback sesuai status
    if (syncedCount === files.length && files.length > 0) {
      // Semua sudah synced
      showToast('✅ Semua file (' + syncedCount + ') berhasil tersinkron ke Google Spreadsheet!', 'drive');
      
      // Update button ke state "success"
      btn.classList.remove('syncing');
      btn.classList.add('synced');
      btn.innerHTML = `
        <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        <span>All Synced ✓</span>
      `;
      
      // Reset setelah 3 detik
      setTimeout(function() {
        btn.disabled = false;
        btn.classList.remove('synced');
        btn.innerHTML = `
          <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3 3h10a3 3 0 002-4 2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <span>Sync Sekarang</span>
        `;
      }, 3000);

    } else if (errorCount > 0) {
      // Ada error
      showToast('❌ ' + errorCount + ' file error. Cek log Apps Script.', 'error');
      resetSyncButton(btn);
      btn.innerHTML = `
        <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 0l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <span>Error - Retry</span>
      `;
      
    } else {
      // Masih pending
      showToast('⏳ ' + pendingCount + '/' + files.length + ' file masih pending. Apps Script akan proses otomatis.', 'info');
      resetSyncButton(btn);
      btn.innerHTML = `
        <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        <span>Pending (${pendingCount})</span>
      `;
    }

  } catch (error) {
    console.error('[Force Sync Error]:', error);
    showToast('Error: ' + error.message, 'error');
    resetSyncButton(btn);
    btn.innerHTML = `
      <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3 3h10a3 3 0 002-4 2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
      </svg>
      <span>Retry</span>
    `;
  }
};

// ==================== HELPER: RESET SYNC BUTTON ====================

/**
 * Reset sync button ke state default
 * @param {HTMLElement} btn - Button element
 */
function resetSyncButton(btn) {
  if (!btn) return;
  
  btn.disabled = false;
  btn.classList.remove('syncing');
  btn.innerHTML = `
    <svg class="drive-sync-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3 3h10a3 3 0 002-4 2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
    <span>Sync Sekarang</span>
  `;
}

// ==================== APPS SCRIPT URL SETUP ====================

/**
 * Modal setup untuk input Apps Script Web App URL
 * Dipanggil saat user ingin mengkonfigurasi URL Apps Script
 */
window.showModalAppsScriptSetup = function() {
  const url = prompt(
    '📝 Masukkan URL Web App Apps Script:\n\n' +
    '1. Buka Google Apps Script Editor\n' +
    '2. Deploy → New deployment\n' +
    '3. Type: Web app\n' +
    '4. Execute as: Me (email Anda)\n' +
    '5. Who has access: Anyone\n' +
    '6. Deploy → Copy URL di bawah\n\n' +
    'URL:'
  );

  if (url && url.trim()) {
    try {
      // Validasi URL format
      new URL(url);
      
      // Simpan ke state dan localStorage
      state.appsScriptUrl = url.trim();
      localStorage.setItem(CONFIG_KEYS.APPS_SCRIPT_URL, state.appsScriptUrl);
      
      showToast('✅ URL Apps Script disimpan! Menghubungi...', 'success');
      
      // Trigger sync setelah 1 detik
      setTimeout(triggerManualSync, 1000);
      
    } catch (e) {
      console.error('Invalid URL:', e);
      showToast('URL tidak valid!', 'error');
    }
  }
};

// ==================== EXPORT FUNCTIONS ====================
window.startDriveSyncListener = startDriveSyncListener;
window.startDriveStatusPolling = startDriveStatusPolling;
window.stopDriveStatusPolling = stopDriveStatusPolling;
window.updateDriveStatusBanner = updateDriveStatusBanner;
window.hideDriveStatusBanner = hideDriveStatusBanner;
window.updateOverallDriveStatus = updateOverallDriveStatus;
