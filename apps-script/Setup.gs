function initializeSystem() {
  if (!CONFIG.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  setupSchema();
  seedRolesAndPermissions_();
  return jsonResponse({ success:true, message:'I-TRUST WEBAPP database foundation initialized.' });
}

function seedRolesAndPermissions_() {
  const roles = [
    { roleId:'ROLE_ADMIN', roleName:'ADMIN', description:'Full authority', status:'ACTIVE' },
    { roleId:'ROLE_MANAGER', roleName:'MANAGER', description:'Assigned shop manager', status:'ACTIVE' },
    { roleId:'ROLE_USER', roleName:'USER', description:'Assigned shop user', status:'ACTIVE' }
  ];

  roles.forEach((role) => {
    if (!findById_('Roles', 'roleId', role.roleId)) appendRecord_('Roles', role);
  });

  const keys = new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat().filter((key) => key !== '*'));
  keys.forEach((permissionKey) => {
    const permissionId = `PERM_${permissionKey}`;
    if (!findById_('Permissions', 'permissionId', permissionId)) {
      appendRecord_('Permissions', { permissionId, permissionKey, description:permissionKey, status:'ACTIVE' });
    }
  });
}

function createInitialAdmin(username, password, name, email) {
  if (!username || !password || !name) throw new Error('username, password and name are required.');
  if (!CONFIG.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is not configured.');

  const existing = queryRecords_('Users', (row) => String(row.username).toLowerCase() === String(username).toLowerCase());
  if (existing.length) throw new Error('Username already exists.');

  const userId = `USER_${Utilities.getUuid()}`;
  const now = new Date().toISOString();
  appendRecord_('Users', {
    userId, name, username, email:email || '', passwordHash:hashPassword_(password), roleId:'ROLE_ADMIN', status:'ACTIVE',
    createdAt:now, updatedAt:now, lastLoginAt:''
  });

  return { success:true, userId, username, roleId:'ROLE_ADMIN' };
}

/**
 * One-time interactive Admin setup.
 * Password is entered at runtime and is stored only as a SHA-256 hash.
 * No password is written into source code.
 */
function setupInitialAdmin() {
  const ui = SpreadsheetApp.getUi();

  const namePrompt = ui.prompt('I-TRUST Admin Setup', 'Admin Name:', ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;

  const usernamePrompt = ui.prompt('I-TRUST Admin Setup', 'Admin Username / Email:', ui.ButtonSet.OK_CANCEL);
  if (usernamePrompt.getSelectedButton() !== ui.Button.OK) return;

  const passwordPrompt = ui.prompt('I-TRUST Admin Setup', 'Admin Password:', ui.ButtonSet.OK_CANCEL);
  if (passwordPrompt.getSelectedButton() !== ui.Button.OK) return;

  const emailPrompt = ui.prompt('I-TRUST Admin Setup', 'Admin Email (optional):', ui.ButtonSet.OK_CANCEL);
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;

  const result = createInitialAdmin(
    usernamePrompt.getResponseText().trim(),
    passwordPrompt.getResponseText(),
    namePrompt.getResponseText().trim(),
    emailPrompt.getResponseText().trim()
  );

  ui.alert(`Admin created successfully.\n\nUsername: ${result.username}\nRole: ADMIN`);
}
