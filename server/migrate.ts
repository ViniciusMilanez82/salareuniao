import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Client } = pg

async function migrate() {
  console.log('🔄 Iniciando migração do banco de dados...\n')

  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: false,
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao PostgreSQL')
    console.log(`   Host: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`)
    console.log(`   Database: ${process.env.POSTGRES_DB}\n`)

    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '00001_initial_schema.sql')
    let sql = fs.readFileSync(migrationPath, 'utf-8')

    // Remover comandos que dependem do Supabase Auth (auth.uid(), auth.jwt())
    // Substituir por funções placeholder
    sql = sql.replace(/auth\.uid\(\)/g, "current_setting('app.current_user_id')::uuid")
    sql = sql.replace(/auth\.jwt\(\)\s*->>\s*'role'/g, "current_setting('app.current_user_role')")

    // Remover VECTOR extension se não estiver disponível (falha silenciosa)
    // e remover colunas/índices de embedding

    console.log('📝 Executando migração SQL...\n')

    // Dividir em statements e executar um por um para melhor diagnóstico
    // Mas primeiro tentar executar tudo de uma vez
    await client.query(sql)

    console.log('✅ Migração concluída com sucesso!\n')

    // Verificar tabelas criadas
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    console.log(`📊 ${tablesResult.rows.length} tabelas criadas:`)
    tablesResult.rows.forEach((row: { table_name: string }) => {
      console.log(`   • ${row.table_name}`)
    })

    console.log('\n🎉 Banco de dados pronto para uso!')

  } catch (err: any) {
    console.error('❌ Erro na migração:', err.message)

    if (err.message.includes('extension "vector" is not available')) {
      console.log('\n⚠️  A extensão pgvector não está instalada.')
      console.log('   Tentando migração sem pgvector...\n')

      // Re-executar sem vector
      try {
        let sql = fs.readFileSync(
          path.join(process.cwd(), 'supabase', 'migrations', '00001_initial_schema.sql'),
          'utf-8'
        )

        // Remover tudo relacionado a vector
        sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "vector";/g, '-- vector extension skipped')
        sql = sql.replace(/embedding VECTOR\(\d+\),?\n?/g, '')
        sql = sql.replace(/CREATE INDEX.*vector_cosine_ops.*;\n?/g, '')
        sql = sql.replace(/USING ivfflat.*;\n?/g, ';')
        sql = sql.replace(/auth\.uid\(\)/g, "current_setting('app.current_user_id')::uuid")
        sql = sql.replace(/auth\.jwt\(\)\s*->>\s*'role'/g, "current_setting('app.current_user_role')")

        await client.query(sql)
        console.log('✅ Migração concluída (sem pgvector)!')
      } catch (retryErr: any) {
        console.error('❌ Falha na segunda tentativa:', retryErr.message)
        if (retryErr.position) {
          console.error('   Posição no SQL:', retryErr.position)
        }
      }
    } else {
      if (err.position) {
        console.error('   Posição no SQL:', err.position)
      }
    }
  } finally {
    await client.end()
    console.log('\n🔌 Conexão encerrada.')
  }
}

migrate()
