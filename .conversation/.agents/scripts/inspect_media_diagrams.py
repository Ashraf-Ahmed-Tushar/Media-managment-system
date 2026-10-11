import fitz
from pathlib import Path
files = [
    'attached_assets/Smart_Media_Management_System_(1)_1791688609985.pdf',
    'attached_assets/Smart_Media_Management_System_1791688611418.pdf',
    'attached_assets/dbms_project_draft_1791688612541.pdf',
]
for source in files:
    doc = fitz.open(source)
    print(f'\n{source}: {len(doc)} pages')
    for i, page in enumerate(doc):
        text = ' '.join(page.get_text().split())
        print(f'page {i+1}: {text[:180]}')
        if i >= 1 or '1791688611418' in source:
            out = Path('.agents/outputs') / f'{Path(source).stem}_page_{i+1}.png'
            page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False).save(out)
