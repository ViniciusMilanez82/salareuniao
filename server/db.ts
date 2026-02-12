import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const connectionConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}

export const pool = new Pool(connectionConfig)

pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message)
})

export async function query(text: string, params?: unknown[]) {
  try {
    const result = await pool.query(text, params)
    return result
  } catch (err: any) {
    console.error('❌ Query error:', err.message, '| SQL:', text.substring(0, 80))
    throw err
  }
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as now')
    console.log('✅ PostgreSQL conectado:', result.rows[0].now)
    return true
  } catch (err: any) {
    console.error('❌ Falha ao conectar:', err.message)
    return false
  }
}
