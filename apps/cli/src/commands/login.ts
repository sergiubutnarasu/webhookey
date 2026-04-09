import { Command } from '@oclif/core'
import { api } from '../lib/api'
import { setAccessToken, setRefreshToken } from '../lib/config'

export default class Login extends Command {
  static description = 'Authenticate via device flow'

  async run(): Promise<void> {
    const deviceRes = await api.deviceCode()

    this.log(`User code: ${deviceRes.user_code}`)
    this.log(`Open ${deviceRes.verification_uri} to activate`)
    this.log('Waiting for activation...')

    let interval = deviceRes.interval * 1000

    while (true) {
      await new Promise((r) => setTimeout(r, interval))

      const tokenRes = await api.token(deviceRes.device_code)

      if (tokenRes.error === 'slow_down') {
        interval += 5000
        this.log('Server requested slow_down, increasing interval...')
        continue
      }

      if (tokenRes.error === 'authorization_pending') {
        continue
      }

      if (tokenRes.error) {
        this.error(`Device flow failed: ${tokenRes.error}`)
        return
      }

      if (tokenRes.access_token && tokenRes.refresh_token) {
        await setAccessToken(tokenRes.access_token)
        await setRefreshToken(tokenRes.refresh_token)
        this.log('Logged in successfully!')
        return
      }
    }
  }
}
