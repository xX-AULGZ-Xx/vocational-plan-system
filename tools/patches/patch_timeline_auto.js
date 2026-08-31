const fs = require('fs');

const files = [
  'apps/web/src/app/projects/new/page.tsx',
  'apps/web/src/app/projects/[id]/summary/page.tsx'
];

const oldOnChange =                               onChange={(e) => {
                                const newData = [...timelineData];
                                newData[rIndex] = { ...newData[rIndex], [mKey]: e.target.checked ? "/" : "", [mKey+"_check"]: e.target.checked ? "\\u2713" : "", [mKey+"_bullet"]: e.target.checked ? "\\u25CF" : "" };
                                handleDynamicChange(key, newData);
                              }};

const newOnChange =                               onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newData = [...timelineData];
                                const row = { ...newData[rIndex] };
                                
                                if (isChecked) {
                                  let minIdx = cIndex;
                                  let maxIdx = cIndex;
                                  for (let i = 0; i < 12; i++) {
                                    if (row['m' + (i + 1)] === '/') {
                                      if (i < minIdx) minIdx = i;
                                      if (i > maxIdx) maxIdx = i;
                                    }
                                  }
                                  for (let i = minIdx; i <= maxIdx; i++) {
                                    const k = 'm' + (i + 1);
                                    row[k] = "/";
                                    row[k+"_check"] = "\u2713";
                                    row[k+"_bullet"] = "\u25CF";
                                  }
                                } else {
                                  row[mKey] = "";
                                  row[mKey+"_check"] = "";
                                  row[mKey+"_bullet"] = "";
                                }
                                
                                newData[rIndex] = row;
                                handleDynamicChange(key, newData);
                              }};

files.forEach(path => {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    if (code.includes(oldOnChange)) {
      code = code.replace(oldOnChange, newOnChange);
      fs.writeFileSync(path, code);
      console.log('Patched ' + path);
    } else {
      console.log('Could not find exact block in ' + path);
    }
  }
});
