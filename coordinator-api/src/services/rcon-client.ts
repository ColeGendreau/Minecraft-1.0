/**
 * RCON Client for Minecraft Server Communication
 * 
 * Implements the Source RCON Protocol for sending commands to Minecraft
 * via WorldEdit and receiving responses.
 */

import { Socket } from 'net';

// RCON packet types
const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_RESPONSE_VALUE = 0;

interface RconConfig {
  host: string;
  port: number;
  password: string;
  timeout?: number;
}

interface RconPacket {
  id: number;
  type: number;
  body: string;
}

/**
 * RCON Client for Minecraft server communication
 */
export class RconClient {
  private config: RconConfig;
  private socket: Socket | null = null;
  private authenticated = false;
  private packetId = 0;
  private pendingCallbacks: Map<number, { resolve: (value: string) => void; reject: (error: Error) => void }> = new Map();
  private buffer: Buffer = Buffer.alloc(0);

  constructor(config: RconConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  /**
   * Connect to the RCON server and authenticate
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`RCON connection timeout after ${this.config.timeout}ms`));
        this.disconnect();
      }, this.config.timeout);

      this.socket = new Socket();
      
      this.socket.on('data', (data) => this.handleData(data));
      
      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`RCON connection error: ${err.message}`));
      });

      this.socket.on('close', () => {
        this.authenticated = false;
        this.socket = null;
      });

      this.socket.connect(this.config.port, this.config.host, async () => {
        try {
          await this.authenticate();
          clearTimeout(timeout);
          resolve();
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  /**
   * Disconnect from the RCON server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.authenticated = false;
    this.pendingCallbacks.clear();
  }

  /**
   * Send a command to the Minecraft server
   */
  async send(command: string): Promise<string> {
    if (!this.socket || !this.authenticated) {
      throw new Error('RCON client not connected or authenticated');
    }

    return new Promise((resolve, reject) => {
      const id = this.getNextPacketId();
      const timeout = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        reject(new Error(`Command timeout: ${command}`));
      }, this.config.timeout);

      this.pendingCallbacks.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.sendPacket(id, SERVERDATA_EXECCOMMAND, command);
    });
  }

  /**
   * Send a WorldEdit command (automatically prefixes with /)
   */
  async sendWorldEdit(command: string): Promise<string> {
    // Ensure the command starts with /
    const fullCommand = command.startsWith('/') ? command : `/${command}`;
    return this.send(fullCommand);
  }

  /**
   * Execute multiple commands in sequence with optional delays
   */
  async sendSequence(commands: Array<{ command: string; delayMs?: number }>): Promise<string[]> {
    const results: string[] = [];
    
    for (const { command, delayMs } of commands) {
      if (delayMs && delayMs > 0) {
        await this.delay(delayMs);
      }
      const result = await this.sendWorldEdit(command);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.socket !== null && this.authenticated;
  }

  // Private methods

  private async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.getNextPacketId();
      
      this.pendingCallbacks.set(id, {
        resolve: () => {
          this.authenticated = true;
          resolve();
        },
        reject: (error) => {
          this.authenticated = false;
          reject(error);
        },
      });

      this.sendPacket(id, SERVERDATA_AUTH, this.config.password);
    });
  }

  private sendPacket(id: number, type: number, body: string): void {
    if (!this.socket) return;

    const bodyBuffer = Buffer.from(body, 'utf8');
    const packetSize = 4 + 4 + bodyBuffer.length + 2; // id + type + body + null terminators
    
    const packet = Buffer.alloc(4 + packetSize);
    let offset = 0;
    
    // Size (excluding size field itself)
    packet.writeInt32LE(packetSize, offset);
    offset += 4;
    
    // Request ID
    packet.writeInt32LE(id, offset);
    offset += 4;
    
    // Type
    packet.writeInt32LE(type, offset);
    offset += 4;
    
    // Body
    bodyBuffer.copy(packet, offset);
    offset += bodyBuffer.length;
    
    // Null terminators
    packet.writeInt8(0, offset);
    packet.writeInt8(0, offset + 1);
    
    this.socket.write(packet);
  }

  private handleData(data: Buffer): void {
    // Append to buffer
    this.buffer = Buffer.concat([this.buffer, data]);
    
    // Process complete packets
    while (this.buffer.length >= 4) {
      const packetSize = this.buffer.readInt32LE(0);
      const totalSize = packetSize + 4;
      
      if (this.buffer.length < totalSize) {
        // Incomplete packet, wait for more data
        break;
      }
      
      // Extract packet
      const packet = this.parsePacket(this.buffer.subarray(0, totalSize));
      this.buffer = this.buffer.subarray(totalSize);
      
      if (packet) {
        this.handlePacket(packet);
      }
    }
  }

  private parsePacket(data: Buffer): RconPacket | null {
    if (data.length < 14) return null;
    
    const size = data.readInt32LE(0);
    const id = data.readInt32LE(4);
    const type = data.readInt32LE(8);
    
    // Body is everything between type and the two null terminators
    const bodyEnd = 4 + size - 2;
    const body = data.subarray(12, bodyEnd).toString('utf8');
    
    return { id, type, body };
  }

  private handlePacket(packet: RconPacket): void {
    const callback = this.pendingCallbacks.get(packet.id);
    
    if (!callback) {
      // Auth response might have a different ID
      if (packet.type === SERVERDATA_AUTH_RESPONSE) {
        // Check for auth failure (id = -1)
        if (packet.id === -1) {
          const authCallback = this.pendingCallbacks.values().next().value;
          if (authCallback) {
            authCallback.reject(new Error('RCON authentication failed - invalid password'));
          }
        }
      }
      return;
    }
    
    this.pendingCallbacks.delete(packet.id);
    
    if (packet.type === SERVERDATA_AUTH_RESPONSE) {
      if (packet.id === -1) {
        callback.reject(new Error('RCON authentication failed - invalid password'));
      } else {
        callback.resolve(packet.body);
      }
    } else if (packet.type === SERVERDATA_RESPONSE_VALUE) {
      callback.resolve(packet.body);
    }
  }

  private getNextPacketId(): number {
    this.packetId = (this.packetId + 1) % 0x7FFFFFFF;
    return this.packetId;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for the Minecraft server
let rconInstance: RconClient | null = null;

/**
 * Get or create the RCON client instance
 */
export function getRconClient(): RconClient {
  if (!rconInstance) {
    rconInstance = new RconClient({
      host: process.env.MINECRAFT_RCON_HOST || 'minecraft-minecraft.minecraft.svc.cluster.local',
      port: parseInt(process.env.MINECRAFT_RCON_PORT || '25575', 10),
      password: process.env.MINECRAFT_RCON_PASSWORD || 'worldforge-rcon-2024',
      timeout: parseInt(process.env.MINECRAFT_RCON_TIMEOUT || '30000', 10),
    });
  }
  return rconInstance;
}

/**
 * Execute a single command, handling connection lifecycle
 */
export async function executeRconCommand(command: string): Promise<string> {
  const client = getRconClient();
  
  if (!client.isConnected()) {
    await client.connect();
  }
  
  return client.sendWorldEdit(command);
}

/**
 * Execute multiple commands with automatic reconnection
 */
export async function executeRconCommands(
  commands: Array<{ command: string; delayMs?: number; optional?: boolean }>
): Promise<{ results: string[]; errors: string[] }> {
  const client = getRconClient();
  const results: string[] = [];
  const errors: string[] = [];
  
  if (!client.isConnected()) {
    await client.connect();
  }
  
  for (const { command, delayMs, optional } of commands) {
    try {
      if (delayMs && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      const result = await client.sendWorldEdit(command);
      results.push(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Command failed: ${command} - ${errorMsg}`);
      
      if (!optional) {
        // For non-optional commands, try to reconnect and continue
        try {
          client.disconnect();
          await client.connect();
        } catch {
          // If reconnection fails, stop execution
          break;
        }
      }
    }
  }
  
  return { results, errors };
}

