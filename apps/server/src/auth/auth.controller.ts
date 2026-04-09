import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { ActivateDto } from './dto/activate.dto'
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface'

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('device')
  @Throttle({ device: {} })
  @HttpCode(HttpStatus.OK)
  async deviceCode() {
    return this.authService.createDeviceCode()
  }

  @Post('token')
  @Throttle({ token: {} })
  @HttpCode(HttpStatus.OK)
  async token(@Body('device_code') deviceCode: string) {
    const result = await this.authService.pollToken(deviceCode)

    if (result.error) {
      return { error: result.error }
    }

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    }
  }

  @Post('activate')
  @Throttle({ login: {} })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateDto, @Req() req: AuthenticatedRequest) {
    const approved = await this.authService.approveDeviceCode(
      req.user.id,
      dto.user_code,
    )
    return { approved }
  }

  @Post('signup')
  @Throttle({ signup: {} })
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(dto.email, dto.password, dto.name)

    if (!tokens) {
      // Return 201 to prevent email enumeration
      res.status(201).json({ message: 'If this is a new email, your account has been created.' })
      return
    }

    this.setCookies(res, tokens)
    return tokens
  }

  @Post('login')
  @Throttle({ login: {} })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password)

    if (!tokens) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    this.setCookies(res, tokens)
    return tokens
  }

  @Post('refresh')
  @Throttle({ login: {} })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = bodyToken || req.cookies?.refresh_token

    if (!token) {
      res.status(401).json({ error: 'No refresh token provided' })
      return
    }

    const tokens = await this.authService.refreshToken(token)

    if (!tokens) {
      res.status(401).json({ error: 'Invalid refresh token' })
      return
    }

    this.setCookies(res, tokens)
    return tokens
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as AuthenticatedRequest & { cookies: Record<string, string> }).cookies?.refresh_token

    if (token) {
      await this.authService.logout(token)
    }

    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    return { success: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.id)
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) return 15 * 60 * 1000
    const value = parseInt(match[1])
    switch (match[2]) {
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default:  return 15 * 60 * 1000
    }
  }

  private setCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ) {
    const accessMaxAge = this.parseDurationMs(
      this.config.getOrThrow<string>('JWT_EXPIRES_IN'),
    )
    const refreshDays = parseInt(
      this.config.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN').replace('d', ''),
    )
    const refreshMaxAge = refreshDays * 24 * 60 * 60 * 1000
    const secure = this.config.getOrThrow<string>('WEB_ORIGIN').startsWith('https')

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: accessMaxAge,
    })
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: refreshMaxAge,
    })
  }
}
