const fs = require('fs');

let content = fs.readFileSync('src/pages/Power.jsx', 'utf8');

// 1. Remove boolean states from defaultValues
content = content.replace(/hasCyl: false,\s*hasNear: false,\s*isProgressive: false,\s*hasPrism: false,/g, '');

// 2. Remove watch assignments
content = content.replace(/const hasCyl = watch\("hasCyl"\);\s*const hasNear = watch\("hasNear"\);\s*const isProgressive = watch\("isProgressive"\);\s*const hasPrism = watch\("hasPrism"\);/g, '');

// 3. Update payload
content = content.replace(/formData\.hasCyl \? normalizeOptical\(reCyl\) : null/g, 'normalizeOptical(reCyl)');
content = content.replace(/formData\.hasCyl \? normalizeAxis\(reAxis\) : null/g, 'normalizeAxis(reAxis)');
content = content.replace(/formData\.hasCyl \? normalizeOptical\(leCyl\) : null/g, 'normalizeOptical(leCyl)');
content = content.replace(/formData\.hasCyl \? normalizeAxis\(leAxis\) : null/g, 'normalizeAxis(leAxis)');

content = content.replace(/formData\.hasNear \? normalizeOptical\(nvReSph\) : null/g, 'normalizeOptical(nvReSph)');
content = content.replace(/\(formData\.hasNear && formData\.hasCyl\) \? normalizeOptical\(nvReCyl\) : null/g, 'normalizeOptical(nvReCyl)');
content = content.replace(/\(formData\.hasNear && formData\.hasCyl\) \? normalizeAxis\(nvReAxis\) : null/g, 'normalizeAxis(nvReAxis)');
content = content.replace(/formData\.hasNear \? normalizeOptical\(nvReAdd\) : null/g, 'normalizeOptical(nvReAdd)');

content = content.replace(/formData\.hasNear \? normalizeOptical\(nvLeSph\) : null/g, 'normalizeOptical(nvLeSph)');
content = content.replace(/\(formData\.hasNear && formData\.hasCyl\) \? normalizeOptical\(nvLeCyl\) : null/g, 'normalizeOptical(nvLeCyl)');
content = content.replace(/\(formData\.hasNear && formData\.hasCyl\) \? normalizeAxis\(nvLeAxis\) : null/g, 'normalizeAxis(nvLeAxis)');
content = content.replace(/formData\.hasNear \? normalizeOptical\(nvLeAdd\) : null/g, 'normalizeOptical(nvLeAdd)');

content = content.replace(/formData\.isProgressive \? \(formData\.fh\?\.re \|\| null\) : null/g, '(formData.fh?.re || null)');
content = content.replace(/formData\.isProgressive \? \(formData\.fh\?\.le \|\| null\) : null/g, '(formData.fh?.le || null)');

content = content.replace(/formData\.hasPrism && isNonEmpty\(formData\.prism\?\.re\?\.power\)/g, 'isNonEmpty(formData.prism?.re?.power)');
content = content.replace(/formData\.hasPrism && isNonEmpty\(formData\.prism\?\.le\?\.power\)/g, 'isNonEmpty(formData.prism?.le?.power)');

content = content.replace(/is_bifocal_progressive: !!formData\.isProgressive,/g, 'is_bifocal_progressive: false,');

// 4. Update Steps Array
content = content.replace(/const steps = \[\s*"Setup",\s*"Refraction",\s*"Acuity",\s*"Dispensing"\s*\];/g, 'const steps = [\n    "Refraction",\n    "Acuity",\n    "Dispensing"\n  ];');

// 5. Update onSubmit activeStep condition
content = content.replace(/if \(activeStep < 4\) {/g, 'if (activeStep < 3) {');
content = content.replace(/\{activeStep < 4 \? \(/g, '{activeStep < 3 ? (');

// 6. Fix {hasCyl && ...} logic in JSX
content = content.replace(/\{hasCyl && \(\s*<>\s*([\s\S]*?)\s*<\/>\s*\)\}/g, '$1');
content = content.replace(/\{hasCyl && \(\s*(<button[\s\S]*?<\/button>)\s*\)\}/g, '$1');

// 7. Fix {hasNear && ...} logic
content = content.replace(/\{hasNear && \(\s*(<div[\s\S]*?<\/div>\s*)\)\}/g, '$1');

// Wait, doing JSX with regex is dangerous. Let's just write a script that replaces specific strings since we know the structure.

fs.writeFileSync('src/pages/Power.jsx', content);
console.log('Done');
