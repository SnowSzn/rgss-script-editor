import { execSync } from 'child_process';

/**
 * Checks for Wine availability specific for Linux-based systems
 * @returns boolean
 */
export function isWineInstalled(): boolean {
  let isInstalled = false;

  try {
    const stdout = execSync('wine --version').toString() ?? '';
    isInstalled = stdout.startsWith('wine') ? true : false;
  } catch (error: any) {
    isInstalled = false;
  }

  return isInstalled;
}
