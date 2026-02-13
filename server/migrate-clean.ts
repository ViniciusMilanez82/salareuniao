import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Client } = pg

async function migrate() {
  console.log('🔄 Iniciando migração PostgreSQL...\n')

  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10)
  const user = process.env.POSTGRES_USER
  const password = process.env.POSTGRES_PASSWORD
  const database = process.env.POSTGRES_DB

  if (!user || !database) {
    console.error('❌ POSTGRES_USER e POSTGRES_DB são obrigatórios.')
    process.exit(1)
  }

  const client = new Client({
    host,
    port,
    user,
    password: password || undefined,
    database,
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
    try {
      await client.query(sql)
    } catch (e: any) {
      if (e?.message?.includes('already exists')) {
        console.log('   (schema já existe, continuando)')
      } else throw e
    }

    // Migração 00002 - integration_settings
    const migration2Path = path.join(process.cwd(), 'supabase', 'migrations', '00002_integration_settings.sql')
    if (fs.existsSync(migration2Path)) {
      try {
        const sql2 = fs.readFileSync(migration2Path, 'utf-8')
        await client.query(sql2)
        console.log('✅ Migração 00002 (integration_settings) aplicada')
      } catch (e2: any) {
        if (e2?.message?.includes('already exists')) console.log('   (integration_settings já existe)')
        else throw e2
      }
    }

    // Migração 00003 - transcript_feedback (like/dislike)
    const migration3Path = path.join(process.cwd(), 'supabase', 'migrations', '00003_transcript_feedback.sql')
    if (fs.existsSync(migration3Path)) {
      try {
        const sql3 = fs.readFileSync(migration3Path, 'utf-8')
        await client.query(sql3)
        console.log('✅ Migração 00003 (transcript_feedback) aplicada')
      } catch (e3: any) {
        if (e3?.message?.includes('already exists')) console.log('   (transcript_feedback já existe)')
        else throw e3
      }
    }

    // Migração 00004 - security and integrity hardening (CHECKs)
    const migration4Path = path.join(process.cwd(), 'supabase', 'migrations', '00004_security_and_integrity_hardening.sql')
    if (fs.existsSync(migration4Path)) {
      try {
        const sql4 = fs.readFileSync(migration4Path, 'utf-8')
        await client.query(sql4)
        console.log('✅ Migração 00004 (security hardening) aplicada')
      } catch (e4: any) {
        if (e4?.message?.includes('already exists') || e4?.code === '42710') console.log('   (constraints já existem)')
        else throw e4
      }
    }

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

  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: string; position?: string; detail?: string }
    const msg = errObj?.message ?? errObj?.code ?? String(err)
    console.error('\n❌ Erro na migração:', msg || '(sem mensagem)')
    if (errObj?.code) console.error('   Código:', errObj.code)
    if (errObj?.position) {
      console.error('   Posição no SQL:', errObj.position)
      try {
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '00001_initial_schema.sql')
        const sql = fs.readFileSync(migrationPath, 'utf-8')
        const pos = parseInt(errObj.position, 10)
        const start = Math.max(0, pos - 100)
        const end = Math.min(sql.length, pos + 100)
        console.error('   Trecho:', sql.substring(start, end).replace(/\n/g, ' ').trim())
      } catch (_) {}
    }
    if (errObj?.detail) console.error('   Detalhe:', errObj.detail)
    process.exit(1)
  } finally {
    try {
      await client.end()
      console.log('\n🔌 Conexão encerrada.')
    } catch (_) {}
  }
}

migrate()
