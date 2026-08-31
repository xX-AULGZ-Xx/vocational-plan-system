const fs = require('fs');
const path = 'apps/api/src/lib/docx-generator.ts';
let code = fs.readFileSync(path, 'utf8');

const searchCode = "formData[key] = formData[key].map((item, idx) => ({\n            ...item,\n            _index: idx + 1,\n            _indexThai: toThaiNumerals((idx + 1).toString())\n          }));";

const replaceCode = "formData[key] = formData[key].map((item, idx) => {\n            const enriched = {\n              ...item,\n              _index: idx + 1,\n              _indexThai: toThaiNumerals((idx + 1).toString())\n            };\n            if (key === 'timelines') {\n              const fy = parseInt(formData.fiscal_year) || (new Date().getFullYear() + 543);\n              const gregYear = fy - 543;\n              const months = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];\n              const startDate = item.start_date ? new Date(item.start_date) : null;\n              const endDate = item.end_date ? new Date(item.end_date) : null;\n              const startAbs = startDate && !isNaN(startDate.getTime()) ? startDate.getFullYear() * 12 + startDate.getMonth() : null;\n              const endAbs = endDate && !isNaN(endDate.getTime()) ? endDate.getFullYear() * 12 + endDate.getMonth() : null;\n              for (let i = 0; i < 12; i++) {\n                const colY = (i < 3) ? gregYear - 1 : gregYear;\n                const colAbs = colY * 12 + months[i];\n                let hit = false;\n                if (startAbs !== null && endAbs !== null) {\n                  hit = (colAbs >= startAbs && colAbs <= endAbs);\n                } else if (startAbs !== null) {\n                  hit = (colAbs === startAbs);\n                }\n                enriched['m' + (i + 1)] = hit ? '/' : '';\n                enriched['m' + (i + 1) + '_check'] = hit ? '\\u2713' : '';\n                enriched['m' + (i + 1) + '_bullet'] = hit ? '\\u25CF' : '';\n              }\n            }\n            return enriched;\n          });";

code = code.replace(searchCode, replaceCode);
fs.writeFileSync(path, code);
console.log('docx-generator patched');
