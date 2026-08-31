const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldFallback = \              return (
                <div key={tag.tag_name} className="mt-3">
                  <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {tag.tag_type === 'BOOLEAN' ? (value ? '??? / ??' : '?????? / ?????') : (value || '-')}
                  </div>
                </div>
              );\;

const newFallback = \              if (tag.tag_type === 'ALIGNMENT_CHECKLIST') {
                 const optionsList = Array.isArray(tag.options) ? tag.options : [];
                 const valObj = typeof value === 'object' && value !== null ? value : {};
                 const selectedLabels = optionsList.map((opt: any, idx: number) => {
                   const item = typeof opt === 'string' ? { key: \chk_\\, label: opt } : opt;
                   return valObj[item.key] ? item.label : null;
                 }).filter(Boolean);

                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {selectedLabels.length > 0 ? (
                         <ul className="list-disc pl-4 space-y-1">
                           {selectedLabels.map((lbl: string, i: number) => <li key={i}>{lbl}</li>)}
                         </ul>
                       ) : (
                         <span className="text-slate-400">- ??????????????????? -</span>
                       )}
                     </div>
                   </div>
                 );
              }

              // Fallback safe rendering for any other unknown object
              let displayValue = value;
              if (tag.tag_type === 'BOOLEAN') {
                displayValue = value ? '??? / ??' : '?????? / ?????';
              } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value);
              }

              return (
                <div key={tag.tag_name} className="mt-3">
                  <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {displayValue || '-'}
                  </div>
                </div>
              );\;

code = code.replace(oldFallback, newFallback);
fs.writeFileSync(file, code);
console.log('Fixed object child error');
