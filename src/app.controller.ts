import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getRoot(@Res() res: Response) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OmniLaze Backend API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .header { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .link { display: block; margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #007bff; text-decoration: none; color: #007bff; }
          .link:hover { background: #e9ecef; }
          .status { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1 class="header">🍃 OmniLaze Backend API</h1>
        <p class="status">✅ Server is running successfully!</p>
        <h2>Available Endpoints:</h2>
        <a href="https://backend.omnilaze.co/docs" class="link">📚 API Documentation (Swagger)</a>
        <a href="https://backend.omnilaze.co/v1/health" class="link">💓 Health Check</a>
        <div>
          <h2>Environment Info:</h2>
          <ul>
            <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            <li><strong>Version:</strong> 1.0.0</li>
          </ul>
        </div>
      </body>
      </html>
    `);
  }

  @Get('/test')
  getTest() {
    return {
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      endpoints: {
        docs: 'https://backend.omnilaze.co/docs',
        health: 'https://backend.omnilaze.co/v1/health',
        auth: 'https://backend.omnilaze.co/v1/auth/*',
        orders: 'https://backend.omnilaze.co/v1/orders/*',
        payments: 'https://backend.omnilaze.co/v1/payments/*'
      }
    };
  }
}