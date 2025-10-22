from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess

app = Flask(__name__)
# Habilita o CORS para permitir requisições do seu painel web
CORS(app)

# !!! IMPORTANTE !!!
# Altere esta chave para uma senha longa e secreta.
# Esta chave DEVE ser a mesma que você configurar no painel web.
SECRET_KEY = "ALTERE-PARA-UMA-SENHA-MUITO-SECRETA"
SERVICE_NAME = "youtube-live.service"

@app.before_request
def check_secret_key():
    # Rotas que não precisam de autenticação
    if request.path == '/health':
        return
    
    key = request.headers.get('x-secret-key')
    if not key or key != SECRET_KEY:
        return jsonify({"error": "Acesso negado: chave secreta inválida."}), 403

def run_command(command):
    """Executa um comando systemctl e retorna o resultado."""
    try:
        # Usamos subprocess.run para executar comandos do sistema
        result = subprocess.run(
            ['systemctl', command, SERVICE_NAME],
            capture_output=True,
            text=True,
            check=False # Não lança exceção se o comando falhar
        )
        if result.returncode != 0:
            return {"error": f"Erro ao executar o comando: {result.stderr.strip()}"}, 500
        return {"message": f"Serviço '{SERVICE_NAME}' executou '{command}' com sucesso."}, 200
    except FileNotFoundError:
        return {"error": "Comando 'systemctl' não encontrado. Esta API deve rodar em um sistema com systemd."}, 500
    except Exception as e:
        return {"error": f"Erro inesperado no servidor: {str(e)}"}, 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se a API está no ar."""
    return jsonify({"status": "API está online"}), 200
    
@app.route('/start', methods=['POST'])
def start_service():
    """Inicia o serviço da live."""
    result, status_code = run_command('start')
    return jsonify(result), status_code

@app.route('/stop', methods=['POST'])
def stop_service():
    """Para o serviço da live."""
    result, status_code = run_command('stop')
    return jsonify(result), status_code

@app.route('/restart', methods=['POST'])
def restart_service():
    """Reinicia o serviço da live."""
    result, status_code = run_command('restart')
    return jsonify(result), status_code

@app.route('/status', methods=['GET'])
def get_status():
    """Verifica o status do serviço da live."""
    try:
        # O comando 'is-active' é mais direto para checar o status
        result = subprocess.run(
            ['systemctl', 'is-active', SERVICE_NAME],
            capture_output=True,
            text=True,
            check=False
        )
        # Se a saída for 'active', o serviço está rodando
        is_active = result.stdout.strip() == 'active'
        return jsonify({"active": is_active}), 200
    except Exception as e:
        return jsonify({"error": f"Erro ao verificar status: {str(e)}", "active": False}), 500

if __name__ == '__main__':
    # Roda a API na porta 5000, acessível de qualquer IP
    app.run(host='0.0.0.0', port=5000)
