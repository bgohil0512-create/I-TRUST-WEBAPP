function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
}

function appendRecord_(sheetName, record) {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown entity: ${sheetName}`);

  const sheet = getSheet_(sheetName);
  const row = headers.map((header) => record[header] ?? '');
  sheet.appendRow(row);
  return record;
}

function findById_(sheetName, idField, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error(`ID field not found: ${idField}`);

  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][idIndex]) === String(id)) {
      return Object.fromEntries(headers.map((header, index) => [header, values[i][index]]));
    }
  }

  return null;
}
