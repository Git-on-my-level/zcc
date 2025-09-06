import inquirer from 'inquirer';
import { ConfigManager } from './configManager';
import { logger } from './logger';
import { StarterPackManager } from './StarterPackManager';
import { FileSystemAdapter, NodeFileSystemAdapter } from './adapters';

export interface SetupOptions {
  selectedPack?: string;
  installScope?: 'global' | 'project';
  defaultMode?: string;
  force?: boolean;
  addToGitignore?: boolean;
}

export class InteractiveSetup {
  private configManager: ConfigManager;
  private starterPackManager: StarterPackManager;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.configManager = new ConfigManager(projectRoot, this.fs);
    this.starterPackManager = new StarterPackManager(projectRoot, this.fs);
  }

  /**
   * Run interactive setup flow
   */
  async run(): Promise<SetupOptions> {
    logger.space();
    logger.info('🚀 Welcome to zcc Interactive Setup!');
    logger.space();

    // Select starter pack
    const selectedPack = await this.selectStarterPack();

    // Select installation scope
    const installScope = await this.selectInstallScope();

    // Ask about gitignore only if installing for current project
    let addToGitignore = false;
    if (installScope === 'project') {
      addToGitignore = await this.askGitignoreOption();
    }

    // Get default mode from pack (if applicable)
    let defaultMode: string | undefined;
    if (selectedPack && selectedPack !== 'empty') {
      defaultMode = await this.getPackDefaultMode(selectedPack);
    }

    // Show summary and confirm
    const confirmed = await this.confirmSetup({
      selectedPack,
      installScope,
      defaultMode,
      addToGitignore
    });

    if (!confirmed) {
      throw new Error('Setup cancelled by user');
    }

    return {
      selectedPack,
      installScope,
      defaultMode,
      addToGitignore
    };
  }


  /**
   * Select starter pack to install
   */
  private async selectStarterPack(): Promise<string | undefined> {
    try {
      // Get available starter packs
      const availablePacks = await this.starterPackManager.listPacks();
      
      // Create choices with descriptions
      const choices = [
        {
          name: 'Empty (no defaults) - Minimal setup with no pre-selected components',
          value: 'empty'
        },
        ...availablePacks.map(pack => ({
          name: `${pack.manifest.name} - ${pack.manifest.description}`,
          value: pack.manifest.name
        }))
      ];

      const { selectedPack } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedPack',
          message: 'Choose a starter pack:',
          choices,
          default: 'essentials'
        }
      ]);

      return selectedPack === 'empty' ? undefined : selectedPack;
    } catch (error) {
      logger.warn(`Failed to load starter packs: ${error}`);
      logger.info('Proceeding with empty setup...');
      return undefined;
    }
  }

  /**
   * Select installation scope (global or project)
   */
  private async selectInstallScope(): Promise<'global' | 'project'> {
    const { installScope } = await inquirer.prompt([
      {
        type: 'list',
        name: 'installScope',
        message: 'Where would you like to install zcc?',
        choices: [
          {
            name: 'Current project only - Install in .zcc/ directory for this project',
            value: 'project'
          },
          {
            name: 'Global installation - Install in ~/.zcc/ for all projects',
            value: 'global'
          }
        ],
        default: 'project'
      }
    ]);

    return installScope;
  }

  /**
   * Get default mode from selected pack
   */
  private async getPackDefaultMode(packName: string): Promise<string | undefined> {
    try {
      const pack = await this.starterPackManager.loadPack(packName);
      return pack.manifest.configuration?.defaultMode;
    } catch (error) {
      logger.warn(`Failed to get default mode from pack '${packName}': ${error}`);
      return undefined;
    }
  }


  /**
   * Ask about gitignore option
   */
  private async askGitignoreOption(): Promise<boolean> {
    const { addToGitignore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addToGitignore',
        message: 'Add .zcc/ to .gitignore?',
        default: false
      }
    ]);

    return addToGitignore;
  }


  /**
   * Show setup summary and confirm
   */
  private async confirmSetup(options: SetupOptions): Promise<boolean> {
    logger.space();
    logger.info('📋 Setup Summary:');
    logger.space();
    
    if (options.selectedPack) {
      logger.info(`Starter Pack: ${options.selectedPack}`);
    } else {
      logger.info('Starter Pack: Empty (no defaults)');
    }
    
    logger.info(`Installation Scope: ${options.installScope === 'global' ? 'Global (~/.zcc/)' : 'Project (.zcc/)'}`);
    
    if (options.defaultMode) {
      logger.info(`Default Mode: ${options.defaultMode}`);
    }
    
    if (options.installScope === 'project') {
      logger.info(`Add to .gitignore: ${options.addToGitignore ? 'Yes' : 'No'}`);
    }
    
    logger.space();

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with this configuration?',
        default: true
      }
    ]);

    return confirmed;
  }


  /**
   * Apply setup options (install pack and save config)
   */
  async applySetup(options: SetupOptions): Promise<void> {
    // Install starter pack if selected
    if (options.selectedPack) {
      logger.info(`Installing starter pack: ${options.selectedPack}...`);
      const installResult = await this.starterPackManager.installPack(options.selectedPack, {
        force: options.force
      });

      if (!installResult.success) {
        throw new Error(`Failed to install starter pack: ${installResult.errors.join(', ')}`);
      }

      logger.success(`Successfully installed starter pack: ${options.selectedPack}`);
      
      // Show installed components
      const { installed } = installResult;
      if (installed.modes.length > 0) {
        logger.info(`Modes: ${installed.modes.join(', ')}`);
      }
      if (installed.workflows.length > 0) {
        logger.info(`Workflows: ${installed.workflows.join(', ')}`);
      }
      if (installed.agents.length > 0) {
        logger.info(`Agents: ${installed.agents.join(', ')}`);
      }
      if (installed.hooks.length > 0) {
        logger.info(`Hooks: ${installed.hooks.join(', ')}`);
      }
    }

    // Save configuration
    if (options.defaultMode || options.selectedPack) {
      const config: any = {};
      
      if (options.defaultMode) {
        config.defaultMode = options.defaultMode;
      }
      
      if (options.selectedPack) {
        config.installedPack = options.selectedPack;
      }
      
      if (options.installScope) {
        config.installScope = options.installScope;
      }
      
      await this.configManager.save(config);
    }
  }
}