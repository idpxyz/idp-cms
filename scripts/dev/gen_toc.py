
#!/usr/bin/env python3
import sys, re, pathlib

def slugify(h):
    s = h.strip().lower()
    s = re.sub(r"[^\w\s\-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s

def gen_toc(md:str)->str:
    lines = md.splitlines()
    headings = []
    for ln in lines:
        m = re.match(r"^(#{2,6})\s+(.+?)\s*$", ln)
        if m:
            level = len(m.group(1)) - 1  # H2=>1, H3=>2
            text = m.group(2).strip()
            anchor = "#" + slugify(text)
            headings.append((level, text, anchor))
    out = []
    for level, text, anchor in headings:
        indent = "  " * (level-1)
        out.append(f"{indent}- [{text}]({anchor})")
    return "\n".join(out) + "\n"

def replace_toc(md:str, toc:str)->str:
    start = "<!-- toc:start -->"
    end = "<!-- toc:end -->"
    if start not in md or end not in md or md.index(start) > md.index(end):
        return md
    return md[:md.index(start)+len(start)] + "\n" + toc + md[md.index(end):]

def main():
    p = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("docs/architecture.md")
    md = p.read_text(encoding="utf-8")
    toc = gen_toc(md)
    p.write_text(replace_toc(md, toc), encoding="utf-8")
    print(f"TOC updated for {p}")

if __name__ == "__main__":
    main()
