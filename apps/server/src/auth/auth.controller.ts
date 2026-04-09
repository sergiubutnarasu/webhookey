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
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('device')
  @HttpCode(HttpStatus.OK)
  async deviceCode() {
    return this.authService.createDeviceCode()
  }

  @Post('token')
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
  async activate(@Body('user_code') userCode: string, @Req() req: any) {
    const approved = await this.authService.approveDeviceCode(
      req.user.id,
      userCode,
    )
    return { approved }
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(email, password, name)

    if (!tokens) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    this.setCookies(res, tokens)
    return tokens
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(email, password)

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
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Body('refreshToken') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      bodyToken || req.cookies?.refresh_token || req.headers.authorization?.replace('Bearer ', '')

    if (token) {
      await this.authService.logout(token)
    }

    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    return { success: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
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
