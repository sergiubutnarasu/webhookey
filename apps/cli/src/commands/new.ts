import { Command, Args, Flags } from '@oclif/core'
import { api } from '../lib/api'

export default class New extends Command {
  static description = 'Create a new webhook channel'

  static args = {
    name: Args.string({ description: 'Channel name', required: true }),
  }

  static flags = {
    'no-secret': Flags.boolean({ description: 'Create channel without HMAC secret' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(New)

    const channel = await api.createChannel(args.name, !flags['no-secret'])

    this.log(`Channel created: ${channel.name}`)
    this.log(`Webhook URL: ${channel.webhookUrl}`)

    if (channel.secret) {
      this.log(`Secret: ${channel.secret}`)
      this.log('⚠️  Save your secret — it won\'t be shown again!')
    } else {
      this.log('ℹ️  Channel has no secret — all incoming webhooks will be treated as verified')
    }
  }
}
