const fs = require('fs');
const path = 'apps/web/src/app/my-projects/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldBadge = \{isApproved ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ???????????
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                        <Clock className="w-3.5 h-3.5" /> ?????????
                      </span>
                    )}\;

const newBadge = \{p.status === 'draft' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <FileText className="w-3.5 h-3.5" /> ???????
                      </span>
                    ) : p.status === 'approved' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ???????????
                      </span>
                    ) : p.status === 'rejected' ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5" /> ??????????
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> ?????????
                      </span>
                    )}\;

code = code.replace(oldBadge, newBadge);
code = code.replace("p.status === 'DRAFT' && (", "p.status === 'draft' && (");

fs.writeFileSync(path, code);
console.log('Patched badges and edit button');
