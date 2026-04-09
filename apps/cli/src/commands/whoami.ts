import { Command } from '@oclif/core'
import { api } from '../lib/api'

export default class Whoami extends Command {
  static description = 'Show current user information'

  async run(): Promise<void> {
    const user = await api.me()
    this.log(`Email: ${user.email}`)
    this.log(`User ID: ${user.id}`)
  }
}
