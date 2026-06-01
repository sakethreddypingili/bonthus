const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.jsx');

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /\.eq\(['"]([^'"]*)['"]\s*,\s*([^)]*)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const column = match[1];
        const value = match[2].trim();
        
        // Potential UUID columns
        if (column.includes('id') || column.includes('store')) {
            // Check if value is a variable that could be undefined
            if (!value.startsWith("'") && !value.startsWith('"') && !value.startsWith('`')) {
                console.log(`${file}: column=${column}, value=${value}`);
            }
        }
    }
});
