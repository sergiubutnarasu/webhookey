import { Command } from '@oclif/core'
import { api } from '../lib/api'

export default class List extends Command {
  static description = 'List your webhook channels'

  async run(): Promise<void> {
    const channels = await api.getChannels()

    if (channels.length === 0) {
      this.log('No channels found. Run "webhookey new <name>" to create one.')
      return
    }

    this.log('Channels:')
    for (const c of channels) {
      this.log(`  ${c.name}`)
      this.log(`    URL: ${c.webhookUrl}`)
      this.log(`    Created: ${new Date(c.createdAt).toLocaleDateString()}`)
    }
  }
}
