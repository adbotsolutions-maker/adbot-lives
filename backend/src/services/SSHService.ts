import { Client } from 'ssh2';
import { EventEmitter } from 'events';

export interface SSHCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
}

export class SSHService extends EventEmitter {
  private client: Client | null = null;
  private credentials: SSHCredentials;
  private connected: boolean = false;

  constructor(credentials: SSHCredentials) {
    super();
    this.credentials = credentials;
  }

  // Conectar ao VPS
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client.on('ready', () => {
        console.log('✅ SSH Connection established');
        this.connected = true;
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('❌ SSH Connection error:', err);
        this.connected = false;
        this.emit('error', err);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('🔌 SSH Connection closed');
        this.connected = false;
        this.emit('disconnected');
      });

      // Conectar
      const config: any = {
        host: this.credentials.host,
        port: this.credentials.port,
        username: this.credentials.username,
        readyTimeout: 10000
      };

      if (this.credentials.privateKey) {
        config.privateKey = this.credentials.privateKey;
      } else if (this.credentials.password) {
        config.password = this.credentials.password;
      }

      this.client.connect(config);
    });
  }

  // Executar comando
  async executeCommand(command: string): Promise<string> {
    if (!this.client || !this.connected) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
          this.emit('stdout', data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
          this.emit('stderr', data.toString());
        });
      });
    });
  }

  // Iniciar FFmpeg para stream
  async startFFmpegStream(
    videoPath: string,
    streamKey: string,
    rtmpUrl: string
  ): Promise<void> {
    const command = `
      nohup ffmpeg -re -i "${videoPath}" \\
        -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k \\
        -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 \\
        -f flv "${rtmpUrl}/${streamKey}" \\
        > /tmp/ffmpeg_stream.log 2>&1 &
    `;

    await this.executeCommand(command);
    console.log('✅ FFmpeg stream started');
  }

  // Parar FFmpeg
  async stopFFmpegStream(): Promise<void> {
    await this.executeCommand('pkill -f ffmpeg');
    console.log('🛑 FFmpeg stream stopped');
  }

  // Verificar status do FFmpeg
  async checkFFmpegStatus(): Promise<boolean> {
    try {
      const result = await this.executeCommand('pgrep -f ffmpeg');
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  // Obter logs do FFmpeg
  async getFFmpegLogs(lines: number = 50): Promise<string> {
    try {
      return await this.executeCommand(`tail -n ${lines} /tmp/ffmpeg_stream.log`);
    } catch (error: any) {
      return `Error reading logs: ${error.message}`;
    }
  }

  // Criar shell interativo
  async createShell(onData: (data: string) => void, onError: (err: Error) => void): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.shell((err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (data: Buffer) => {
          onData(data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          onError(new Error(data.toString()));
        });

        resolve(stream);
      });
    });
  }

  // Desconectar
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.connected = false;
    }
  }

  // Verificar se está conectado
  isConnected(): boolean {
    return this.connected;
  }
}
