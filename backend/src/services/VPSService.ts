import { Client } from 'ssh2';
import { EventEmitter } from 'events';

export interface VPSConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
}

export interface FFmpegConfig {
  streamUrl: string;
  streamKey: string;
  videoPath: string;
  audioPath?: string; // Caminho para arquivo de áudio (música de fundo)
  loop?: boolean;
}

export class VPSService extends EventEmitter {
  private client: Client;
  private config: VPSConfig;
  private isConnected = false;

  constructor(config: VPSConfig) {
    super();
    this.config = config;
    this.client = new Client();
  }

  /**
   * Conecta ao VPS via SSH
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        console.log('✅ Conectado ao VPS via SSH');
        this.isConnected = true;
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('❌ Erro na conexão SSH:', err.message);
        this.isConnected = false;
        this.emit('error', err);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('🔌 Conexão SSH fechada');
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Conectar
      this.client.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        privateKey: this.config.privateKey,
        readyTimeout: 30000
      });
    });
  }

  /**
   * Executa comando no VPS
   */
  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('VPS não está conectado. Execute connect() primeiro.');
    }

    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
          this.emit('stdout', data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
          this.emit('stderr', data.toString());
        });

        stream.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Command failed with code ${code}: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });
      });
    });
  }

  /**
   * Inicia stream do FFmpeg no VPS
   */
  async startFFmpegStream(config: FFmpegConfig): Promise<string> {
    try {
      const fullStreamUrl = `${config.streamUrl}/${config.streamKey}`;
      const loopFlag = config.loop ? '-stream_loop -1' : '';

      let ffmpegCommand: string;

      if (config.audioPath) {
        // Comando com mixagem de áudio (vídeo + música de fundo)
        ffmpegCommand = `
          nohup ffmpeg \\
            ${loopFlag} -re -i "${config.videoPath}" \\
            -stream_loop -1 -i "${config.audioPath}" \\
            -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2[aout]" \\
            -map 0:v -map "[aout]" \\
            -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k \\
            -pix_fmt yuv420p -g 50 \\
            -c:a aac -b:a 128k -ar 44100 \\
            -f flv "${fullStreamUrl}" \\
            > /tmp/ffmpeg_stream.log 2>&1 &
          echo $!
        `.trim().replace(/\s+/g, ' ');
      } else {
        // Comando sem música de fundo (só vídeo)
        ffmpegCommand = `
          nohup ffmpeg \\
            ${loopFlag} \\
            -re -i "${config.videoPath}" \\
            -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k \\
            -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 \\
            -f flv "${fullStreamUrl}" \\
            > /tmp/ffmpeg_stream.log 2>&1 &
          echo $!
        `.trim().replace(/\s+/g, ' ');
      }

      console.log('🎥 Iniciando FFmpeg no VPS...');
      const pid = await this.executeCommand(ffmpegCommand);

      console.log(`✅ FFmpeg iniciado com PID: ${pid.trim()}`);
      return pid.trim();
    } catch (error: any) {
      console.error('❌ Erro ao iniciar FFmpeg:', error.message);
      throw new Error(`Falha ao iniciar FFmpeg: ${error.message}`);
    }
  }

  /**
   * Para o processo FFmpeg
   */
  async stopFFmpegStream(pid: string): Promise<void> {
    try {
      console.log(`🛑 Parando FFmpeg (PID: ${pid})...`);
      await this.executeCommand(`kill -9 ${pid}`);
      console.log('✅ FFmpeg parado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao parar FFmpeg:', error.message);
      throw new Error(`Falha ao parar FFmpeg: ${error.message}`);
    }
  }

  /**
   * Verifica se FFmpeg está rodando
   */
  async checkFFmpegStatus(pid: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(`ps -p ${pid} -o comm=`);
      return result.includes('ffmpeg');
    } catch {
      return false;
    }
  }

  /**
   * Lista arquivos de vídeo no VPS
   */
  async listVideoFiles(directory: string = '/root/videos'): Promise<string[]> {
    try {
      const result = await this.executeCommand(`ls -1 ${directory}/*.mp4 2>/dev/null || echo ""`);
      return result.trim().split('\n').filter(line => line.length > 0);
    } catch (error: any) {
      console.error('Erro ao listar vídeos:', error.message);
      return [];
    }
  }

  /**
   * Cria shell interativo (para terminal web)
   */
  createInteractiveShell(onData: (data: string) => void, onClose: () => void) {
    if (!this.isConnected) {
      throw new Error('VPS não está conectado');
    }

    this.client.shell((err, stream) => {
      if (err) {
        console.error('Erro ao criar shell:', err);
        return;
      }

      stream.on('data', (data: Buffer) => {
        onData(data.toString());
      });

      stream.on('close', () => {
        console.log('Shell fechado');
        onClose();
      });

      // Retorna função para enviar comandos
      this.emit('shell-ready', (command: string) => {
        stream.write(command);
      });
    });
  }

  /**
   * Desconecta do VPS
   */
  disconnect() {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 Desconectado do VPS');
    }
  }

  /**
   * Verifica status da conexão
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
