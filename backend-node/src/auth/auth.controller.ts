import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate an administrator' })
  @ApiResponse({ status: 200, description: 'A short-lived bearer token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() input: LoginDto): Promise<LoginResult> {
    return this.authService.login(input);
  }
}
