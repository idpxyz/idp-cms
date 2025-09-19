"""
文章标签自动建议服务

功能：
1. 基于NER和关键词抽取技术自动建议标签
2. 与现有标签库匹配，减少同义词问题
3. 支持编辑勾选确认机制
"""

import re
from typing import List, Dict, Tuple
from django.conf import settings
from taggit.models import Tag
from difflib import SequenceMatcher
import logging

# 使用统一的jieba配置
from apps.core.jieba_config import get_jieba_instance
jieba = get_jieba_instance()
import jieba.analyse

logger = logging.getLogger(__name__)


class TagSuggestionService:
    """标签建议服务"""
    
    def __init__(self):
        # jieba已在导入时配置和初始化
        pass
        
        # 实体识别关键词列表
        self.entity_patterns = {
            'person': [
                r'([\u4e00-\u9fa5]{2,3})(主席|总统|部长|市长|董事长|总裁|教授|博士|书记|省长|市长|县长|区长|镇长|村长|街道长)',
                r'([\u4e00-\u9fa5]{2,4})(先生|女士|同志|)',
            ],
            'location': [
                r'([\u4e00-\u9fa5]{2,6})(省|市|县|区|镇|村|街道)',
                r'([\u4e00-\u9fa5]{2,8})(大学|学院|医院|公司|集团|学校)',
            ],
            'organization': [
                r'([\u4e00-\u9fa5]{2,10})(有限公司|股份有限公司|集团|公司)',
                r'([\u4e00-\u9fa5]{2,8})(部|委|局|署|院)',
            ],
        }
    
    def clean_text(self, text: str) -> str:
        """基本清洗：去广告/噪声行、标准化空白与标点。"""
        if not text:
            return ''
        
        # 去除明显广告/推荐片段（更精确匹配）
        noise_patterns = [
            r"360搜索推荐x",
            r"客厅这样设计，周末都不想出门",
            r"父母住5楼太吃力？装个家用电梯，爸妈上下楼更轻松！",
            r"睾丸有时候变硬图片-图文对照-有什么危害",
            r"图片-图文对照",
            r"图文对照",
            r"家用电梯",
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, "", text)
        
        # 统一空白
        text = re.sub(r"\s+", " ", text)
        
        # 保留更多有用字符，只去除明显的噪声
        text = re.sub(r"[^\u4e00-\u9fa5A-Za-z0-9，。、""''：；！？—\-（）《》【】\s]", "", text)
        
        return text.strip()

    def extract_textrank_keywords(self, text: str, topK: int = 20) -> List[str]:
        """使用TextRank提取关键词，限制词性为专名类。"""
        try:
            kws = jieba.analyse.textrank(
                text, topK=topK, withWeight=False,
                allowPOS=("ns", "nr", "nt", "nz")
            ) or []
            return [kw for kw in kws if self.is_valid_tag(kw)]
        except Exception:
            return []

    def extract_quoted_terms(self, text: str) -> List[str]:
        """提取中文引号中的术语，如 “舍利身” “仁义”。"""
        terms = re.findall(r"“([^”]{2,12})”", text)
        return [t for t in terms if self.is_valid_tag(t)]

    def extract_place_names(self, text: str) -> List[str]:
        """提取常见地名/机构名后缀的专名，如 九华山、通慧禅林、沈阳中医学院、通化206医院。"""
        suffixes = r"山|寺|禅林|学院|医院|寺院|庙|公社"
        pattern = re.compile(rf"([\u4e00-\u9fa5A-Za-z0-9]{{2,12}})({suffixes})")
        results = []
        for prefix, suf in re.findall(pattern, text):
            candidate = f"{prefix}{suf}"
            if self.is_valid_tag(candidate):
                results.append(candidate)
        return list(set(results))

    def extract_person_names_by_context(self, text: str) -> List[str]:
        """上下文规则提取人名：法号“仁义”、破折号后的姓名等。"""
        results = []
        # 法号“仁义”
        for m in re.findall(r"法号[“\"]([\u4e00-\u9fa5]{2,6})[”\"]", text):
            if self.is_valid_tag(m):
                results.append(m)
        # ——姜素敏
        for m in re.findall(r"—+([\u4e00-\u9fa5]{2,4})", text):
            if self.is_valid_tag(m):
                results.append(m)
        return list(set(results))

    def filter_candidates(self, candidates: List[str], text: str) -> List[str]:
        """去噪：去功能词、代词、含“的/了”等助词的片段；要求出现频次或为专名。"""
        if not candidates:
            return []
        bad_chars = set(list("的了是在于与及或但而就把被为向等着过及其以及并且还是则却而且亦仍亦已不再已又更都都将曾并已各每那些这些这种那种所谓相比例如以及其中因为所以由于因此按照通过对于关于等等"))
        pronouns = set(list("我你他她它我们你们他们她们其彼此谁某啥什么哪儿哪里这里那里此人本人"))
        text_lower = text
        freq = {}
        for cand in candidates:
            try:
                freq[cand] = len(re.findall(re.escape(cand), text_lower))
            except Exception:
                freq[cand] = 1
        filtered = []
        for cand in candidates:
            # 仅中文2-12字
            if not re.match(r"^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$", cand):
                continue
            # 去含助词/代词
            if any(ch in bad_chars for ch in cand):
                continue
            if any(ch in pronouns for ch in cand):
                continue
            # 频次门槛：至少出现2次，或是明显专名（以常见后缀结尾）
            if freq.get(cand, 0) < 2 and not re.search(r"(山|寺|禅林|学院|医院|寺院|庙|公社)$", cand):
                continue
            filtered.append(cand)
        # 去包含关系：保留较长的专名
        filtered_sorted = sorted(set(filtered), key=len, reverse=True)
        final = []
        for c in filtered_sorted:
            if not any((c != x and c in x) for x in final):
                final.append(c)
        return final

    def filter_candidates_relaxed(self, candidates: List[str]) -> List[str]:
        """宽松过滤：仅做基本合法性检查与去重，避免返回空集。"""
        if not candidates:
            return []
        out = []
        seen = set()
        for cand in candidates:
            if not cand or cand in seen:
                continue
            if not re.match(r"^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$", cand):
                continue
            if not self.is_valid_tag(cand):
                continue
            seen.add(cand)
            out.append(cand)
        return out[:20]

    def filter_candidates_improved(self, candidates_with_weights: Dict[str, float], text: str) -> List[Dict]:
        """改进的候选词过滤：权重评分+低门槛高召回"""
        if not candidates_with_weights:
            return []
        
        results = []
        bad_chars = set(list("的了是在于与及或但而就把被为向等着过及其以及并且还是则却而且亦仍亦已不再已又更都都将曾并已各每那些这些这种那种所谓相比例如以及其中因为所以由于因此按照通过对于关于等等"))
        pronouns = set(list("我你他她它我们你们他们她们其彼此谁某啥什么哪儿哪里这里那里此人本人"))
        
        for candidate, weight in candidates_with_weights.items():
            # 基本格式检查
            if not re.match(r"^[\u4e00-\u9fa5A-Za-z0-9]{2,12}$", candidate):
                continue
            
            # 去助词/代词
            if any(ch in bad_chars for ch in candidate):
                continue
            if any(ch in pronouns for ch in candidate):
                continue
                
            # 改进：降低门槛，权重≥0.8即可（原来要求频次≥2）
            if weight < 0.8:
                continue
                
            # 计算在文本中的频次（用于最终评分）
            freq = len(re.findall(re.escape(candidate), text))
            
            # 最终评分：权重 + 频次加成
            final_score = weight + (freq * 0.1)
            
            results.append({
                'text': candidate,
                'weight': weight,
                'frequency': freq,
                'score': final_score
            })
        
        # 按评分排序，去重和包含关系处理
        results.sort(key=lambda x: x['score'], reverse=True)
        
        # 去包含关系：保留较长专名
        final_candidates = []
        added_texts = set()
        
        for item in results:
            candidate = item['text']
            # 跳过已包含的短词
            if any((candidate != existing and candidate in existing) for existing in added_texts):
                continue
            # 移除被当前候选词包含的短词
            added_texts = {t for t in added_texts if not (t != candidate and t in candidate)}
            added_texts.add(candidate)
            final_candidates.append(item)
            
        return final_candidates[:30]  # 保留30个候选词供匹配

    def match_existing_tags_improved(self, candidates: List[Dict], site_id: int = None) -> List[Dict]:
        """改进的标签匹配：降低相似度阈值，增加匹配策略"""
        suggestions = []
        
        # 获取现有标签
        existing_tags = Tag.objects.all()
        existing_tag_names = {tag.name.lower(): tag for tag in existing_tags}
        
        for candidate_item in candidates:
            candidate = candidate_item['text']
            candidate_score = candidate_item['score']
            candidate_lower = candidate.lower()
            
            # 1. 精确匹配
            if candidate_lower in existing_tag_names:
                suggestions.append({
                    'text': existing_tag_names[candidate_lower].name,
                    'type': 'exact_match',
                    'confidence': min(0.95, 0.7 + candidate_score * 0.1),
                    'is_new': False,
                    'tag_id': existing_tag_names[candidate_lower].id,
                    'original_score': candidate_score
                })
                continue
            
            # 2. 改进的模糊匹配（降低阈值到0.6）
            best_match = None
            best_ratio = 0
            
            for existing_name, tag in existing_tag_names.items():
                ratio = SequenceMatcher(None, candidate_lower, existing_name).ratio()
                if ratio > best_ratio and ratio > 0.6:  # 降低阈值：0.8 -> 0.6
                    best_ratio = ratio
                    best_match = tag
            
            if best_match:
                suggestions.append({
                    'text': best_match.name,
                    'type': 'fuzzy_match',
                    'confidence': min(0.85, best_ratio * 0.7 + candidate_score * 0.05),
                    'is_new': False,
                    'tag_id': best_match.id,
                    'original_candidate': candidate,
                    'similarity': best_ratio,
                    'original_score': candidate_score
                })
            else:
                # 3. 新标签建议（提高权重高的候选词的置信度）
                new_tag_confidence = min(0.75, 0.5 + candidate_score * 0.05)
                if new_tag_confidence > 0.55:  # 只推荐有一定置信度的新标签
                    suggestions.append({
                        'text': candidate,
                        'type': 'new_tag',
                        'confidence': new_tag_confidence,
                        'is_new': True,
                        'tag_id': None,
                        'original_score': candidate_score
                    })
        
        return suggestions

    def suggest_tags(self, title: str, content: str, site_id: int = None) -> List[Dict]:
        """
        为文章内容建议标签 - 改进版：高召回+智能匹配
        
        Args:
            title: 文章标题
            content: 文章内容
            site_id: 站点ID（用于过滤站点相关标签）
            
        Returns:
            List[Dict]: 标签建议列表
        """
        try:
            # 合并并清洗文本
            raw_text = f"{title} {content}"
            text = self.clean_text(raw_text)

            # 改进1：多算法并集+权重评分（而非保守的交集）
            candidates_with_weights = {}
            
            # TF-IDF关键词（权重1.0）
            keywords_tfidf = self.extract_keywords(text, topK=30)
            for kw in keywords_tfidf:
                candidates_with_weights[kw] = candidates_with_weights.get(kw, 0) + 1.0

            # TextRank关键词（权重0.8）
            keywords_textrank = self.extract_textrank_keywords(text, topK=30)
            for kw in keywords_textrank:
                candidates_with_weights[kw] = candidates_with_weights.get(kw, 0) + 0.8

            # 改进2：新闻要素抽取（高权重）
            entities = self.extract_entities(text)
            for entity in entities:
                candidates_with_weights[entity] = candidates_with_weights.get(entity, 0) + 1.5

            quoted = self.extract_quoted_terms(text)
            for term in quoted:
                candidates_with_weights[term] = candidates_with_weights.get(term, 0) + 1.3

            places = self.extract_place_names(text)
            for place in places:
                candidates_with_weights[place] = candidates_with_weights.get(place, 0) + 1.2

            persons = self.extract_person_names_by_context(text)
            for person in persons:
                candidates_with_weights[person] = candidates_with_weights.get(person, 0) + 1.2

            # 改进3：降低过滤门槛，保留更多候选词
            candidates = self.filter_candidates_improved(candidates_with_weights, text)
            
            # 改进4：增强的现有标签匹配
            suggestions = self.match_existing_tags_improved(candidates, site_id)
            
            # 5. 按置信度排序
            suggestions.sort(key=lambda x: x['confidence'], reverse=True)
            
            return suggestions[:15]  # 返回15个高质量建议
            
        except Exception as e:
            logger.error(f"标签建议生成失败: {str(e)}")
            return []
    
    def extract_keywords(self, text: str, topK: int = 20) -> List[str]:
        """提取关键词"""
        # 清理文本
        text = re.sub(r'<[^>]+>', '', text)  # 移除HTML标签
        text = re.sub(r'\s+', ' ', text)     # 标准化空白字符
        
        # 使用TF-IDF提取关键词
        keywords = jieba.analyse.extract_tags(
            text, 
            topK=topK,
            withWeight=True,
            # 更严格：优先专名，减少口语化片段
            allowPOS=('nr', 'ns', 'nt', 'nz')
        )
        
        # 过滤长度和质量
        filtered_keywords = []
        for keyword, weight in keywords:
            if (2 <= len(keyword) <= 12 and 
                weight > 0.1 and 
                self.is_valid_tag(keyword)):
                filtered_keywords.append(keyword)
        
        return filtered_keywords
    
    def extract_entities(self, text: str) -> List[str]:
        """简单的命名实体识别"""
        entities = []
        
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    if isinstance(match, tuple):
                        entity = match[0]  # 取实体名部分
                    else:
                        entity = match
                    
                    if self.is_valid_tag(entity):
                        entities.append(entity)
        
        return list(set(entities))
    
    def match_existing_tags(self, candidates: List[str], site_id: int = None) -> List[Dict]:
        """与现有标签库匹配"""
        suggestions = []
        
        # 获取现有标签
        existing_tags = Tag.objects.all()
        if site_id:
            # 这里可以加入站点过滤逻辑
            pass
        
        existing_tag_names = {tag.name.lower(): tag for tag in existing_tags}
        
        for candidate in candidates:
            candidate_lower = candidate.lower()
            
            # 1. 精确匹配
            if candidate_lower in existing_tag_names:
                suggestions.append({
                    'text': existing_tag_names[candidate_lower].name,
                    'type': 'exact_match',
                    'confidence': 0.95,
                    'is_new': False,
                    'tag_id': existing_tag_names[candidate_lower].id
                })
                continue
            
            # 2. 模糊匹配
            best_match = None
            best_ratio = 0
            
            for existing_name, tag in existing_tag_names.items():
                ratio = SequenceMatcher(None, candidate_lower, existing_name).ratio()
                if ratio > best_ratio and ratio > 0.8:  # 80%相似度
                    best_ratio = ratio
                    best_match = tag
            
            if best_match:
                suggestions.append({
                    'text': best_match.name,
                    'type': 'fuzzy_match',
                    'confidence': best_ratio * 0.8,  # 降低模糊匹配的置信度
                    'is_new': False,
                    'tag_id': best_match.id,
                    'original_candidate': candidate
                })
            else:
                # 3. 新标签建议
                suggestions.append({
                    'text': candidate,
                    'type': 'new_tag',
                    'confidence': 0.6,
                    'is_new': True,
                    'tag_id': None
                })
        
        return suggestions
    
    def is_valid_tag(self, text: str) -> bool:
        """验证标签是否有效"""
        # 基本过滤规则
        if len(text) < 2 or len(text) > 20:
            return False
        
        # 过滤停用词
        stopwords = {'的', '了', '在', '是', '和', '与', '或', '但', '等', '及'}
        if text in stopwords:
            return False
        
        # 过滤纯数字或特殊字符
        if re.match(r'^[\d\W]+$', text):
            return False
        
        return True


class TagSuggestionAPI:
    """标签建议API接口"""
    
    def __init__(self):
        self.service = TagSuggestionService()
    
    def get_suggestions_for_article(self, article_data: Dict) -> Dict:
        """为文章获取标签建议"""
        title = article_data.get('title', '')
        content = article_data.get('body', '')
        site_id = article_data.get('site_id')
        
        suggestions = self.service.suggest_tags(title, content, site_id)
        
        return {
            'success': True,
            'suggestions': suggestions,
            'total_count': len(suggestions),
            'message': f'找到 {len(suggestions)} 个标签建议'
        }


# 全局实例
tag_suggestion_api = TagSuggestionAPI()
