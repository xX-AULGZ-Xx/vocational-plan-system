const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add formatThaiDate helper
if (!code.includes('const formatThaiDate')) {
  const helper = \
const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
\;
  code = code.replace("export default function ProjectDetailPage() {", helper + "export default function ProjectDetailPage() {");
}

const oldDateRange = \              if (tag.tag_type === 'DATERANGE') {
                 const dVal = typeof value === 'object' && value !== null ? value : {};
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {dVal.start || '-'} <span className="text-slate-400 mx-2">???</span> {dVal.end || '-'}
                     </div>
                   </div>
                 );
              }\;

const newDateRange = \              if (tag.tag_type === 'DATE') {
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {formatThaiDate(value)}
                     </div>
                   </div>
                 );
              }

              if (tag.tag_type === 'DATERANGE') {
                 const dVal = typeof value === 'object' && value !== null ? value : {};
                 return (
                   <div key={tag.tag_name} className="mt-3">
                     <p className="text-slate-500 mb-1 text-xs font-semibold">{label}</p>
                     <div className="text-slate-800 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                       {formatThaiDate(dVal.start)} <span className="text-slate-400 mx-2">???</span> {formatThaiDate(dVal.end)}
                     </div>
                   </div>
                 );
              }\;

code = code.replace(oldDateRange, newDateRange);
fs.writeFileSync(file, code);
console.log('Fixed dates');
