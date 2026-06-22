import os
import sys

def should_ignore(path, ignored_dirs, ignored_files):
    parts = path.split(os.sep)
    for part in parts:
        if part in ignored_dirs:
            return True
    
    basename = os.path.basename(path)
    if basename in ignored_files:
        return True
    
    _, ext = os.path.splitext(basename)
    if ext.lower() in [
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.gz', '.tar', 
        '.mp4', '.mp3', '.wav', '.webp', '.woff', '.woff2', '.ttf', '.eot',
        '.svg', '.map', '.lock'
    ]:
        return True
        
    return False

def count_tokens():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    ignored_dirs = {
        "node_modules", ".git", ".next", "dist", "build", "out", ".expo", 
        "ios", "android", ".idea", ".vscode", "tmp", ".gemini", "brain"
    }
    ignored_files = {
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store"
    }
    
    total_chars = 0
    total_lines = 0
    total_files = 0
    
    extension_stats = {}
    folder_stats = {}
    
    print(f"Scanning codebase under: {root_dir}")
    print(f"{'File Path':<60} | {'Lines':>8} | {'Characters':>10} | {'Est. Tokens':>11}")
    print("-" * 99)
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in ignored_dirs]
        
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            
            if should_ignore(full_path, ignored_dirs, ignored_files):
                continue
                
            rel_path = os.path.relpath(full_path, root_dir)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                num_chars = len(content)
                num_lines = content.count('\n') + 1 if content else 0
                
                # Heuristic for token estimation in source code: ~3.5 characters per token
                # This aligns closely with Llama/GPT tokenizers on JS/HTML/CSS code.
                num_tokens_est = int(num_chars / 3.5)
                
                total_chars += num_chars
                total_lines += num_lines
                total_files += 1
                
                # Track stats by extension
                _, ext = os.path.splitext(filename)
                ext = ext.lower() or 'no_ext'
                if ext not in extension_stats:
                    extension_stats[ext] = {'chars': 0, 'lines': 0, 'tokens': 0}
                extension_stats[ext]['chars'] += num_chars
                extension_stats[ext]['lines'] += num_lines
                extension_stats[ext]['tokens'] += num_tokens_est
                
                # Track stats by top folder
                parts = rel_path.split(os.sep)
                top_folder = parts[0] if len(parts) > 1 else 'root'
                if top_folder not in folder_stats:
                    folder_stats[top_folder] = {'chars': 0, 'lines': 0, 'tokens': 0}
                folder_stats[top_folder]['chars'] += num_chars
                folder_stats[top_folder]['lines'] += num_lines
                folder_stats[top_folder]['tokens'] += num_tokens_est
                
                print(f"{rel_path:<60} | {num_lines:>8,} | {num_chars:>10,} | {num_tokens_est:>11,}")
                
            except Exception as e:
                print(f"Error reading {rel_path}: {e}")
                
    print("-" * 99)
    total_tokens_est = int(total_chars / 3.5)
    print(f"TOTALS:")
    print(f"  Files Scanned:       {total_files:,}")
    print(f"  Lines of Code:       {total_lines:,}")
    print(f"  Total Characters:    {total_chars:,}")
    print(f"  Est. Total Tokens:   {total_tokens_est:,}  (using 3.5 chars/token heuristic)")
    print("-" * 99)
    
    print("\nStats by Folder:")
    print(f"  {'Folder':<20} | {'Lines':>10} | {'Characters':>12} | {'Est. Tokens':>12} | {'Percentage':>10}")
    print("  " + "-" * 73)
    for folder, stats in sorted(folder_stats.items(), key=lambda x: x[1]['tokens'], reverse=True):
        pct = (stats['tokens'] / total_tokens_est * 100) if total_tokens_est > 0 else 0
        print(f"  {folder:<20} | {stats['lines']:>10,} | {stats['chars']:>12,} | {stats['tokens']:>12,} | {pct:>9.1f}%")
        
    print("\nStats by File Extension:")
    print(f"  {'Extension':<20} | {'Lines':>10} | {'Characters':>12} | {'Est. Tokens':>12} | {'Percentage':>10}")
    print("  " + "-" * 73)
    for ext, stats in sorted(extension_stats.items(), key=lambda x: x[1]['tokens'], reverse=True):
        pct = (stats['tokens'] / total_tokens_est * 100) if total_tokens_est > 0 else 0
        print(f"  {ext:<20} | {stats['lines']:>10,} | {stats['chars']:>12,} | {stats['tokens']:>12,} | {pct:>9.1f}%")

if __name__ == "__main__":
    count_tokens()
