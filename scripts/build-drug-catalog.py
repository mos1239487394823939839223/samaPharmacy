#!/usr/bin/env python3
"""
Build release/egypt-drugs.csv — a clean Egyptian drug catalog, imported by
hand from الأصناف ← استيراد من ملف.

Input: a distributor / EDA export with the columns of the file this catalog
was first built from (commercial_name_en, commercial_name_ar,
scientific_name, price_egp, unit_ar, units_per_box, sellable_by_unit).
Optionally a second, hand-made list (اسم الصنف, الاسم الانجليزي, الاسم
العلمي, الوحدة) whose brands are added when the export lacks them.

What it fixes:
  * The source Arabic name has no strength or pack size, so «أموتينولول»
    50 mg and 100 mg had the same name. The Arabic name is rebuilt as
    name + strength + form + pack, e.g. «أموتينولول 100 مجم 10 أقراص».
  * Products sold by the tablet get two units: the box (علبة, N tablets,
    the public price) and the tablet as the base unit.
  * Items from the small list whose brand is missing from the big one are
    added (without a price).

Usage: python3 scripts/build-drug-catalog.py <export.csv> [hand-made.csv]
"""
import csv, re, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
if len(sys.argv) < 2:
    sys.exit('usage: build-drug-catalog.py <export.csv> [hand-made.csv]')
BIG = sys.argv[1]
SMALL = sys.argv[2] if len(sys.argv) > 2 else None
OUT = os.path.join(ROOT, 'release', 'egypt-drugs.csv')

UNIT_AR = {'MG': 'مجم', 'MCG': 'ميكروجرام', 'GM': 'جم', 'G': 'جم', 'ML': 'مل', 'IU': 'وحدة', '%': '%', 'MIU': 'مليون وحدة'}
STRENGTH = re.compile(r'(\d+(?:\.\d+)?)\s*(MCG|MIU|MG|GM|G|ML|IU|%)(?:\s*/\s*(\d+(?:\.\d+)?)?\s*(ML|GM|G))?(?![A-Z])')
# English form markers → (Arabic form word, single-pack unit name)
FORMS = [
    (r'EYE\s*DROP|EYE/EAR|\bEYE\b', 'قطرة عين', 'زجاجة'),
    (r'EAR\s*DROP', 'قطرة أذن', 'زجاجة'),
    (r'\bNASAL\b', 'بخاخ أنف', 'بخاخ'),
    (r'\bINHAL|\bDISKUS\b|TURBUHALER|EVOHALER|\bPUFFS?\b', 'بخاخ استنشاق', 'بخاخ'),
    (r'\bSPRAY\b', 'بخاخ', 'بخاخ'),
    (r'\bEFF', 'فوار', 'علبة'),
    (r'\bLOZENG', 'أقراص استحلاب', 'علبة'),
    (r'\b(?:F\.?C\.?\s*)?TABS?\b|TABLETS?\b|\bTAB\.', 'أقراص', 'علبة'),
    (r'\bCAPS?\b|CAPSULES?\b|\bCAP\.', 'كبسولات', 'علبة'),
    (r'\bSUPP', 'لبوس', 'علبة'),
    (r'\bOVUL|\bVAGINAL\b', 'لبوس مهبلي', 'علبة'),
    (r'\bSACH|\bGRAN', 'أكياس', 'علبة'),
    (r'\bSUSP', 'معلق', 'زجاجة'),
    (r'\bSYR(?:UP)?\b|\bSYR\.', 'شراب', 'زجاجة'),
    (r'\bDROPS?\b', 'نقط', 'زجاجة'),
    (r'\bAMPS?\b|\bAMP\.|AMPOULES?\b', 'أمبول', 'علبة'),
    (r'\bVIALS?\b|\bI\.M\.?|\bI\.V\.?|\bIM\b|\bIV\b', 'فيال', 'علبة'),
    (r'PREFILLED|\bSYRINGES?\b|\bPENS?\b', 'حقن', 'علبة'),
    (r'\bCREAM\b|\bCRM\b', 'كريم', 'أنبوبة'),
    (r'\bOINT', 'مرهم', 'أنبوبة'),
    (r'\bGEL\b|EMULGEL', 'جل', 'أنبوبة'),
    (r'\bLOTION\b', 'لوشن', 'زجاجة'),
    (r'\bSHAMPOO\b', 'شامبو', 'زجاجة'),
    (r'\bSOL\b|\bSOLUTION\b|MOUTH\s*WASH|\bORAL\s*LIQ', 'محلول', 'زجاجة'),
    (r'\bPOWDER\b|\bPWD\b|\bFORMULA\b|\bMILK\b', 'بودرة', 'علبة'),
]

def fmt(n):
    n = float(n)
    return str(int(n)) if n == int(n) else str(n)

def strength_ar(en):
    m = STRENGTH.search(en)
    if not m:
        return ''
    num, unit, per_num, per_unit = m.groups()
    s = f'{fmt(num)} {UNIT_AR[unit]}'
    if per_unit:
        s += f'/{fmt(per_num) + " " if per_num else ""}{UNIT_AR[per_unit]}'
    return s

def volume_ar(en, strength_span_end):
    # The pack volume (120 ML, 30 GM) — the last ML/GM amount after the strength.
    tail = en[strength_span_end:]
    vols = re.findall(r'(\d+(?:\.\d+)?)\s*(ML|GM|G)(?![A-Z/])', tail)
    if not vols:
        return ''
    num, unit = vols[-1]
    return f'{fmt(num)} {UNIT_AR[unit]}'

def form_of(en):
    for pat, word, single in FORMS:
        if re.search(pat, en):
            return word, single
    return '', 'عبوة'

# Transliterated English form words left in the source Arabic names
# («سوبب» = SUPP.) — the rebuilt name states the form in Arabic instead.
NOISE = {'سوبب', 'كواتيد', 'إنتيريك', 'ساتشيتس', 'بريفيلليد', 'سيرينجي', 'سيرينجيس', 'تشيوابلي',
         'سوفتجيلس', 'كابليتس', 'إفف.', 'إفف', 'بريف.', 'دوسيس', '/', '.', './', '-', '+', '&'}

def clean_ar(s, drop_number=None):
    out = []
    for t in s.split():
        if t in NOISE:
            continue
        if drop_number and t == drop_number:
            drop_number = None  # the pack count is re-added once, at the end
            continue
        out.append(t)
    return ' '.join(out)

def build():
    rows = list(csv.DictReader(open(BIG, encoding='utf-8-sig')))
    out = []
    for r in rows:
        if 'CANCEL' in r['commercial_name_en'].upper():
            continue  # withdrawn from the market
        en = re.sub(r'\s*\(N/A\)\s*', ' ', r['commercial_name_en'].upper()).strip()
        upb_text = str(int(float(r['units_per_box'] or 1)))
        ar = clean_ar(r['commercial_name_ar'], upb_text if upb_text != '1' else None)
        form, single_unit = form_of(en)
        m = STRENGTH.search(en)
        strength = strength_ar(en)
        upb = int(float(r['units_per_box'] or 1))
        sellable = r['sellable_by_unit'] == 'True' and upb > 1
        parts = [ar]
        # Skip a strength already written in the Arabic name.
        if strength and strength.split()[0] not in ar:
            parts.append(strength)
        if upb > 1:
            parts.append(f'{upb} {form or r["unit_ar"]}')
        else:
            if form:
                parts.append(form)
            vol = volume_ar(en, m.end() if m else 0)
            if vol and vol != strength:
                parts.append(vol)
        name = re.sub(r'\s+', ' ', ' '.join(parts)).strip()
        if sellable:
            unit, factor, base = 'علبة', upb, r['unit_ar']
        else:
            unit = r['unit_ar'] if r['unit_ar'] in ('أمبول', 'فيال', 'كيس') and upb == 1 else single_unit
            factor, base = 1, ''
        out.append({
            'name': name, 'en': r['commercial_name_en'].strip(), 'sci': r['scientific_name'].strip().title(),
            'unit': unit, 'factor': factor, 'price': f"{float(r['price_egp']):.2f}", 'base': base,
        })

    # Unique names: collisions get the English product name to tell them apart.
    count = collections.Counter(o['name'] for o in out)
    for o in out:
        if count[o['name']] > 1:
            o['name'] = f"{o['name']} ({o['en']})"
    # Same folding the app's search uses (أ/إ/آ→ا, ة→ه, ى→ي, no diacritics),
    # so two names that only differ by those letters are not both imported.
    def fold(t):
        t = re.sub('[\u064B-\u0652\u0640]', '', t)
        t = re.sub('[أإآ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي')
        return re.sub(r'\s+', ' ', t).strip().lower()
    seen = set()
    final = []
    for o in out:
        key = fold(o['name'])
        if key in seen:
            continue
        seen.add(key)
        final.append(o)

    # Add the hand-made list's brands that the big file does not have.
    brands = {re.split(r'[\s(]', o['en'].upper())[0] for o in final}
    added = 0
    for r in (csv.DictReader(open(SMALL, encoding='utf-8-sig')) if SMALL else []):
        brand = re.split(r'[\s(]', r['الاسم الانجليزي'].upper())[0]
        if brand in brands or fold(r['اسم الصنف']) in seen:
            continue
        seen.add(fold(r['اسم الصنف']))
        final.append({'name': r['اسم الصنف'], 'en': r['الاسم الانجليزي'], 'sci': r['الاسم العلمي'],
                      'unit': r['الوحدة'], 'factor': 1, 'price': '', 'base': ''})
        added += 1

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['اسم الصنف', 'الاسم الانجليزي', 'الاسم العلمي', 'الوحدة', 'المعامل', 'سعر الجمهور', 'الوحدة الصغرى'])
        for o in final:
            w.writerow([o['name'], o['en'], o['sci'], o['unit'], o['factor'], o['price'], o['base']])
    print(f'{len(final)} items ({added} from the hand-made list) → {OUT}')

if __name__ == '__main__':
    build()
