import re

css_file = 'assets/css/style.css'
with open(css_file, 'r') as f:
    content = f.read()

# Find the start of the dark theme block
start_marker = "/* DARK THEME SUPPORT                      */\n/* ========================================= */\n\n@media (prefers-color-scheme: dark) {"
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find dark theme block")
    exit(1)

# The content before the dark mode block
prefix_content = content[:start_idx + len("/* DARK THEME SUPPORT                      */\n/* ========================================= */\n\n")]

# The dark mode block content
block_start = start_idx + len(start_marker)
# Find the matching closing brace for the media query
brace_count = 1
end_idx = block_start

while brace_count > 0 and end_idx < len(content):
    if content[end_idx] == '{':
        brace_count += 1
    elif content[end_idx] == '}':
        brace_count -= 1
    end_idx += 1

block_content = content[block_start:end_idx-1] # Exclude the final closing brace

# We need to prepend [data-theme="dark"] to every selector in block_content
# A simple regex for top-level CSS rules in this block
import textwrap

new_block = []
for rule in re.split(r'}\s*', block_content.strip()):
    if not rule:
        continue
    
    parts = rule.split('{')
    if len(parts) != 2:
        new_block.append(rule + '}')
        continue
        
    selectors = parts[0].strip()
    rules = parts[1]
    
    # Process selectors
    new_selectors = []
    for sel in selectors.split(','):
        sel = sel.strip()
        if sel.startswith('/*') and '*/' in sel:
            # Handle comment before selector
            comment_end = sel.find('*/') + 2
            comment = sel[:comment_end]
            actual_sel = sel[comment_end:].strip()
            if actual_sel == ':root':
                new_selectors.append(f"{comment} [data-theme=\"dark\"]")
            else:
                new_selectors.append(f"{comment} [data-theme=\"dark\"] {actual_sel}")
        else:
            if sel == ':root':
                new_selectors.append('[data-theme="dark"]')
            elif sel.startswith(':root'):
                new_selectors.append(sel.replace(':root', '[data-theme="dark"]'))
            else:
                new_selectors.append(f'[data-theme="dark"] {sel}')
                
    new_rule = ',\n'.join(new_selectors) + ' {' + rules + '}'
    new_block.append(new_rule)

final_content = prefix_content + '\n\n'.join(new_block) + '\n' + content[end_idx:]

with open(css_file, 'w') as f:
    f.write(final_content)

print("Dark mode CSS successfully converted to data-theme format")
