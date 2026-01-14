# Notion Integration

## Purpose

Notion is the source of truth for all words.
The app never deletes words from Notion.
The app only creates or updates records.

The database name is "Words".

---

## Required Notion Properties

The following properties must exist in the Notion database.

### Core
- Word (Title)
- Translation (Rich text)
- Context (Rich text)
- Typo (Select)
  - Verbo
  - substantivo
  - Adjetivo
- Language (Select)
  - Portuguese
  - English
- Key (Rich text)

### Verb Forms (Portuguese only)
- Voce (Rich text)
- ele/ela (Rich text)
- eles/elas (Rich text)
- Nos (Rich text)

---

## Dedupe Strategy

Each word has a deterministic dedupe key.

### Key format |<lowercased_input>
Examples:
- pt|ressaca
- en|cloudy

Rules:
- Input is trimmed.
- Input is lowercased.
- Language prefix is mandatory.

---

## Upsert Flow

### Step 1: Build Key
- Detect language using OpenAI.
- If detected language is "ru", UI must provide forceLanguage (pt or en).
- Build Key using final language and raw input.

### Step 2: Query by Key
Query Notion database:
- Filter by property "Key"
- Equals the generated key
- Limit to 1 result

### Step 3: Decide Action
- If record exists → UPDATE
- If record does not exist → CREATE

---

## Create Record Mapping

### Required fields
- Word:
  - Infinitive if verb
  - Lemma if noun/adjective
  - Raw input as fallback
- Key
- Language
- Translation
- Typo

### Optional fields
- Context (if provided by user)

### Verb forms
Only set if:
- Language = Portuguese
- Typo = Verbo

Fields:
- Voce
- ele/ela
- eles/elas
- Nos

---

## Update Record Rules

- Word is never changed after creation.
- Key is never changed.
- Language is never changed.
- Translation is updated if provided.
- Context is appended or replaced (TBD).

Verb forms:
- Updated only if Portuguese verb.
- Never updated for nouns or adjectives.

---

## Error Handling

- If Notion query fails → return error.
- If multiple records are found with the same Key → treat as data corruption and stop.
- If Notion update/create fails → return error.

---

## Non-Goals

- No deck logic.
- No learning progress.
- No deletion of words.
