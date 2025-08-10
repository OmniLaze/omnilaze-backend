"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let JwtAuthGuard = class JwtAuthGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer '))
            throw new common_1.UnauthorizedException('Missing token');
        const token = auth.slice(7);
        try {
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            req.user = payload;
            return true;
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map