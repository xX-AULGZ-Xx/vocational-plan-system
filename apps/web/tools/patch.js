const fs = require('fs');
let code = fs.readFileSync('src/app/my-projects/page.tsx', 'utf8');

const newBtn = `                  {/* Project Summary Button (Appears when Approved) */}
                  {isApproved && summaryTemplates.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpenId(dropdownOpenId === p.id ? null : p.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>สรุปโครงการ</span>
                        <ChevronRight className={\`w-3 h-3 transition-transform \${dropdownOpenId === p.id ? 'rotate-90' : ''}\`} />
                      </button>
                      
                      {dropdownOpenId === p.id && (
                        <div className="absolute right-0 bottom-full mb-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            เลือกแบบฟอร์มสรุป
                          </div>
                          {summaryTemplates.map(tpl => (
                            <Link
                              key={tpl.id}
                              href={\`/projects/\${p.id}/summary?templateId=\${tpl.id}\`}
                              className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              {tpl.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}`;

code = code.replace(/\{\/\* Project Summary Button[\s\S]*?<\/button>\s*\)\}/, newBtn);
fs.writeFileSync('src/app/my-projects/page.tsx', code);
