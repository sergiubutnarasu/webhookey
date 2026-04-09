import { Command, Args } from '@oclif/core'
import { setApiUrl, getApiUrl } from '../lib/config'

export default class Config extends Command {
  static description = 'Configure the CLI'

  static args = {
    action: Args.string({
      description: 'Action to perform',
      options: ['set-url', 'get-url'],
      required: true,
    }),
    value: Args.string({ description: 'Value for set-url' }),
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Config)

    if (args.action === 'set-url') {
      if (!args.value) {
        this.error('URL required for set-url')
        return
      }
      setApiUrl(args.value)
      this.log(`API URL set to: ${args.value}`)
    } else if (args.action === 'get-url') {
      this.log(getApiUrl())
    }
  }
}
