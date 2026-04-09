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
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface'

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('device')
  @Throttle({ device: {} })
  @HttpCode(HttpStatus.OK)
  async deviceCode() {
    return this.authService.createDeviceCode()
  }

  @Post('token')
  @SkipThrottle()
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(@Body('user_code') userCode: string, @Req() req: AuthenticatedRequest) {
    const approved = await this.authService.approveDeviceCode(
      req.user.id,
      userCode,
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
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body('refreshToken') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      bodyToken || req.cookies?.refresh_token || req.headers.authorization?.replace('Bearer ', '')

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

  private setCookies(
    res: Response,
    tokens: { access_token: string; refresh_token: string },
  ) {
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })
  }
}
