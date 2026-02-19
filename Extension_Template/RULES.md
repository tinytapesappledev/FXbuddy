# Cursor Rule: Adobe Extension Development

This rule applies to ALL changes made through Cursor IDE
for Adobe extensions (Premiere Pro, After Effects, CEP, UXP).

Cursor must follow this process before generating, modifying,
or refactoring any code.

---

## 1. Mandatory Pre-Change Context Loading

Before making ANY change, Cursor MUST:

1. Read `PR.md`
2. Read `AE.md`
3. Read `changes.md`

If any of these files are missing:
- STOP
- Ask to create them before proceeding

No assumptions are allowed without reading these files.

---

## 2. Change Declaration Requirement

Before writing or modifying code, Cursor MUST:

- Append a new entry to `changes.md`
- Describe the change BEFORE implementation

Cursor is NOT allowed to:
- Modify code first
- Infer undocumented intent
- Bundle multiple unrelated changes

### `changes.md` entry format (append-only)

```md
## [YYYY-MM-DD] <Short Change Title>

**Scope**
- PR / AE / Shared / UI / Build / Licensing

**Reason**
- Why this change is required

**Description**
- Exact behavior change (technical + user-facing)

**Risk Level**
- Low / Medium / High

**Rollback Plan**
- How this change can be reverted
