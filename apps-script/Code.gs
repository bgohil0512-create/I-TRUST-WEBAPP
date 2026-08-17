const CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
};

function doGet() {
  return jsonResponse({
    success: true,
    service: 'I-TRUST-WEBAPP API',
    version: '0.1.0',
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const action = body.action || 'unknown';
    const requestId = body.requestId || Utilities.getUuid();

    return jsonResponse({
      success: false,
      requestId,
      error: `Action not implemented: ${action}`,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
