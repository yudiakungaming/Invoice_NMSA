/**
 * ============================================
 * FinanceSync Pro v3.3 - Utility Functions
 * ============================================
 * File ini berisi semua fungsi utilitas yang digunakan
 * di seluruh aplikasi seperti formatting, toast, dll.
 */

// ==================== NUMBER FORMATTING ====================
/**
 * Format angka dengan pemisah ribuan (Indonesian format)
 * @param {number} num - Angka yang akan diformat
 * @returns {string} Angka yang sudah diformat
 */
function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ==================== DATE FORMATTING ====================
/**
 * Format tanggal ke bahasa Indonesia
 * @param {string} dateStr - String tanggal (YYYY-MM-DD)
 * @returns {string} Tanggal dalam format Indonesia
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  
  try {
    var date = new Date(dateStr);
    var months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  } catch (e) {
    return dateStr;
  }
}

// ==================== HTML ESCAPE ====================
/**
 * Escape HTML untuk mencegah XSS
 * @param {string} text - Teks yang akan di-escape
 * @returns {string} Teks yang sudah di-escape
 */
function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== TOAST NOTIFICATIONS ====================
/**
 * Menampilkan toast notification
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - Tipe toast ('success', 'error', 'info', 'firebase', 'drive')
 */
function showToast(message, type) {
  type = type || 'info';
  var toast = document.getElementById('toast');
  
  if (!toast) return;
  
  // Clear timeout sebelumnya jika ada
  if (toastTimeout) clearTimeout(toastTimeout);
  
  // Set konten dan kelas
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  // Auto-hide setelah 4 detik
  toastTimeout = setTimeout(function() {
    toast.classList.remove('show');
  }, 4000);
}

// ==================== ROMAN NUMERAL CONVERTER ====================
/**
 * Konversi angka ke angka Romawi
 * @param {number} num - Angka yang akan dikonversi
 * @returns {string} Angka Romawi
 */
function toRoman(num) {
  var vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  var syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  var result = '';
  
  for (var i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  
  return result;
}

// ==================== STATISTICS UPDATE ====================
/**
 * Update statistik di dashboard
 */
function updateStats() {
  if (!state.history) return;
  
  var total = state.history.length;
  var sent = total;
  var synced = 0;
  var pending = 0;

  state.history.forEach(function(item) {
    var files = item.files || [];
    
    if (files.length === 0) {
      synced++;
      return;
    }
    
    // Cek status sync setiap file
    var hasPending = files.some(function(f) {
      var fData = f.mapValue?.fields || f;
      return !fData.driveUrl?.stringValue && !fData.driveUrl && fData.status !== 'synced';
    });
    
    if (hasPending) {
      pending++;
    } else {
      synced++;
    }
  });

  // Update DOM elements
  if (elements.totalData) elements.totalData.textContent = total;
  if (elements.sentData) elements.sentData.textContent = sent;
  if (elements.sheetsData) elements.sheetsData.textContent = synced;
  if (elements.pendingData) elements.pendingData.textContent = pending;
}

// ==================== TIMEOUT HELPER ====================
/**
 * Wrapper untuk Promise dengan timeout
 * @param {Promise} promise - Promise yang akan di-wrap
 * @param {number} ms - Timeout dalam milidetik
 * @param {string} label - Label untuk error message
 * @returns {Promise} Promise dengan timeout
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() {
        reject(new Error(label + ' timeout'));
      }, ms);
    })
  ]);
}

// ==================== EXPORT FUNCTIONS ====================
// Membuat fungsi dapat diakses secara global
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.toRoman = toRoman;
window.updateStats = updateStats;
window.withTimeout = withTimeout;
