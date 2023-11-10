/**
 * Ruby Game Scripting System script class
 */
export class Script {
  /**
   * Script unique section number
   */
  private section: number;
  /**
   * Script name
   */
  private name: string;
  /**
   * Script code
   */
  private code: Uint8Array;

  constructor(buffer: Buffer) {
    this.section = 1;
    this.name = '';
    this.code = new Uint8Array();
  }
}
