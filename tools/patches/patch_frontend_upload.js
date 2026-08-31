const fs = require('fs');
const path = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add canUploadDoc
const canApproveSearch = "const canApprove =";
if (code.includes(canApproveSearch)) {
  const canUploadDocStr = "\n  const canUploadDoc = user && (user.id === project.leader?.id || user.role === 'ADMIN' || user.role === 'PLANNING_OFFICER');\n";
  code = code.replace(canApproveSearch, canUploadDocStr + canApproveSearch);
}

// 2. Hide upload UI
const uploadUIDiv = "<div>\n            <input\n              ref={fileInputRef}\n              type=\"file\"";
if (code.includes(uploadUIDiv)) {
  code = code.replace(uploadUIDiv, "{canUploadDoc && (\n          <div>\n            <input\n              ref={fileInputRef}\n              type=\"file\"");
  // Now close the conditional render block
  const uploadUIEnd = "</span>\n                </>\n              )}\n            </label>\n          </div>";
  code = code.replace(uploadUIEnd, "</span>\n                </>\n              )}\n            </label>\n          </div>\n          )}");
}

// 3. Hide delete button
const deleteBtn = "<button\n                    onClick={() => handleDocDelete(doc.id)}";
if (code.includes(deleteBtn)) {
  code = code.replace(deleteBtn, "{canUploadDoc && (\n                  <button\n                    onClick={() => handleDocDelete(doc.id)}");
  
  const deleteBtnEnd = "<Trash2 className=\"w-4 h-4\" />\n                  </button>";
  code = code.replace(deleteBtnEnd, "<Trash2 className=\"w-4 h-4\" />\n                  </button>\n                  )}");
}

fs.writeFileSync(path, code);
console.log('Frontend patched.');
