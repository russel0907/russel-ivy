const SPREADSHEET_ID = '1L8YH4asztAjjEV5Tyr7UPau9moBIVeC6MDRPy5ZOKJM';
const RSVP_TAB = 'RSVP';

function setupRSVP() {
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = book.getSheetByName(RSVP_TAB) || book.insertSheet(RSVP_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Nama', 'Kehadiran', 'Bilangan Orang', 'Tarikh Respons']);
    sheet.setFrozenRows(1);
  }
  const summary = book.getSheetByName('Ringkasan') || book.insertSheet('Ringkasan');
  if (summary.getLastRow() === 0) {
    summary.getRange('A1:B5').setValues([
      ['Ringkasan RSVP', 'Jumlah'],
      ['Jumlah Tetamu Hadir', '=SUMIF(RSVP!B2:B,"Hadir",RSVP!C2:C)'],
      ['Respons Hadir', '=COUNTIF(RSVP!B2:B,"Hadir")'],
      ['Respons Tidak Hadir', '=COUNTIF(RSVP!B2:B,"Tidak hadir")'],
      ['Jumlah Respons', '=COUNTA(RSVP!A2:A)']
    ]);
    summary.getRange('A1:B1').setFontWeight('bold').setBackground('#3d1220').setFontColor('#ffffff');
    summary.getRange('A2:B2').setFontWeight('bold').setBackground('#f5efe3');
    summary.getRange('B2:B5').setNumberFormat('0');
    summary.setFrozenRows(1);
    summary.autoResizeColumns(1, 2);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    const name = String(data.name || '').trim();
    const attendance = String(data.zusage || '');
    const guests = Number(data.personen);
    if (!name || name.length > 200 || !['Hadir', 'Tidak hadir'].includes(attendance) ||
        !Number.isInteger(guests) || guests < 0 || guests > 100 ||
        (attendance === 'Hadir' && guests < 1)) {
      throw new Error('Maklumat kehadiran tidak sah.');
    }
    lock.waitLock(10000);
    setupRSVP();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RSVP_TAB);
    // Store names as literal text, including names starting with formula characters.
    const safeName = /^[=+@-]/.test(name) ? "'" + name : name;
    sheet.appendRow([safeName, attendance, attendance === 'Hadir' ? guests : 0, new Date()]);
    sheet.getRange(sheet.getLastRow(), 4).setNumberFormat('dd.MM.yyyy HH:mm:ss');
    return jsonResponse({ok: true});
  } catch (error) {
    return jsonResponse({ok: false, error: String(error.message)});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
