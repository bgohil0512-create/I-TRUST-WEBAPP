function queryRecords_(sheetName, predicate) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])))
    .filter(predicate || (() => true));
}

function createRecord_(sheetName, record) {
  if (!SHEET_SCHEMAS[sheetName]) throw new Error(`Unknown entity: ${sheetName}`);
  if (!record) throw new Error('Record is required.');
  appendRecord_(sheetName, record);
  return record;
}

function updateRecord_(sheetName, idField, id, patch) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Record not found.');
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error(`ID field not found: ${idField}`);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idIndex]) === String(id)) {
      headers.forEach((header, columnIndex) => {
        if (Object.prototype.hasOwnProperty.call(patch, header)) {
          values[rowIndex][columnIndex] = patch[header];
        }
      });
      sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([values[rowIndex]]);
      return Object.fromEntries(headers.map((header, index) => [header, values[rowIndex][index]]));
    }
  }
  throw new Error('Record not found.');
}

function deleteRecord_(sheetName, idField, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error(`ID field not found: ${idField}`);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idIndex]) === String(id)) {
      sheet.deleteRow(rowIndex + 1);
      return true;
    }
  }
  throw new Error('Record not found.');
}
