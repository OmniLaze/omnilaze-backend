"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
let AppController = class AppController {
    getRoot(res) {
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
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getRoot", null);
__decorate([
    (0, common_1.Get)('/test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getTest", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map