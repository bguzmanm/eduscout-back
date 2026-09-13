import {
  Controller,
  Post,
  Body,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '../../common/decorators/api-wrapped-response.decorator';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autenticar administrador y obtener token' })
  @ApiWrappedResponse(LoginResponseDto, 200, 'Sesión iniciada con éxito.')
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.password);
  }
}