# Card Templates

## Purpose

Card Templates define what a flashcard shows on the front and on the back.

Templates allow the same word to be practiced in different ways:
- translation
- verb forms
- tenses
- custom learning goals

Templates are selected per Deck.

---

## Core Concepts

### Card
A Card is a visual representation of a Word inside a Deck.

A Card has:
- Front side
- Back side

The Card itself does not store content logic.
It only renders data according to a Template.

---

### Template
A Template defines:
- What fields appear on the front side
- What fields appear on the back side
- How fields are grouped and ordered

Templates are declarative and data-driven.

---

## Template Responsibilities

Templates:
- Choose which Word fields to show
- Define front/back structure
- Define layout blocks (title, list, table)

Templates do NOT:
- Fetch data
- Store learning progress
- Modify Notion data

---

## Default Templates (MVP)

### 1. Translation Template

Purpose:
- Memorize word meaning

Front:
- Word (original language)

Back:
- Translation (Russian)

Use cases:
- Basic vocabulary learning
- First exposure to a word

---

### 2. Verb Presente Template

Purpose:
- Memorize present tense forms

Front:
- Word (infinitive)

Back:
- Voce
- ele/ela
- eles/elas
- Nos

Use cases:
- Portuguese verbs
- Present tense drills

---

### 3. Verb Tenses Template

Purpose:
- Memorize multiple verb tenses

Front:
- Word (infinitive)

Back:
- Presente (voce, ele/ela, eles/elas, nos)
- Pretérito perfeito (same persons)
- Futuro do presente (same persons)

Use cases:
- Advanced verb practice

---

## Template Data Model

Templates are represented as JSON objects.

Example:

```json
{
  "id": "verb_presente",
  "name": "Verb — Presente",
  "front": [
    { "type": "field", "key": "Word" }
  ],
  "back": [
    {
      "type": "group",
      "title": "Presente",
      "fields": ["Voce", "ele/ela", "eles/elas", "Nos"]
    }
  ]
}
```
