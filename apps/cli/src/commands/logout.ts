import { Command } from '@oclif/core'
import { api } from '../lib/api'
import { getRefreshToken, clearTokens } from '../lib/config'

export default class Logout extends Command {
  static description = 'Log out and clear stored credentials'

  async run(): Promise<void> {
    const refreshToken = await getRefreshToken()

    if (refreshToken) {
      try {
        await api.logout(refreshToken)
      } catch (e) {
        // Ignore errors - still clear local tokens
      }
    }

    await clearTokens()
    this.log('Logged out successfully')
  }
}
