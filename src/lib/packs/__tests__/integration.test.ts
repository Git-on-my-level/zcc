/**
 * Integration tests for the starter pack system
 * 
 * Focus: Test critical end-to-end workflows that could break in production:
 * - Complete pack installation flow
 * - Global vs project installation scopes  
 * - Failure handling without --force flag
 * - Dependency resolution edge cases
 * - Uninstall with manifest snapshots
 */

import * as path from 'path';
import * as os from 'os';
import { StarterPackManager } from '../../StarterPackManager';
import { MemoryFileSystemAdapter, createTestFileSystem } from '../../testing';

// Mock logger and PackagePaths to prevent console output and path issues during tests
jest.mock('../../logger');
jest.mock('../../packagePaths', () => ({
  PackagePaths: {
    getTemplatesDir: () => '/test/templates'
  }
}));

describe('StarterPackManager Integration', () => {
  let mockFs: MemoryFileSystemAdapter;
  let manager: StarterPackManager;
  let projectRoot: string;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create isolated test environment
    tempDir = path.join(os.tmpdir(), `zcc-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    projectRoot = tempDir;
    
    // Setup mock file system with realistic pack structure
    mockFs = await setupMockPackSystem();
    manager = new StarterPackManager(projectRoot, mockFs);
  });

  afterEach(async () => {
    // Cleanup mock filesystem
    mockFs.reset();
  });

  /**
   * CRITICAL PATH: Complete pack installation end-to-end
   * Tests the full installation flow including dependency resolution
   */
  describe('End-to-End Pack Installation', () => {
    it('should successfully install essentials pack with all components', async () => {
      // Act: Install the essentials pack
      const result = await manager.installPack('essentials');


      // Assert: Installation successful
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify all components were installed
      expect(result.installed.modes).toEqual(['ai-debt-maintainer', 'architect', 'autonomous-project-manager', 'engineer', 'reviewer']);
      expect(result.installed.workflows).toEqual(['openmemory-setup', 'review', 'summarize']);
      expect(result.installed.agents).toHaveLength(0);

      // Verify files were created in correct locations
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(true);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'workflows', 'review.md'))).toBe(true);
      
      // Verify project manifest was updated
      const projectManifest = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'packs.json'), 'utf-8') as string
      );
      expect(projectManifest.packs.essentials).toBeDefined();
      expect(projectManifest.packs.essentials.version).toBe('1.0.0');

      // Verify manifest snapshot was saved
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'packs', 'essentials.manifest.json'))).toBe(true);

      // Verify configuration was applied
      const config = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'config.json'), 'utf-8') as string
      );
      expect(config.defaultMode).toBe('autonomous-project-manager');
      expect(config.enableHooks).toBe(true);
    });

    it('should handle pack with dependencies correctly', async () => {
      // Setup frontend-react pack that depends on essentials
      await setupPackWithDependencies();

      // Act: Install pack with dependencies
      const result = await manager.installPack('frontend-react');

      // Assert: Both packs installed
      expect(result.success).toBe(true);

      // Verify project manifest shows both packs
      const projectManifest = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'packs.json'), 'utf-8') as string
      );
      expect(projectManifest.packs.essentials).toBeDefined();
      expect(projectManifest.packs['frontend-react']).toBeDefined();

      // Verify components from both packs exist
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(true);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'react-developer.md'))).toBe(true);
    });
  });

  /**
   * CRITICAL PATH: Conflict handling without --force flag
   * This is a common production issue where users try to install over existing components
   */
  describe('Conflict Detection and Resolution', () => {
    it('should fail installation when components conflict without --force flag', async () => {
      // Arrange: Pre-install essentials pack 
      await manager.installPack('essentials');

      // Create a modified version of architect mode to simulate conflict
      const architectPath = path.join(projectRoot, '.zcc', 'modes', 'architect.md');
      await mockFs.writeFile(architectPath, '# Modified Architect Mode\nCustom content');

      // Act: Try to install pack that would overwrite existing component
      const result = await manager.installPack('essentials');

      // Assert: Installation should fail due to conflicts
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Conflict'))).toBe(true);

      // Verify existing file wasn't overwritten
      const existingContent = await mockFs.readFile(architectPath, 'utf-8');
      expect(existingContent).toContain('Modified Architect Mode');
    });

    it('should succeed with --force flag and overwrite conflicting components', async () => {
      // Arrange: Pre-install essentials and modify a component
      await manager.installPack('essentials');
      const architectPath = path.join(projectRoot, '.zcc', 'modes', 'architect.md');
      await mockFs.writeFile(architectPath, '# Modified Architect Mode');

      // Act: Force reinstall
      const result = await manager.installPack('essentials', { force: true });

      // Assert: Installation should succeed
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify file was overwritten with original content
      const newContent = await mockFs.readFile(architectPath, 'utf-8');
      expect(newContent).not.toContain('Modified Architect Mode');
      expect(newContent).toContain('Architect Mode Template');
    });
  });

  /**
   * CRITICAL PATH: Dependency resolution failure cases  
   * Tests edge cases that could cause installation failures
   */
  describe('Dependency Resolution Edge Cases', () => {
    it('should fail gracefully when dependency is missing', async () => {
      // Setup pack with non-existent dependency
      await setupPackWithMissingDependency();

      // Act: Try to install pack with missing dependency
      const result = await manager.installPack('pack-with-missing-dep');

      // Assert: Should fail with clear error message
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('not found'))).toBe(true);
    });

    it('should detect and prevent circular dependencies', async () => {
      // Setup circular dependency scenario: pack-a depends on pack-b, pack-b depends on pack-a
      await setupCircularDependencies();

      // Act: Try to install pack with circular dependency
      const result = await manager.installPack('pack-a');


      // Assert: Should fail with circular dependency error
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should handle complex dependency chains correctly', async () => {
      // Setup: pack-c -> pack-b -> essentials
      await setupComplexDependencyChain();

      // Act: Install pack with deep dependency chain
      const result = await manager.installPack('pack-c');


      // Assert: All dependencies installed in correct order
      expect(result.success).toBe(true);

      const projectManifest = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'packs.json'), 'utf-8') as string
      );
      
      // Verify all packs in chain were installed
      expect(projectManifest.packs.essentials).toBeDefined();
      expect(projectManifest.packs['pack-b']).toBeDefined(); 
      expect(projectManifest.packs['pack-c']).toBeDefined();
    });
  });

  /**
   * CRITICAL PATH: Uninstall with manifest snapshots
   * Tests that uninstallation correctly removes components using saved manifest
   */
  describe('Pack Uninstallation', () => {
    it('should uninstall pack completely using manifest snapshot', async () => {
      // Arrange: Install pack first
      await manager.installPack('essentials');
      
      // Verify installation
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(true);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'workflows', 'review.md'))).toBe(true);

      // Act: Uninstall the pack
      const result = await manager.uninstallPack('essentials');

      // Assert: Uninstallation successful
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify all components removed
      expect(result.installed.modes).toEqual(['ai-debt-maintainer', 'architect', 'autonomous-project-manager', 'engineer', 'reviewer']);
      expect(result.installed.workflows).toEqual(['openmemory-setup', 'review', 'summarize']);

      // Verify files actually deleted
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(false);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'workflows', 'review.md'))).toBe(false);

      // Verify project manifest updated
      const projectManifest = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'packs.json'), 'utf-8') as string
      );
      expect(projectManifest.packs.essentials).toBeUndefined();

      // Verify manifest snapshot removed
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'packs', 'essentials.manifest.json'))).toBe(false);

      // Verify configuration cleaned up
      const config = JSON.parse(
        await mockFs.readFile(path.join(projectRoot, '.zcc', 'config.json'), 'utf-8') as string
      );
      expect(config.defaultMode).toBeUndefined();
      expect(config.enableHooks).toBeUndefined();
    });

    it('should handle uninstallation when manifest snapshot is missing', async () => {
      // Arrange: Install pack and then manually remove snapshot
      await manager.installPack('essentials');
      const snapshotPath = path.join(projectRoot, '.zcc', 'packs', 'essentials.manifest.json');
      await mockFs.unlink(snapshotPath);

      // Act: Try to uninstall without manifest snapshot
      const result = await manager.uninstallPack('essentials');

      // Assert: Should successfully reconstruct from original source and uninstall
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0); // Should succeed via reconstruction
      
      // All components should be removed via successful reconstruction
      expect(result.installed.modes).toEqual(['ai-debt-maintainer', 'architect', 'autonomous-project-manager', 'engineer', 'reviewer']);
      expect(result.installed.workflows).toEqual(['openmemory-setup', 'review', 'summarize']);
      
      // Verify files actually deleted
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(false);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'workflows', 'review.md'))).toBe(false);
    });

    it('should fail uninstallation for non-existent pack', async () => {
      // Act: Try to uninstall pack that was never installed
      const result = await manager.uninstallPack('non-existent-pack');

      // Assert: Should fail with clear error
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('not installed'))).toBe(true);
    });
  });

  /**
   * CRITICAL PATH: Installation scope handling
   * Future feature - global vs project installation
   */
  describe('Installation Scope Handling', () => {
    it('should handle project-scoped installation correctly', async () => {
      // Act: Install pack in project scope (default)
      const result = await manager.installPack('essentials');

      // Assert: Components installed in project directories
      expect(result.success).toBe(true);
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'modes', 'architect.md'))).toBe(true);
      
      // Verify project manifest exists (not global)
      expect(await mockFs.exists(path.join(projectRoot, '.zcc', 'packs.json'))).toBe(true);
    });

    // Note: Global installation will be implemented in future iteration
    it.skip('should handle global installation scope', async () => {
      // Future test for global installation scope
      // const result = await manager.installPack('essentials', { scope: 'global' });
      // expect(result.success).toBe(true);
      // Verify components installed in global directories
    });
  });

  /**
   * Setup helper functions for mock data
   */

  async function setupMockPackSystem(): Promise<MemoryFileSystemAdapter> {
    // Setup essentials pack manifest
    const essentialsManifest = {
      "name": "essentials",
      "version": "1.0.0",
      "description": "Essential zcc setup with core modes, workflows, and hooks",
      "author": "zcc",
      "category": "general",
      "components": {
        "modes": [
          { "name": "ai-debt-maintainer", "required": true },
          { "name": "architect", "required": true },
          { "name": "autonomous-project-manager", "required": true },
          { "name": "engineer", "required": true },
          { "name": "reviewer", "required": true }
        ],
        "workflows": [
          { "name": "openmemory-setup", "required": true },
          { "name": "review", "required": true },
          { "name": "summarize", "required": true }
        ],
        "agents": []
      },
      "configuration": {
        "defaultMode": "autonomous-project-manager",
        "projectSettings": {
          "enableHooks": true,
          "enableFuzzyMatching": true,
          "ticketSystem": true
        }
      }
    };

    // Read the actual schema file for validation
    const schemaContent = `{
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "zcc Starter Pack",
      "description": "Definition schema for zcc starter packs",
      "type": "object",
      "required": ["name", "version", "description", "author", "components"],
      "properties": {
        "name": { "type": "string", "pattern": "^[a-z][a-z0-9-]*$" },
        "version": { "type": "string", "pattern": "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+(-[a-zA-Z0-9-]+)?$" },
        "description": { "type": "string", "minLength": 10, "maxLength": 200 },
        "author": { "type": "string", "minLength": 1, "maxLength": 100 },
        "category": { "type": "string", "enum": ["frontend", "backend", "fullstack", "devops", "mobile", "ai-ml", "data", "general"] },
        "components": {
          "type": "object",
          "properties": {
            "modes": { "type": "array", "items": { "$ref": "#/definitions/component" } },
            "workflows": { "type": "array", "items": { "$ref": "#/definitions/component" } },
            "agents": { "type": "array", "items": { "$ref": "#/definitions/component" } }
          }
        },
        "configuration": { "type": "object" },
        "hooks": { "type": "array" },
        "dependencies": { "type": "array", "items": { "type": "string" } },
        "compatibleWith": { "type": "array", "items": { "type": "string" } },
        "postInstall": { "type": "object" }
      },
      "definitions": {
        "component": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "required": { "type": "boolean", "default": true }
          },
          "required": ["name"]
        }
      }
    }`;

    // Create test filesystem with pack structure using the testing utility
    const fs = await createTestFileSystem({
      // Schema file required by PackValidator
      '/test/templates/starter-packs/schema.json': schemaContent,
      
      // Essentials pack in the expected location
      '/test/templates/starter-packs/essentials/manifest.json': JSON.stringify(essentialsManifest, null, 2),
      
      // Component templates inside the pack's components directory (correct structure)
      '/test/templates/starter-packs/essentials/components/modes/ai-debt-maintainer.md': '---\nname: ai-debt-maintainer\n---\n# AI Debt Maintainer Mode\n\nMode content here.',
      '/test/templates/starter-packs/essentials/components/modes/architect.md': '---\nname: architect\n---\n# Architect Mode Template\n\nMode content here.',
      '/test/templates/starter-packs/essentials/components/modes/autonomous-project-manager.md': '---\nname: autonomous-project-manager\n---\n# Autonomous Project Manager Mode\n\nMode content here.',
      '/test/templates/starter-packs/essentials/components/modes/engineer.md': '---\nname: engineer\n---\n# Engineer Mode\n\nMode content here.',
      '/test/templates/starter-packs/essentials/components/modes/reviewer.md': '---\nname: reviewer\n---\n# Reviewer Mode\n\nMode content here.',
      
      // Component templates for workflows within the pack
      '/test/templates/starter-packs/essentials/components/workflows/openmemory-setup.md': '---\nname: openmemory-setup\n---\n# OpenMemory Setup Workflow\n\nWorkflow content here.',
      '/test/templates/starter-packs/essentials/components/workflows/review.md': '---\nname: review\n---\n# Review Workflow Template\n\nWorkflow content here.',
      '/test/templates/starter-packs/essentials/components/workflows/summarize.md': '---\nname: summarize\n---\n# Summarize Workflow\n\nWorkflow content here.',
    });

    return fs;
  }

  async function setupPackWithDependencies(): Promise<void> {
    // Setup frontend-react pack that depends on essentials
    const frontendManifest = {
      "name": "frontend-react",
      "version": "1.0.0", 
      "description": "React frontend development pack",
      "author": "zcc",
      "category": "frontend",
      "dependencies": ["essentials"],
      "components": {
        "modes": [
          { "name": "react-developer", "required": true }
        ],
        "workflows": [],
        "agents": []
      }
    };
    
    await mockFs.writeFile(
      '/test/templates/starter-packs/frontend-react/manifest.json',
      JSON.stringify(frontendManifest, null, 2)
    );

    // Add react-developer mode template in pack's components directory
    await mockFs.writeFile(
      '/test/templates/starter-packs/frontend-react/components/modes/react-developer.md',
      `---\nname: react-developer\n---\n# React Developer Mode\n\nReact-specific development mode.`
    );
  }

  async function setupPackWithMissingDependency(): Promise<void> {
    const manifest = {
      "name": "pack-with-missing-dep",
      "version": "1.0.0",
      "description": "Pack with missing dependency",
      "author": "test",
      "category": "test",
      "dependencies": ["non-existent-pack"],
      "components": { "modes": [], "workflows": [], "agents": [] }
    };
    
    await mockFs.writeFile(
      '/test/templates/starter-packs/pack-with-missing-dep/manifest.json',
      JSON.stringify(manifest, null, 2)
    );
  }

  async function setupCircularDependencies(): Promise<void> {
    // Pack A depends on Pack B
    await mockFs.writeFile(
      '/test/templates/starter-packs/pack-a/manifest.json',
      JSON.stringify({
        "name": "pack-a",
        "version": "1.0.0",
        "description": "Pack A",
        "author": "test",
        "category": "general", 
        "dependencies": ["pack-b"],
        "components": { "modes": [], "workflows": [], "agents": [] }
      }, null, 2)
    );
    
    // Create components directory for pack-a (required for discovery)
    await mockFs.writeFile('/test/templates/starter-packs/pack-a/components/.gitkeep', '');

    // Pack B depends on Pack A (circular!)
    await mockFs.writeFile(
      '/test/templates/starter-packs/pack-b/manifest.json',
      JSON.stringify({
        "name": "pack-b", 
        "version": "1.0.0",
        "description": "Pack B",
        "author": "test",
        "category": "general",
        "dependencies": ["pack-a"], 
        "components": { "modes": [], "workflows": [], "agents": [] }
      }, null, 2)
    );
    
    // Create components directory for pack-b (required for discovery)
    await mockFs.writeFile('/test/templates/starter-packs/pack-b/components/.gitkeep', '');
  }

  async function setupComplexDependencyChain(): Promise<void> {
    // Pack B depends on essentials
    await mockFs.writeFile(
      '/test/templates/starter-packs/pack-b/manifest.json',
      JSON.stringify({
        "name": "pack-b",
        "version": "1.0.0",
        "description": "Pack B depends on essentials",
        "author": "test",
        "category": "general",
        "dependencies": ["essentials"],
        "components": { "modes": [], "workflows": [], "agents": [] }
      }, null, 2)
    );
    
    // Create components directory for pack-b
    await mockFs.writeFile('/test/templates/starter-packs/pack-b/components/.gitkeep', '');

    // Pack C depends on Pack B (which depends on essentials)
    await mockFs.writeFile(
      '/test/templates/starter-packs/pack-c/manifest.json',
      JSON.stringify({
        "name": "pack-c",
        "version": "1.0.0", 
        "description": "Pack C depends on Pack B",
        "author": "test",
        "category": "general",
        "dependencies": ["pack-b"],
        "components": { "modes": [], "workflows": [], "agents": [] }
      }, null, 2)
    );
    
    // Create components directory for pack-c
    await mockFs.writeFile('/test/templates/starter-packs/pack-c/components/.gitkeep', '');
  }
});