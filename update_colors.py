import re

files = [
    '/Users/sakethreddypingili/Desktop/Projects/Bonthus/Aster/src/components/layout/InvoiceLayout.jsx',
    '/Users/sakethreddypingili/Desktop/Projects/Bonthus/Aster/src/components/layout/PdfInvoiceLayout.jsx'
]

replacements = {
    r'\btext-blue-600\b': 'text-black',
    r'\btext-blue-500\b': 'text-black',
    r'\bbg-blue-50/30\b': 'bg-gray-50',
    r'\bborder-blue-100/50\b': 'border-gray-200',
    r'\bbg-blue-100\b': 'bg-gray-200',
    r'\btext-red-600\b': 'text-black',
    r'\btext-red-500\b': 'text-black',
    r'\btext-amber-600\b': 'text-gray-500',
    r'\bbg-amber-50/20\b': 'bg-gray-50',
    r'\btext-green-600\b': 'text-black',
    r'\btext-emerald-500\b': 'text-black',
    r'\bbg-\[\#fbbf24\]/5\b': 'bg-gray-50',
    r'\bbg-\[\#1e293b\]\b': 'bg-black'
}

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    with open(file_path, 'w') as f:
        f.write(content)
