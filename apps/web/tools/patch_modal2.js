const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const regex = /<div className="fixed inset-0 z-50 overflow-y-auto"[\s\S]*?<div className="bg-white px-6 py-4/;

const replacement = `<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={() => setSelectedTemplate(null)}><X className="w-6 h-6" /></button>
            <div className="bg-white px-6 py-4`;

code = code.replace(regex, replacement);

// Remove the extra closing </div> since the new wrapper is one level shallower
code = code.replace(/<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\)\}\n\s*<\/div>\n\s*\);\n\}/, 
`</div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}`);

fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Patched correctly');
