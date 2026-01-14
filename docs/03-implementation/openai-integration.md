# OpenAI Integration

## Purpose

OpenAI is used to analyze a word and return structured linguistic data.

The backend must receive deterministic JSON.
No free-form text is allowed.

---

## Input

Input:
- Single word or short phrase
- No punctuation normalization is applied before sending to OpenAI

---

## Output Contract (Strict)

OpenAI must return a valid JSON object with the following structure:

```json
{
  "detected_language": "pt|en|ru",
  "pos": "verb|noun|adjective|other",
  "normalized": {
    "lemma": "",
    "infinitive": ""
  },
  "translation_ru": "",
  "verb": {
    "presente": {
      "voce": "",
      "ele_ela": "",
      "eles_elas": "",
      "nos": ""
    },
    "preterito_perfeito": {
      "voce": "",
      "ele_ela": "",
      "eles_elas": "",
      "nos": ""
    },
    "futuro_do_presente": {
      "voce": "",
      "ele_ela": "",
      "eles_elas": "",
      "nos": ""
    }
  },
  "confidence": 0.0
}
```

All keys must exist.
Missing values must be empty strings.

---

## Prompt Rules

- System message enforces JSON-only output.
- User message embeds the expected JSON schema.
- No explanations.
- No markdown.
- No additional keys.

---

## Language Detection Rules

- pt = Brazilian Portuguese
- en = English
- ru = Russian

If detected_language = ru:
- Backend does not guess target language.
- UI must provide forceLanguage (pt or en).

---

## POS Rules

- verb → Verbo
- noun → substantivo
- adjective → Adjetivo
- other → ignored or treated as noun (TBD)

---

## Normalization Rules

- For verbs:
  - normalized.infinitive must be set if possible.
- For nouns/adjectives:
  - normalized.lemma must be set.

Fallback:
- If both lemma and infinitive are empty, use raw input.

---

## Verb Rules

Verb data is only trusted when:
- detected_language = pt
- pos = verb

For all other cases:
- verb object is ignored.

---

## Confidence Field

- Range: 0.0 – 1.0
- Used only for debugging and future heuristics.
- Not used for logic in MVP.

---

## Error Handling

- If OpenAI response is not valid JSON → error.
- If required keys are missing → error.
- If detected_language is missing → error.

---

## Non-Goals

- No retries logic in MVP.
- No multi-word grammar analysis.
- No sentence parsing.
