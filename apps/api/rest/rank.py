from collections import defaultdict
from apps.core.flags import flag

def score_and_diversify(cands, agg_feats):
    # 打分：召回分 + CTR_1h + 质量分
    for c in cands:
        ctr = agg_feats.get(c["id"], {}).get("ctr_1h", c.get("ctr_1h", 0.0))
        c["final_score"] = 0.6*c.get("score",0) + 0.3*ctr + 0.1*c.get("quality_score",1.0)
    cands.sort(key=lambda x: x["final_score"], reverse=True)

    # 多样性
    limit_author = flag("feed.diversity.limit_author", 3)
    limit_topic = flag("feed.diversity.limit_topic", 3)
    seen_author = defaultdict(int); seen_topic = defaultdict(int)
    out = []
    for c in cands:
        a = c.get("author") or "na"; t = c.get("topic") or "na"
        if seen_author[a] >= limit_author or seen_topic[t] >= limit_topic: continue
        out.append(c); seen_author[a]+=1; seen_topic[t]+=1
        if len(out) >= 200: break
    return out
