import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  CandidateAuthGuard,
  getCandidateId,
} from '../auth/candidate-auth.guard';
import { CandidatesService } from './candidates.service';
import {
  LoginCandidateDto,
  RegisterCandidateDto,
  UpdateCandidateDto,
} from './dtos/candidate.dto';

const MAX_CV_SIZE = 5 * 1024 * 1024;

@ApiTags('candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un postulante y obtener sesión' })
  @ApiResponse({ status: 201, description: 'Postulante registrado con éxito.' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado.' })
  async register(@Body() dto: RegisterCandidateDto) {
    return this.candidatesService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión de postulante' })
  @ApiResponse({ status: 201, description: 'Sesión iniciada con éxito.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  async login(@Body() dto: LoginCandidateDto) {
    return this.candidatesService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(CandidateAuthGuard)
  @ApiOperation({ summary: 'Obtener el perfil del postulante autenticado' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async getMe(@Req() request: Request) {
    return this.candidatesService.getProfile(getCandidateId(request));
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(CandidateAuthGuard)
  @ApiOperation({ summary: 'Actualizar el perfil del postulante' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async updateMe(@Req() request: Request, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.updateProfile(getCandidateId(request), dto);
  }

  @Post('me/cv')
  @ApiBearerAuth()
  @UseGuards(CandidateAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CV_SIZE },
      fileFilter: (_req: Request, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(
            new BadRequestException('El CV debe ser un archivo PDF'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir o reemplazar el CV (PDF) del postulante' })
  @ApiResponse({ status: 201, description: 'CV subido con éxito.' })
  @ApiResponse({ status: 400, description: 'El CV debe ser un PDF de hasta 5 MB.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async uploadCv(
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo PDF');
    }
    if (!this.isPdf(file.buffer)) {
      throw new BadRequestException('El archivo no es un PDF válido');
    }

    return this.candidatesService.uploadCv(getCandidateId(request), {
      fileName: file.originalname,
      mimeType: 'application/pdf',
      sizeBytes: file.size,
      data: file.buffer,
    });
  }

  @Get('me/cv')
  @ApiBearerAuth()
  @UseGuards(CandidateAuthGuard)
  @ApiOperation({ summary: 'Descargar el CV (PDF) del postulante' })
  @ApiResponse({ status: 200, content: { 'application/pdf': {} } })
  @ApiResponse({ status: 404, description: 'El postulante no tiene CV.' })
  async downloadCv(@Req() request: Request, @Res() res: Response) {
    const cv = await this.candidatesService.getCv(getCandidateId(request));
    if (!cv) {
      throw new NotFoundException('Aún no has adjuntado tu CV');
    }

    res.setHeader('Content-Type', cv.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.sanitizeFileName(cv.fileName)}"`,
    );
    res.setHeader('Content-Length', cv.sizeBytes);
    res.send(cv.data);
  }

  private isPdf(buffer: Buffer): boolean {
    return (
      buffer.length >= 5 &&
      buffer[0] === 0x25 && // '%'
      buffer[1] === 0x50 && // 'P'
      buffer[2] === 0x44 && // 'D'
      buffer[3] === 0x46 && // 'F'
      buffer[4] === 0x2d //  '-'
    );
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/["\r\n]/g, '');
  }
}