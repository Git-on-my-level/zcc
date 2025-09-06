---
name: summarize
description: A systematic approach to compressing context and extracting essential information from codebases, directories, or complex topics.
author: zcc
version: 1.0.0
tags: []
dependencies: []
---

# Summarize Workflow

A systematic approach to compressing context and extracting essential information from codebases, directories, or complex topics.

## Prerequisites
- Clear definition of what needs summarizing
- Access to relevant files/directories
- Understanding of the target audience for the summary

## Inputs
- **scope**: What to summarize (path, topic, or file list)
- **depth**: Level of detail needed (high-level, detailed, exhaustive)
- **focus**: Specific aspects to emphasize (architecture, implementation, etc.)

## Example Commands

### Natural Language Invocations
- "execute summarize on the entire codebase"
- "summarize the authentication module for me"
- "create a high-level overview of our React components"
- "compress the context of this directory"

### Common Use Cases
- `execute summarize --scope src/ --depth high-level` → Quick codebase overview
- `execute summarize --scope src/auth --depth detailed --focus security` → Detailed security summary
- `execute summarize --scope . --focus architecture` → Architecture documentation
- `execute summarize --scope src/components --depth exhaustive` → Complete component analysis

### Workflow Integration Examples
- "summarize the codebase before the architecture review" → Pre-review documentation
- "execute summarize then act as architect" → Context compression before design
- "summarize recent changes from git history" → Change summary

## Workflow Steps

### 1. Scope Definition
Determine what needs to be summarized:
- Entire codebase
- Specific directory
- Set of related files
- Conceptual topic

### 2. Analysis Phase

#### For Code/Directory Summaries:
1. **Structure Analysis**
   - Map directory structure
   - Identify key modules/components
   - Note dependencies between parts

2. **Purpose Identification**
   - What does each component do?
   - How do components interact?
   - What are the main entry points?

3. **Pattern Recognition**
   - Common design patterns used
   - Coding conventions
   - Architectural decisions

#### For Conceptual Summaries:
1. **Core Concepts**
   - Key ideas and principles
   - Important terminology
   - Relationships between concepts

2. **Context Mapping**
   - Prerequisites
   - Related topics
   - Practical applications

### 3. Synthesis Phase

Create a hierarchical summary:
1. **High-Level Overview** (1-2 paragraphs)
   - Primary purpose
   - Key components
   - Main interactions

2. **Component Breakdown**
   - Brief description of each major part
   - Key responsibilities
   - Important details

3. **Essential Details**
   - Critical configuration
   - Important constraints
   - Notable decisions

### 4. Output Format

Structure the summary for maximum utility:

```markdown
# Summary: [Topic/Directory Name]

## Overview
[High-level description]

## Key Components
- **Component A**: [Brief description]
- **Component B**: [Brief description]

## Important Details
- [Critical detail 1]
- [Critical detail 2]

## Next Steps / Entry Points
- [Where to start exploring]
- [Key files to examine]
```

## Output Format

The workflow produces a structured summary saved to `.zcc/tickets/[current]/summaries/[timestamp].md`:

```markdown
# Summary: [Topic/Scope]
Generated: [timestamp]
Scope: [what was analyzed]
Depth: [level of detail]

## Executive Summary
[1-2 paragraph overview for quick understanding]

## Architecture Overview
[System structure and key design decisions]

## Key Components
### Component Name
- Purpose: [what it does]
- Location: [where to find it]
- Dependencies: [what it needs]
- Interface: [how to use it]

## Data Flow
[How information moves through the system]

## Entry Points
[Where to start when working with this code]

## Critical Paths
[Most important flows through the system]

## Technical Debt / Notes
[Important limitations or future work]
```

## Language-Specific Patterns

### TypeScript/JavaScript Projects
- Focus on module structure and exports
- Note TypeScript interfaces and types
- Highlight React component hierarchies
- Document state management patterns

### Go Projects
- Emphasize package organization
- Note interface definitions
- Document goroutine usage
- Highlight error handling patterns

## Best Practices

1. **Be Ruthlessly Concise**: Aim for 10-20% of original context
2. **Preserve Critical Information**: Architecture > Implementation details
3. **Use Visual Aids**: Include simple ASCII diagrams where helpful
4. **Make it Scannable**: Use consistent formatting and headers
5. **Version Summaries**: Include timestamps and scope

## Integration Points

- Store in `.zcc/tickets/[task]/summaries/`
- Link from main ticket documentation
- Reference when switching modes
- Use as input for reviews

## When to Use

- Before switching between modes
- When context window approaches limits
- For daily progress documentation
- When onboarding team members
- Before architectural discussions

