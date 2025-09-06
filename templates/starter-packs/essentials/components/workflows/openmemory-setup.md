---
name: openmemory-setup
description: This workflow guides an LLM agent in setting up OpenMemory MCP for the user's local environment to enable persistent memory across sessions.
author: zcc
version: 1.0.0
tags: []
dependencies: []
---

# OpenMemory MCP Setup Workflow

This workflow guides an LLM agent in setting up OpenMemory MCP for the user's local environment to enable persistent memory across sessions.

## 1. Prerequisites: Obtain OpenMemory API Key

Before starting, ensure the user has an OpenMemory API key. You will need to ask the user for it.

1. The user can get a key by signing up at app.openmemory.dev.
2. The key should be in the format `om-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

## 2. Configure OpenMemory (Global Setup)

To add MCP servers to your Claude Code configuration:                                                                                                        
                                                                                                                                                               
1. Create/edit the config file: ~/.claude/mcp.json         
                                                                                                  
```                                                                                                                             
{                                                                                                                                                            
    "mcpServers": {                                                                                                                                            
        "openmemory": {                                                                                                                                          
        "command": "npx",                                                                                                                                      
        "args": ["-y", "openmemory"],                                                                                                                          
        "env": {                                                                                                                                               
            "OPENMEMORY_API_KEY": "your-api-key",                                                                                                                
            "CLIENT_NAME": "claude"                                                                                                                              
        }                                                                                                                                                      
    }                                                                                                                                                        
}                                                                                                                                                          
}
```

## 2. Verify Global Configuration

Run these commands to verify that the MCP server was added successfully at the user level.

```bash
claude mcp list
claude mcp get openmemory
```
