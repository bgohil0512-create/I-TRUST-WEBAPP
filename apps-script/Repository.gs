function getSpreadsheet_() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}. Run initializeSystem first.`);
  }
  return sheet;
}

function appendRecord_(sheetName, record) {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) {
    throw new Error(`Unknown entity: ${sheetName}`);
  }

  getSheet_(sheetName).appendRow(
    headers.map((header) => record[header] ?? '')
  );

  return record;
}

function findById_(sheetName, idField, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return null;

  const headers = values[0];
  const idIndex = headers.indexOf(idField);

  if (idIndex < 0) {
    throw new Error(`ID field not found: ${idField}`);
  }

  for (let row = 1; row < values.length; row += 1) {
    if (String(values[row][idIndex]) === String(id)) {
      return Object.fromEntries(
        headers.map((header, index) => [header, values[row][index]])
      );
    }
  }

  return null;
}
