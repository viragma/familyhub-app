#!/usr/bin/env python3

import re

def remove_time_css(css_content):
    """Eltávolítja az összes time- kezdetű CSS szabályt"""
    # Time- kezdetű CSS szabályok eltávolítása
    pattern = r'\.time-[^{]*\{[^}]*\}'
    css_content = re.sub(pattern, '', css_content, flags=re.MULTILINE | re.DOTALL)
    
    # @media blokkokban is eltávolítjuk a time- szabályokat
    def clean_media_block(match):
        media_content = match.group(1)
        # Time- szabályok eltávolítása a media blokkon belül
        cleaned_content = re.sub(r'\.time-[^{]*\{[^}]*\}', '', media_content, flags=re.MULTILINE | re.DOTALL)
        return f'@media {match.group(0).split("{")[0].split("@media ")[1]} {{{cleaned_content}}}'
    
    # @media blokkok tisztítása
    css_content = re.sub(r'@media ([^{]*)\{(.*?)\}(?=\s*(?:\.|@|$))', clean_media_block, css_content, flags=re.MULTILINE | re.DOTALL)
    
    # Dupla sortörések eltávolítása
    css_content = re.sub(r'\n\n+', '\n\n', css_content)
    
    return css_content

if __name__ == "__main__":
    with open('index.css', 'r', encoding='utf-8') as f:
        css_content = f.read()
    
    # A /* Time Management Styles */ komment és az account-card között minden törlése
    parts = css_content.split('/* Time Management Styles */')
    if len(parts) > 1:
        before = parts[0]
        after_parts = parts[1].split('.account-card {')
        if len(after_parts) > 1:
            # Az account-card definíció visszarakása
            account_card_definition = '''
.account-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}
'''
            after = account_card_definition + after_parts[1]
            css_content = before + after
    
    cleaned_css = remove_time_css(css_content)
    
    with open('index.css', 'w', encoding='utf-8') as f:
        f.write(cleaned_css)
    
    print("Time Management CSS eltávolítva az index.css-ből!")
