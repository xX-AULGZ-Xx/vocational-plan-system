const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldFallback = \              if (tag.tag_type === 'ALIGNMENT_CHECKLIST') {\;

const newFallback = \              if (tag.tag_type === 'DATERANGE') {
                 const dVal = typeof value === 'object' && value !== null ? value : {};
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {dVal.start || '-'} <span className="text-slate-400 mx-2">???</span> {dVal.end || '-'}
                     </div>
                   </div>
                 );
              }

              if (tag.tag_type === 'TIMELINE') {
                 const months = ["?.?.", "?.?.", "?.?.", "?.?.", "?.?.", "??.?.", "??.?.", "?.?.", "??.?.", "?.?.", "?.?.", "?.?."];
                 return (
                   <div key={tag.tag_name} className="mt-4">
                     <p className="text-slate-500 mb-2 text-xs font-semibold">{label}</p>
                     {Array.isArray(value) && value.length > 0 ? (
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-slate-600 border border-slate-200">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                               <tr>
                                  <th className="px-3 py-2 border-r border-slate-200 w-1/3">???????????????????</th>
                                  {months.map(m => (
                                    <th key={m} className="px-2 py-2 border-r border-slate-200 text-center font-normal">{m}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               {value.map((row: any, i: number) => {
                                 // Determine the step name from the 'step_name' field, or fallback to finding the key that isn't a month
                                 let stepName = row.step_name;
                                 if (!stepName) {
                                    const otherKeys = Object.keys(row).filter(k => !/^m\d+(?:_check|_bullet)?$/.test(k) && k !== 'id');
                                    stepName = otherKeys.length > 0 ? otherKeys[0] : \?????????? \\;
                                 }
                                 
                                 return (
                                 <tr key={i} className="border-b border-slate-100 bg-white">
                                    <td className="px-3 py-2 border-r border-slate-100">{stepName}</td>
                                    {Array.from({ length: 12 }).map((_, cIndex) => {
                                      const mKey = 'm' + (cIndex + 1);
                                      return (
                                        <td key={cIndex} className="px-2 py-2 border-r border-slate-100 text-center text-slate-800 font-bold">
                                          {row[mKey] === '/' ? '?' : ''}
                                        </td>
                                      );
                                    })}
                                 </tr>
                                 );
                               })}
                            </tbody>
                         </table>
                       </div>
                     ) : (
                       <p className="text-slate-800 text-sm bg-slate-50 p-3 rounded border border-slate-100">- ??????????? -</p>
                     )}
                   </div>
                 );
              }

              if (tag.tag_type === 'ALIGNMENT_CHECKLIST') {\;

code = code.replace(oldFallback, newFallback);
fs.writeFileSync(file, code);
console.log('Fixed timeline and daterange');
