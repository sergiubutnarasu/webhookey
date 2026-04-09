import { Command, Args } from '@oclif/core'
import { api } from '../lib/api'
import { confirm } from '@inquirer/prompts'

export default class Remove extends Command {
  static description = 'Remove a webhook channel and all its events'

  static args = {
    name: Args.string({ description: 'Channel name to remove', required: true }),
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Remove)

    // Find channel by name
    const channels = await api.getChannels()
    const channel = channels.find(c => c.name === args.name)

    if (!channel) {
      this.error(`Channel "${args.name}" not found`)
      return
    }

    // Confirm deletion
    const confirmed = await confirm({
      message: `Delete channel "${args.name}" and all its events?`,
      default: false,
    })

    if (!confirmed) {
      this.log('Deletion cancelled')
      return
    }

    // Delete the channel
    await api.deleteChannel(channel.id)
    this.log(`Channel "${args.name}" deleted successfully`)
  }
}
