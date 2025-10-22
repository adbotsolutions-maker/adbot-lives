import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    username: string;
  };
}

// Middleware de autenticação básica
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const isAuthenticated = (req.session as any)?.authenticated;
  
  console.log('🔒 Auth middleware check:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    authenticated: isAuthenticated,
    sessionData: req.session,
    cookies: req.headers.cookie
  });
  
  if (!isAuthenticated) {
    console.log('❌ Authentication failed for:', req.path);
    return res.status(401).json({ 
      error: 'Unauthorized - Please login first',
      sessionID: req.sessionID,
      hasSession: !!req.session,
      hasCookie: !!req.headers.cookie
    });
  }
  
  next();
}

// Verificar credenciais das variáveis de ambiente
export function checkCredentials(username: string, password: string): boolean {
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  return username === validUsername && password === validPassword;
}
