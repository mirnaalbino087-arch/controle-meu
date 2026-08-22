# Painel de Empréstimos — versão inicial

## Como usar
1. Extraia os arquivos.
2. Abra `index.html` no navegador.
3. Entre com:
   - Usuário: `admin`
   - Senha: `123456`
4. Cadastre clientes, empréstimos e pagamentos.
5. Use "Exportar backup" para salvar os dados.

## Importante sobre segurança
Esta versão é um protótipo local e salva os dados no `localStorage` do navegador. NÃO use esta versão, sem um backend seguro, para armazenar dados pessoais reais de clientes.

Para uma versão de produção, o próximo passo é colocar:
- banco de dados (PostgreSQL/Supabase, por exemplo);
- autenticação real;
- senhas armazenadas com hash;
- controle de permissões;
- HTTPS;
- backups automáticos;
- logs de acesso/alterações;
- política de privacidade e medidas de segurança adequadas à LGPD;
- proteção contra acesso indevido e exportação de dados.

Também é recomendável coletar somente os dados necessários para a finalidade do serviço e definir prazo de retenção e procedimento para exclusão/correção.
