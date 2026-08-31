const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert useMemo if not exists
if (!code.includes('import React, { useState, useEffect, useMemo }')) {
  code = code.replace('import React, { useState, useEffect }', 'import React, { useState, useEffect, useMemo }');
  if (!code.includes('useMemo')) {
     code = code.replace('import { useState, useEffect }', 'import { useState, useEffect, useMemo }');
  }
}

const memoBlock = \  const parsedDynamicData = useMemo(() => {
    if (!project?.dynamic_data) return {};
    let temp = project.dynamic_data;
    while (typeof temp === 'string') {
      try { temp = JSON.parse(temp); } catch { break; }
    }
    return temp || {};
  }, [project?.dynamic_data]);\;

// insert memoBlock inside the component, e.g. after const [loading, setLoading]
if (!code.includes('const parsedDynamicData = useMemo')) {
  code = code.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + memoBlock);
}

const oldTab = \ctiveTab === 'details' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">?????????????????</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1 text-xs">???????????</p>
              <p className="font-semibold text-slate-800">{project.project_code || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">??????????</p>
              <p className="font-semibold text-slate-800">{project.fiscal_year || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-500 mb-1 text-xs">????????????????</p>
            <p className="text-slate-800 text-xs whitespace-pre-wrap">{project.background || '-'}</p>
          </div>
        </div>
      )\;

const newTab = \ctiveTab === 'details' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">?????????????????</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1 text-xs">???????????</p>
              <p className="font-semibold text-slate-800">{project.project_code || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">??????????</p>
              <p className="font-semibold text-slate-800">{project.fiscal_year || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">???? / ????????</p>
              <p className="font-semibold text-slate-800">{project.department?.division?.name || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 text-xs">???????? / ???</p>
              <p className="font-semibold text-slate-800">{project.department?.name || '-'}</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">?????????????????</h3>
            
            {project.template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => {
              const value = parsedDynamicData[tag.tag_name];
              const label = tag.label || tag.tag_name;
              
              if (tag.tag_type === 'TABLE_LOOP') {
                 // Table representation
                 return (
                   <div key={tag.tag_name} className="mt-4">
                     <p className="text-slate-500 mb-2 text-xs font-semibold">{label}</p>
                     {Array.isArray(value) && value.length > 0 ? (
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-slate-600 border border-slate-200">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                               <tr>
                                  {Object.keys(value[0]).filter(k => !k.endsWith('_check') && !k.endsWith('_bullet')).map(k => (
                                    <th key={k} className="px-3 py-2 border-r border-slate-200">{k}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {value.map((row: any, i: number) => (
                                 <tr key={i} className="border-b border-slate-100 bg-white">
                                    {Object.keys(row).filter(k => !k.endsWith('_check') && !k.endsWith('_bullet')).map(k => (
                                      <td key={k} className="px-3 py-2 border-r border-slate-100 text-center">{row[k] === '/' ? '?' : row[k]}</td>
                                    ))}
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                     ) : (
                       <p className="text-slate-800 text-xs bg-slate-50 p-3 rounded border border-slate-100">- ??????????? -</p>
                     )}
                   </div>
                 );
              }

              return (
                <div key={tag.tag_name} className="mt-3">
                  <p className="text-slate-500 mb-1 text-xs">{label}</p>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {tag.tag_type === 'BOOLEAN' ? (value ? '??? / ??' : '?????? / ?????') : (value || '-')}
                  </div>
                </div>
              );
            })}
            
            {(!project.template?.tags || project.template.tags.length === 0) && (
               <div className="text-center py-4 text-slate-500 text-sm">
                 ??????????????????? (??????????????????????)
               </div>
            )}
          </div>
        </div>
      )\;

code = code.replace(oldTab, newTab);
fs.writeFileSync(file, code);
console.log('Fixed read-only page');
