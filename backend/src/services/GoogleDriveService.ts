import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Client } from 'ssh2';
import { pipeline } from 'stream/promises';

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;
  private drive: drive_v3.Drive;

  constructor(oauth2Client: OAuth2Client) {
    this.oauth2Client = oauth2Client;
    this.drive = google.drive({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  /**
   * Lista arquivos de vídeo no Google Drive
   */
  async listVideos(maxResults: number = 20) {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1jABnVVpYT3IVR6O3XMYy6luRNkefkLVE';
      const response = await this.drive.files.list({
        q: `mimeType contains 'video/' and trashed=false and '${folderId}' in parents`,
        fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webViewLink)',
        pageSize: maxResults,
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error: any) {
      console.error('Erro ao listar vídeos do Drive:', error.message);
      throw new Error(`Google Drive Error: ${error.message}`);
    }
  }

  /**
   * Lista arquivos de áudio no Google Drive
   */
  async listAudio(maxResults: number = 20) {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1jABnVVpYT3IVR6O3XMYy6luRNkefkLVE';
      const response = await this.drive.files.list({
        q: `mimeType contains 'audio/' and trashed=false and '${folderId}' in parents`,
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
        pageSize: maxResults,
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error: any) {
      console.error('Erro ao listar áudios do Drive:', error.message);
      throw new Error(`Google Drive Error: ${error.message}`);
    }
  }

  /**
   * Baixa um arquivo do Google Drive
   */
  async downloadFile(fileId: string): Promise<NodeJS.ReadableStream> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return response.data as any;
    } catch (error: any) {
      console.error('Erro ao baixar arquivo do Drive:', error.message);
      throw new Error(`Google Drive Error: ${error.message}`);
    }
  }

  /**
   * Obtém metadados de um arquivo
   */
  async getFileMetadata(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, webViewLink'
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter metadados do Drive:', error.message);
      throw new Error(`Google Drive Error: ${error.message}`);
    }
  }

  /**
   * Busca arquivos por nome
   */
  async searchFiles(query: string, mimeTypePrefix?: string) {
    try {
      let q = `name contains '${query}' and trashed=false`;
      if (mimeTypePrefix) {
        q += ` and mimeType contains '${mimeTypePrefix}'`;
      }

      const response = await this.drive.files.list({
        q,
        fields: 'files(id, name, mimeType, size, thumbnailLink, webViewLink)',
        pageSize: 50
      });

      return response.data.files || [];
    } catch (error: any) {
      console.error('Erro ao buscar arquivos no Drive:', error.message);
      throw new Error(`Google Drive Error: ${error.message}`);
    }
  }

  /**
   * Baixa arquivo do Google Drive diretamente para o VPS via SSH
   * Usa a API do Drive com OAuth para fazer o download correto
   */
  async downloadFileToVPS(
    fileId: string,
    destinationPath: string,
    sshClient: Client
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`📥 Iniciando download do arquivo ${fileId} via Google Drive API...`);
        
        // Obter metadata do arquivo
        const metadata = await this.getFileMetadata(fileId);
        console.log(`📄 Arquivo: ${metadata.name} (${this.formatBytes(parseInt(metadata.size || '0'))})`);

        // Baixar arquivo do Drive como stream
        const response = await this.drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        const driveStream = response.data as any;

        // Criar arquivo no VPS via SFTP
        sshClient.sftp((err, sftp) => {
          if (err) {
            console.error('❌ Erro ao criar conexão SFTP:', err);
            reject(err);
            return;
          }

          console.log(`📤 Transferindo para VPS: ${destinationPath}`);
          
          const writeStream = sftp.createWriteStream(destinationPath);
          
          let bytesDownloaded = 0;
          const totalBytes = parseInt(metadata.size || '0');

          driveStream.on('data', (chunk: Buffer) => {
            bytesDownloaded += chunk.length;
            const progress = totalBytes > 0 
              ? ((bytesDownloaded / totalBytes) * 100).toFixed(1)
              : '?';
            process.stdout.write(`\r📊 Progresso: ${this.formatBytes(bytesDownloaded)}/${this.formatBytes(totalBytes)} (${progress}%)`);
          });

          driveStream.on('error', (error: Error) => {
            console.error('\n❌ Erro no stream do Drive:', error);
            writeStream.end();
            reject(error);
          });

          writeStream.on('error', (error: Error) => {
            console.error('\n❌ Erro ao escrever no VPS:', error);
            reject(error);
          });

          writeStream.on('close', () => {
            console.log('\n✅ Download concluído com sucesso!');
            resolve();
          });

          driveStream.pipe(writeStream);
        });
      } catch (error: any) {
        console.error('❌ Erro ao baixar arquivo:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Formata bytes em formato legível
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
