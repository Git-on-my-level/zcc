---
name: review
description: A structured approach to code review that ensures quality, security, and maintainability through systematic evaluation.
author: zcc
version: 1.0.0
tags: []
dependencies: []
---

# Review Workflow

A structured approach to code review that ensures quality, security, and maintainability through systematic evaluation.

## Prerequisites
- Access to code changes or pull request
- Understanding of project standards and conventions
- Reviewer mode installed (recommended)

## Inputs
- **target**: What to review (PR URL, commit range, or file paths)
- **type**: Review type (general, security, performance, architecture)
- **depth**: Review thoroughness (quick, standard, deep)

## Outputs
- Structured feedback document in `.zcc/tickets/[current]/reviews/`
- Prioritized list of issues and suggestions
- Actionable improvement recommendations

## Example Commands

### Natural Language Invocations
- "execute review on the authentication module"
- "run a security-focused review of the API"
- "perform a deep code review on PR #456"
- "review the latest commit for performance issues"

### Common Use Cases
- `execute review --target PR#123 --type general` → Standard PR review
- `execute review --target src/api --type security --depth deep` → Security audit
- `execute review --target HEAD~5..HEAD --type performance` → Performance review of recent commits
- `execute review --target src/components --depth quick` → Quick component review

### Workflow Integration Examples
- "execute review then summarize the findings" → Review + Summary
- "review this code and create tickets for critical issues" → Review + Task creation
- "run the review workflow before deployment" → Pre-deployment check

## Workflow Steps

### 1. Preparation Phase

1. **Context Gathering**
   - Understand the purpose of changes
   - Review related tickets/issues
   - Check design documents

2. **Scope Definition**
   - Identify files to review
   - Note areas of particular concern
   - Set review priorities

### 2. Multi-Pass Review

#### Pass 1: Architecture & Design (10 minutes)
- Overall structure appropriate?
- Design patterns correctly applied?
- Proper separation of concerns?
- API contracts well-defined?

#### Pass 2: Implementation Details (20 minutes)
- Logic correctness
- Error handling
- Edge case coverage
- Performance considerations

#### Pass 3: Code Quality (15 minutes)
- Readability and clarity
- Naming conventions
- Documentation completeness
- Test coverage

#### Pass 4: Security & Safety (10 minutes)
- Input validation
- Authentication/authorization
- Data sanitization
- Resource management

### 3. Feedback Compilation

Structure feedback by priority:

#### Critical (Must Fix)
- Security vulnerabilities
- Data loss risks
- Logic errors
- Missing error handling

#### Important (Should Fix)
- Performance issues
- Poor test coverage
- Unclear code
- Design problems

#### Minor (Consider Fixing)
- Style inconsistencies
- Documentation gaps
- Refactoring opportunities
- Nice-to-have improvements

### 4. Feedback Delivery

Use this template:

```markdown
## Code Review: [Component/PR Name]

### Summary
[Overall assessment - 2-3 sentences]

### Critical Issues
1. **[File:Line]**: [Issue description]
   ```
   [Code snippet if helpful]
   ```
   **Suggestion**: [Specific fix]

### Important Issues
[Similar format]

### Minor Suggestions
[Similar format]

### Positive Observations
- [Good practice noted]
- [Well-implemented feature]

### Overall Recommendations
[Next steps and priorities]
```

## Review Checklist

### Always Check
- [ ] Functionality correct
- [ ] Tests adequate
- [ ] Error handling present
- [ ] Security considered
- [ ] Performance acceptable

### Language-Specific Checks
- [ ] Memory management (C/C++/Rust)
- [ ] Null safety (Java/Kotlin/Swift)
- [ ] Type safety (TypeScript)
- [ ] Concurrency safety (Go/Rust)

## Integration Points

- Use with pull requests
- Part of deployment pipeline
- Regular codebase audits
- Pair programming sessions

## Best Practices

1. **Time-box Reviews**: Maximum 60 minutes per session
2. **Focus on Impact**: Prioritize high-risk areas
3. **Provide Examples**: Show, don't just tell
4. **Be Respectful**: Professional and constructive
5. **Follow Up**: Ensure feedback is addressed

## Automation Support

Consider automating checks for:
- Code formatting
- Basic linting
- Test coverage
- Security scanning

Focus human review on:
- Business logic
- Design decisions
- Complex algorithms
- Integration points