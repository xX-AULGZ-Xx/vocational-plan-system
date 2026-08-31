const fs = require('fs');

function modFile(path) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace standard labels
  code = code.replace(
    /<label className="block text-sm font-medium text-gray-700 mb-1">\{label\} \{tag\.is_required && <span className="text-red-500">\*<\/span>\}<\/label>/g,
    `<div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>`
  );
  
  // Replace ALIGNMENT_CHECKLIST label which uses text-gray-900 mb-3
  code = code.replace(
    /<label className="block text-sm font-medium text-gray-900 mb-3">\{label\} \{tag\.is_required && <span className="text-red-500">\*<\/span>\}<\/label>/g,
    `<div className="mb-3">
              <label className="block text-sm font-medium text-gray-900">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>`
  );
  
  // Replace TIMELINE label which uses mb-2
  code = code.replace(
    /<label className="block text-sm font-medium text-gray-700 mb-2">\{label\} \{tag\.is_required && <span className="text-red-500">\*<\/span>\}<\/label>/g,
    `<div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>`
  );

  // Replace boolean label
  code = code.replace(
    /<span className="text-sm font-medium text-gray-700">\{label\}<\/span>/g,
    `<div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {tag.description && <span className="text-xs text-gray-500 font-normal mt-0.5">{tag.description}</span>}
                </div>`
  );

  fs.writeFileSync(path, code);
  console.log('Modified', path);
}

modFile('src/app/projects/new/page.tsx');
modFile('src/app/projects/[id]/summary/page.tsx');
