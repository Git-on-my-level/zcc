#!/bin/sh
if [ -z "$1" ]; then
  sh .zcc/scripts/list-modes.sh
else
  QUERY="$1"
  MODE_FILE=""
  
  # First try exact match
  if [ -f ".zcc/modes/$QUERY.md" ]; then
    MODE_FILE=".zcc/modes/$QUERY.md"
  fi
  
  # If no exact match, try substring matching
  if [ -z "$MODE_FILE" ]; then
    MODE_FILE=$(find .zcc/modes -name "*$QUERY*.md" | head -1)
  fi
  
  # If still no match, try acronym matching
  if [ -z "$MODE_FILE" ]; then
    # Simple acronym matching: check if query letters match first letters of words
    for file in .zcc/modes/*.md; do
      if [ -f "$file" ]; then
        basename_no_ext=$(basename "$file" .md)
        # Convert hyphens/underscores to spaces and get first letter of each word
        words=$(echo "$basename_no_ext" | sed 's/[-_]/ /g')
        acronym=""
        for word in $words; do
          first_char=$(echo "$word" | cut -c1)
          acronym="${acronym}${first_char}"
        done
        
        # Check if query matches the acronym (case insensitive)
        query_lower=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]')
        acronym_lower=$(echo "$acronym" | tr '[:upper:]' '[:lower:]')
        
        if [ "$query_lower" = "$acronym_lower" ]; then
          MODE_FILE="$file"
          break
        fi
      fi
    done
  fi
  
  if [ -n "$MODE_FILE" ]; then
    echo "# Switching to Mode: $(basename "$MODE_FILE" .md)"
    cat "$MODE_FILE"
  else
    echo "Mode '$QUERY' not found. Available modes:"
    sh .zcc/scripts/list-modes.sh
  fi
fi