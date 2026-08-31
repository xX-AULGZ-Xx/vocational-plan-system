const fs = require('fs');
let code = fs.readFileSync('../api/src/modules/admin/admin.controller.ts', 'utf8');

// Find GET /settings block
const getSettingsStart = code.indexOf('// GET /api/v1/admin/settings');
const putSettingsStart = code.indexOf('// PUT /api/v1/admin/settings');

if (getSettingsStart > -1 && putSettingsStart > -1) {
    const getSettingsCode = code.substring(getSettingsStart, putSettingsStart);
    
    // Remove the GET settings code from its current place
    code = code.substring(0, getSettingsStart) + code.substring(putSettingsStart);
    
    // Insert it BEFORE router.use(authenticate)
    const authStart = code.indexOf('// All routes require ADMIN role');
    if (authStart > -1) {
        code = code.substring(0, authStart) + getSettingsCode + '\n' + code.substring(authStart);
        fs.writeFileSync('../api/src/modules/admin/admin.controller.ts', code);
        console.log('Moved GET /settings to public!');
    }
}
