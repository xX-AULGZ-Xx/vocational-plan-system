const fs = require('fs');
const files = [
  'apps/web/src/app/projects/new/page.tsx',
  'apps/web/src/app/projects/[id]/summary/page.tsx'
];

files.forEach(path => {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    
    // Patch the initialization array to include _check and _bullet
    const oldInit = 'const timelineData = Array.isArray(value) && value.length > 0 ? value : defaultSteps.map(s => ({ step_name: s, m1: "", m2: "", m3: "", m4: "", m5: "", m6: "", m7: "", m8: "", m9: "", m10: "", m11: "", m12: "" }));';
    const newInit = 'const timelineData = Array.isArray(value) && value.length > 0 ? value : defaultSteps.map(s => ({ step_name: s, m1: "", m1_check: "", m1_bullet: "", m2: "", m2_check: "", m2_bullet: "", m3: "", m3_check: "", m3_bullet: "", m4: "", m4_check: "", m4_bullet: "", m5: "", m5_check: "", m5_bullet: "", m6: "", m6_check: "", m6_bullet: "", m7: "", m7_check: "", m7_bullet: "", m8: "", m8_check: "", m8_bullet: "", m9: "", m9_check: "", m9_bullet: "", m10: "", m10_check: "", m10_bullet: "", m11: "", m11_check: "", m11_bullet: "", m12: "", m12_check: "", m12_bullet: "" }));';
    code = code.replace(oldInit, newInit);

    // Patch the onChange handler
    const oldOnChange = 'newData[rIndex] = { ...newData[rIndex], [mKey]: e.target.checked ? "/" : "" };';
    const newOnChange = 'newData[rIndex] = { ...newData[rIndex], [mKey]: e.target.checked ? "/" : "", [mKey+"_check"]: e.target.checked ? "\\u2713" : "", [mKey+"_bullet"]: e.target.checked ? "\\u25CF" : "" };';
    code = code.replace(oldOnChange, newOnChange);

    fs.writeFileSync(path, code);
    console.log('Patched ' + path);
  }
});
