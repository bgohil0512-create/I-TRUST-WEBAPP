const CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
};

function doGet() {
  return jsonResponse({ success: true, service: 'I-TRUST-WEBAPP API', version: '0.2.0' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const action = body.action || 'unknown';
    const payload = body.payload || {};
    const requestId = body.requestId || Utilities.getUuid();

    if (action === 'LOGIN') {
      return jsonResponse({ success: true, requestId, data: authenticate_(payload.username, payload.password) });
    }

    const session = requireSession_(payload.token);
    const result = routeAction_(action, payload, session);
    return jsonResponse({ success: true, requestId, data: result });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function routeAction_(action, payload, session) {
  if (action === 'ME') return sanitizeUser_(findById_('Users', 'userId', session.userId));

  if (action === 'LIST') {
    requirePermission_(session, `${payload.entity}:VIEW`);
    return queryRecords_(payload.entity, (row) => !payload.shopId || row.shopId === payload.shopId);
  }

  if (action === 'GET') {
    requirePermission_(session, `${payload.entity}:VIEW`);
    return findById_(payload.entity, payload.idField, payload.id);
  }

  if (action === 'CREATE') {
    requirePermission_(session, `${payload.entity}:CREATE`);
    return createRecord_(payload.entity, payload.record);
  }

  if (action === 'UPDATE') {
    requirePermission_(session, `${payload.entity}:EDIT`);
    return updateRecord_(payload.entity, payload.idField, payload.id, payload.patch);
  }

  if (action === 'DELETE') {
    requirePermission_(session, `${payload.entity}:DELETE`);
    return deleteRecord_(payload.entity, payload.idField, payload.id);
  }

  throw new Error(`Unknown action: ${action}`);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
