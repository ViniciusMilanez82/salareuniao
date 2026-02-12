import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Client } = pg

async function migrate() {
  console.log('🔄 Iniciando migração PostgreSQL (VPS)...\n')

  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: false,
    connectionTimeoutMillis: 15000,
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao PostgreSQL')
    console.log(`   Host: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`)
    console.log(`   Database: ${process.env.POSTGRES_DB}\n`)

    // Ler arquivo de migração
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '00001_initial_schema.sql')
    let sql = fs.readFileSync(migrationPath, 'utf-8')

    // ==============================
    // LIMPEZA: remover dependências Supabase
    // ==============================

    // 1. Remover pgvector (pode não estar na VPS)
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "vector";/g, '-- [SKIP] pgvector não disponível')
    // Remover linhas com VECTOR
    sql = sql.replace(/^.*VECTOR\(\d+\).*$/gm, '')
    // Remover índices que usam vector
    sql = sql.replace(/^.*vector_cosine_ops.*$/gm, '')
    sql = sql.replace(/^.*ivfflat.*$/gm, '')

    // 2. Remover RLS (Row Level Security) — o controle de acesso é feito no backend
    sql = sql.replace(/ALTER TABLE \w+ ENABLE ROW LEVEL SECURITY;\n/g, '')
    sql = sql.replace(/CREATE POLICY[\s\S]*?;\n/g, '')

    // 3. Substituir auth.uid() e auth.jwt()
    sql = sql.replace(/auth\.uid\(\)/g, "'00000000-0000-0000-0000-000000000000'::uuid")
    sql = sql.replace(/auth\.jwt\(\)\s*->>\s*'role'/g, "'admin'")

    console.log('📝 Executando SQL limpo (sem Supabase/pgvector/RLS)...\n')
    await client.query(sql)

    console.log('✅ Migração concluída!\n')

    // Verificar tabelas
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    console.log(`📊 ${tablesResult.rows.length} tabelas criadas:`)
    tablesResult.rows.forEach((row: { table_name: string }) => {
      console.log(`   ✓ ${row.table_name}`)
    })

    // Verificar views
    const viewsResult = await client.query(`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    if (viewsResult.rows.length > 0) {
      console.log(`\n📋 ${viewsResult.rows.length} views criadas:`)
      viewsResult.rows.forEach((row: { table_name: string }) => {
        console.log(`   ✓ ${row.table_name}`)
      })
    }

    // Verificar planos inseridos
    const plansResult = await client.query('SELECT name, slug, price_monthly FROM subscription_plans ORDER BY price_monthly')
    if (plansResult.rows.length > 0) {
      console.log(`\n💰 ${plansResult.rows.length} planos de assinatura:`)
      plansResult.rows.forEach((row: { name: string; slug: string; price_monthly: number }) => {
        console.log(`   ✓ ${row.name} (${row.slug}) - R$ ${row.price_monthly}/mês`)
      })
    }

    console.log('\n🎉 Banco de dados pronto para uso!')

  } catch (err: any) {
    console.error('\n❌ Erro na migração:', err.message)
    if (err.position) {
      console.error('   Posição no SQL:', err.position)
      // Mostrar trecho do SQL próximo ao erro
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '00001_initial_schema.sql')
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      const pos = parseInt(err.position)
      const start = Math.max(0, pos - 100)
      const end = Math.min(sql.length, pos + 100)
      console.error('   Trecho:', sql.substring(start, end).replace(/\n/g, ' ').trim())
    }
    if (err.detail) console.error('   Detalhe:', err.detail)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Conexão encerrada.')
  }
}

migrate()
