import { Entry } from '@napi-rs/keyring'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const SERVICE_NAME = 'webhookey'

interface Config {
  apiUrl: string
}

const configDir = path.join(os.homedir(), '.config', 'webhookey')
const configPath = path.join(configDir, 'config.json')

const defaultConfig: Config = {
  apiUrl: 'http://localhost:3000',
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      return { ...defaultConfig, ...JSON.parse(data) }
    }
  } catch {
    // Ignore errors, use defaults
  }
  return { ...defaultConfig }
}

function saveConfig(config: Config): void {
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (e) {
    throw new Error(`Failed to save config: ${e}`)
  }
}

let cachedConfig: Config | null = null

function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}

export function getApiUrl(): string {
  return process.env.WEBHOOKEY_API_URL || getConfig().apiUrl
}

export function setApiUrl(url: string): void {
  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
  const config = getConfig()
  config.apiUrl = url
  saveConfig(config)
}

export async function getAccessToken(): Promise<string | null> {
  const entry = new Entry(SERVICE_NAME, 'access_token')
  try {
    const password = await entry.getPassword()
    return password || null
  } catch {
    return null
  }
}

export async function setAccessToken(token: string): Promise<void> {
  const entry = new Entry(SERVICE_NAME, 'access_token')
  await entry.setPassword(token)
}

export async function getRefreshToken(): Promise<string | null> {
  const entry = new Entry(SERVICE_NAME, 'refresh_token')
  try {
    const password = await entry.getPassword()
    return password || null
  } catch {
    return null
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  const entry = new Entry(SERVICE_NAME, 'refresh_token')
  await entry.setPassword(token)
}

export async function clearTokens(): Promise<void> {
  const accessEntry = new Entry(SERVICE_NAME, 'access_token')
  const refreshEntry = new Entry(SERVICE_NAME, 'refresh_token')
  try {
    await accessEntry.deletePassword()
  } catch {}
  try {
    await refreshEntry.deletePassword()
  } catch {}
}
