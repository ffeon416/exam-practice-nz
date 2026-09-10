import re,glob,os,sys
CATS={"Exam Strategy","Study Methods","Subject Guides","Mock Exam Practice","Mindset & Test Anxiety","AI in Education","Parents & Teachers"}
ALLOWED_EXT=("https://www2.nzqa.govt.nz/ncea/","https://www.nzqa.govt.nz/","https://en.wikipedia.org/wiki/","https://www.qcaa.qld.edu.au/","https://www.qtac.edu.au/",
  "https://www.educationstandards.nsw.edu.au/","https://www.vcaa.vic.edu.au/","https://www.aqa.org.uk/","https://qualifications.pearson.com/","https://www.ocr.org.uk/","https://www.gov.uk/")
import datetime
CADENCE={0,2,4} # Mon/Wed/Fri (python weekday)
files=sorted(glob.glob("content/blog/*.mdx"))
meta={}
for f in files:
    s=open(f).read()
    fm=re.search(r'^---\n(.*?)\n---\n',s,re.S).group(1)
    g=lambda k: re.search(r'^%s:\s*"?(.*?)"?\s*$'%k,fm,re.M)
    slug=re.sub(r'^\d{4}-\d{2}-\d{2}-','',os.path.basename(f)[:-4])
    meta[slug]=dict(date=g('date').group(1),cat=g('category').group(1),file=f,body=s.split('\n---\n',1)[1],title=g('title').group(1),desc=g('description').group(1))
problems=[]
for slug,m in meta.items():
    b=m['body']; f=os.path.basename(m['file'])
    if m['cat'] not in CATS: problems.append(f"{f}: bad category {m['cat']!r}")
    pre=re.match(r'^(\d{4}-\d{2}-\d{2})-',f)
    if pre and pre.group(1)!=m['date']: problems.append(f"{f}: filename date {pre.group(1)} != date: {m['date']}")
    try:
        if datetime.date.fromisoformat(m['date']).weekday() not in CADENCE and m['date']>"2026-09-11": problems.append(f"{f}: dated {datetime.date.fromisoformat(m['date']).strftime('%a')}, cadence is Mon/Wed/Fri")
    except ValueError: problems.append(f"{f}: bad date {m['date']!r}")
    if not (120<=len(m['desc'])<=170): problems.append(f"{f}: description {len(m['desc'])} chars")
    if '/sign-up' in b: problems.append(f"{f}: links to /sign-up")
    if re.search(r'free (trial|plan)',b,re.I): problems.append(f"{f}: mentions free trial/plan")
    if not re.search(r'<Callout type="tip">[^<]*\[[^\]]+\]\(/grade\)',b): problems.append(f"{f}: no tip callout linking /grade")
    if re.search(r'^# ',b,re.M): problems.append(f"{f}: H1 in body")
    for m2 in re.finditer(r'\]\((/blog/([a-z0-9-]+))\)',b):
        t=m2.group(2)
        if t not in meta: problems.append(f"{f}: link to unknown slug {t}")
        elif meta[t]['date']>m['date']: problems.append(f"{f}: links to future post {t} ({meta[t]['date']} > {m['date']})")
    for m2 in re.finditer(r'\]\((https?://[^)]+)\)',b):
        u=m2.group(1)
        if not u.startswith(ALLOWED_EXT): problems.append(f"{f}: external URL not allowed {u}")
    for m2 in re.finditer(r'StudyAce[^.]{0,120}(real|official|NZQA|actual) past papers',b,re.I):
        problems.append(f"{f}: possible past-paper claim: {m2.group(0)[:100]!r}")
    if re.search(r'\d+\s?%',b): 
        for m2 in re.finditer(r'[^.\n]*\d+\s?%[^.\n]*',b): problems.append(f"{f}: PERCENT (check it's not an invented stat): {m2.group(0).strip()[:110]}")
    words=len(re.findall(r"\w+",b)); print(f"{f:70s} {m['cat']:24s} {m['date']} {words:5d}w")
print("\n".join(problems) if problems else "NO PROBLEMS")
