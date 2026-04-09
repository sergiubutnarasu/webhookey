import { Command, Args, Flags } from '@oclif/core'
import { spawn } from 'child_process'
import { api } from '../lib/api'
import { getApiUrl, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../lib/config'

interface WebhookEvent {
  type?: string
  verified?: boolean
  payload?: unknown
}

interface TokenResponse {
  access_token: string
  refresh_token: string
}


export default class Listen extends Command {
  static description = 'Listen for webhooks on a channel and execute commands'

  static args = {
    name: Args.string({ description: 'Channel name', required: true }),
  }

  static flags = {
    parallel: Flags.boolean({ description: 'Allow parallel command execution' }),
    'allow-unverified': Flags.boolean({ description: 'Execute commands even for unverified webhooks' }),
  }

  static strict = false

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Listen)
    const commandStart = process.argv.indexOf('--')
    const command = commandStart >= 0 ? process.argv.slice(commandStart + 1) : []

    if (command.length === 0) {
      this.error('No command specified. Usage: webhookey listen <name> -- <command>')
      return
    }

    // Find channel by name
    const channels = await api.getChannels()
    const channel = channels.find((c: { name: string }) => c.name === args.name)

    if (!channel) {
      this.error(`Channel "${args.name}" not found`)
      return
    }

    const apiUrl = getApiUrl()
    let accessToken = await getAccessToken()

    if (!accessToken) {
      this.error('Not logged in. Run "webhookey login" first.')
      return
    }

    this.log(`Listening on channel "${args.name}"...`)
    this.log(`Executing: ${command.join(' ')}`)

    // Dynamically import eventsource
    const { default: EventSource } = await import('eventsource') as any

    let eventSource: any
    const queue: Array<unknown> = []
    let currentProcess: ReturnType<typeof spawn> | null = null
    const maxQueueDepth = 10

    const connect = () => {
      eventSource = new EventSource(`${apiUrl}/hooks/${channel.slug}/events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      eventSource.onmessage = (event: { data: string }) => {
        const data = JSON.parse(event.data) as WebhookEvent

        if (data.type === 'heartbeat') {
          return
        }

        if (!data.verified) {
          if (!flags['allow-unverified']) {
            this.warn('Received unverified webhook, skipping execution')
            return
          }
        }

        if (queue.length >= maxQueueDepth) {
          this.warn('Queue full, dropping event')
          return
        }

        queue.push(data.payload)
        processQueue()
      }

      eventSource.onerror = async (_err: unknown) => {
        // Handle 401 - refresh and reconnect
        const refresh = await getRefreshToken()
        if (refresh) {
          try {
            const res = await fetch(`${apiUrl}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refresh}`,
              },
            })

            if (res.ok) {
              const tokens = await res.json() as TokenResponse
              await setAccessToken(tokens.access_token)
              await setRefreshToken(tokens.refresh_token)
              accessToken = tokens.access_token

              // Close old connection and reconnect
              eventSource?.close()
              connect()
              return
            }
          } catch (e) {
            // Refresh failed, fall through to clear tokens
          }
        }

        await clearTokens()
        this.error('Session expired — run webhookey login')
        process.exit(1)
      }
    }

    const processQueue = () => {
      if (queue.length === 0) return
      if (currentProcess && !flags.parallel) return

      const payload = queue.shift()
      const payloadJson = JSON.stringify(payload)

      currentProcess = spawn(command[0] as string, command.slice(1) as string[], {
        env: { ...process.env, WEBHOOKEY_PAYLOAD: payloadJson },
        stdio: ['pipe', 'inherit', 'inherit'],
      })

      currentProcess.stdin?.write(payloadJson)
      currentProcess.stdin?.end()

      currentProcess.on('close', () => {
        currentProcess = null
        processQueue()
      })
    }

    connect()

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      eventSource?.close()
      if (currentProcess) {
        currentProcess.kill('SIGTERM')
      }
      process.exit(0)
    })

    // Keep process running
    await new Promise(() => {})
  }
}
