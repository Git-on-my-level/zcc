import { Command } from "commander";
import { DirectoryManager } from "../lib/directoryManager";
import { HookManager } from "../lib/hooks/HookManager";
import { CommandGenerator } from "../lib/commandGenerator";
import { InteractiveSetup } from "../lib/interactiveSetup";
import { StarterPackManager } from "../lib/StarterPackManager";
import { logger } from "../lib/logger";
import { isForce } from "../lib/context";


export const initCommand = new Command("init")
  .description("Initialize zcc in the current project or globally")
  .option("-f, --force", "Force initialization even if .zcc already exists")
  .option("--global", "Initialize global ~/.zcc configuration instead of project")
  .option("-g, --gitignore", "Add .zcc/ to .gitignore (defaults to false)")
  .option("-p, --pack [name]", "Install a specific starter pack (headless) or open pack picker")
  .action(async (options) => {
    try {
      // Resolve force flag from both local options and global context
      const forceFlag = options.force || isForce();
      
      // Handle global initialization
      if (options.global) {
        const { initializeGlobal } = await import("../lib/globalInit");
        
        // If a pack is provided, run non-interactively
        const isPackProvided = options.pack && typeof options.pack === 'string';
        
        await initializeGlobal({
          force: forceFlag,
          interactive: !isPackProvided
        });
        
        // If pack was provided, install it to global scope
        if (isPackProvided) {
          logger.space();
          logger.info(`Installing starter pack to global scope: ${options.pack}...`);
          
          // Use global path for StarterPackManager
          const os = await import("os");
          const globalRoot = process.env.HOME || os.homedir();
          const globalStarterPackManager = new StarterPackManager(globalRoot);
          
          const packResult = await globalStarterPackManager.installPack(options.pack, {
            force: forceFlag,
            interactive: false
          });
          
          if (!packResult.success) {
            logger.error("Global starter pack installation failed:");
            packResult.errors.forEach(error => logger.error(`  ${error}`));
            process.exitCode = 1;
            return;
          }
          
          logger.success(`Starter pack '${options.pack}' installed successfully to global scope`);
          
          if (packResult.postInstallMessage) {
            logger.space();
            logger.info("Starter Pack Information:");
            logger.info(packResult.postInstallMessage);
          }
          
          logger.space();
          logger.success("Global zcc with starter pack initialized successfully!");
          logger.space();
          logger.info("To use with Claude Code:");
          logger.info(
            '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
          );
          logger.info('  - Say "workflow: [name]" to execute a workflow');
          logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
          logger.space();
          logger.info('Run "zcc --help" to see all available commands.');
          logger.info('Global configuration is now active for all your projects.');
        }
        
        return;
      }

      
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const hookManager = new HookManager(projectRoot);
      const commandGenerator = new CommandGenerator(projectRoot);
      const starterPackManager = new StarterPackManager(projectRoot);
      // const componentInstaller = new ComponentInstaller(projectRoot); // Not used in pack-based setup

      // Check if already initialized
      if (dirManager.isInitialized() && !forceFlag) {
        logger.warn("zcc is already initialized in this project.");
        logger.info("Use --force to reinitialize.");
        return;
      }

      
      // Initialize directory structure
      logger.info("Initializing zcc...");
      await dirManager.initializeStructure(forceFlag);

      

      
      // Handle pack installation if specified
      if (options.pack && typeof options.pack === 'string') {
        // Headless pack installation with specific pack name
        logger.info(`Installing starter pack: ${options.pack}`);
        const packResult = await starterPackManager.installPack(options.pack, { 
          force: forceFlag,
          interactive: false 
        });
        
        if (!packResult.success) {
          logger.error("Starter pack installation failed:");
          packResult.errors.forEach(error => logger.error(`  ${error}`));
          process.exitCode = 1;
          return;
        }
        
        logger.success(`Starter pack '${options.pack}' installed successfully`);
        
        // Generate hook infrastructure
        logger.space();
        logger.info("Generating Claude Code hook infrastructure...");
        await hookManager.initialize();

        // Generate custom commands
        logger.info("Generating Claude Code custom commands...");
        await commandGenerator.initialize();

        // Update .gitignore if requested and not global
        if (options.gitignore) {
          await dirManager.ensureGitignore();
        }

        logger.space();
        logger.success("zcc initialized successfully!");
        logger.space();
        logger.info("To use with Claude Code:");
        logger.info(
          '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
        );
        logger.info('  - Say "workflow: [name]" to execute a workflow');
        logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
        if (packResult.postInstallMessage) {
          logger.space();
          logger.info("Starter Pack Information:");
          logger.info(packResult.postInstallMessage);
        }
        logger.space();
        logger.info('Run "zcc --help" to see all available commands.');
        logger.info('Run "zcc hook list" to see installed hooks.');
        return;
      }
      
      // If --pack flag is present without value, or no pack flag at all, run interactive setup
      

      // Run interactive setup
      const interactiveSetup = new InteractiveSetup(projectRoot);
      const setupOptions = await interactiveSetup.run();

      // Handle global installation scope
      if (setupOptions.installScope === 'global') {
        const { initializeGlobal } = await import("../lib/globalInit");
        
        // Initialize global zcc with pack installation if selected
        await initializeGlobal({
          force: forceFlag,
          interactive: false, // We already collected the options
          defaultMode: setupOptions.defaultMode,
          installExamples: false // Don't install examples, we'll install the selected pack
        });
        
        // If a pack was selected, install it to global scope
        if (setupOptions.selectedPack) {
          logger.space();
          logger.info(`Installing starter pack to global scope: ${setupOptions.selectedPack}...`);
          
          // Use global path for StarterPackManager
          const os = await import("os");
          const globalRoot = process.env.HOME || os.homedir();
          const globalStarterPackManager = new StarterPackManager(globalRoot);
          
          const packResult = await globalStarterPackManager.installPack(setupOptions.selectedPack, {
            force: forceFlag,
            interactive: false
          });
          
          if (!packResult.success) {
            logger.error("Global starter pack installation failed:");
            packResult.errors.forEach(error => logger.error(`  ${error}`));
            process.exitCode = 1;
            return;
          }
          
          logger.success(`Starter pack '${setupOptions.selectedPack}' installed successfully to global scope`);
          
          if (packResult.postInstallMessage) {
            logger.space();
            logger.info("Starter Pack Information:");
            logger.info(packResult.postInstallMessage);
          }
        }
        
        logger.space();
        logger.success("Global zcc initialized successfully!");
        logger.space();
        logger.info("To use with Claude Code:");
        logger.info(
          '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
        );
        logger.info('  - Say "workflow: [name]" to execute a workflow');
        logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
        if (setupOptions.defaultMode) {
          logger.info(
            `  - Default mode "${setupOptions.defaultMode}" will be used when no mode is specified`
          );
        }
        logger.space();
        logger.info('Run "zcc --help" to see all available commands.');
        logger.info('Global configuration is now active for all your projects.');
        return;
      }

      // Update .gitignore if requested (only for project installations)
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }

      // Apply setup (install pack and save config)
      const shouldApplySetup = (
        setupOptions.selectedPack ||
        setupOptions.defaultMode
      );
      
      if (shouldApplySetup) {
        logger.space();
        if (setupOptions.selectedPack) {
          logger.info(`Installing starter pack: ${setupOptions.selectedPack}...`);
        } else {
          logger.info("Installing selected components...");
        }
        await interactiveSetup.applySetup({
          ...setupOptions,
          force: forceFlag,
        });
      }

      // Generate hook infrastructure
      logger.space();
      logger.info("Generating Claude Code hook infrastructure...");
      await hookManager.initialize();

      // Generate custom commands
      logger.info("Generating Claude Code custom commands...");
      await commandGenerator.initialize();

      logger.space();
      logger.success("zcc initialized successfully!");
      logger.space();
      logger.info("To use with Claude Code:");
      logger.info(
        '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
      );
      logger.info('  - Say "workflow: [name]" to execute a workflow');
      logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
      if (setupOptions.defaultMode) {
        logger.info(
          `  - Default mode "${setupOptions.defaultMode}" will be used when no mode is specified`
        );
      }
      logger.space();
      logger.info('Run "zcc --help" to see all available commands.');
      logger.info('Run "zcc hook list" to see installed hooks.');
    } catch (error) {
      logger.error("Failed to initialize zcc:", error);
      process.exitCode = 1;
      return;
    }
  });

