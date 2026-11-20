---
sidebar_position: 1
title: Conceitos principais
description: Conceitos essenciais do Soroban — armazenamento, autorização, eventos, tratamento de erros e ciclo de vida do contrato para contratos inteligentes robustos.
---

# Conceitos principais

Conceitos essenciais para construir contratos inteligentes no Soroban.

## Visão geral

Compreender esses conceitos principais ajudará você a construir contratos Soroban robustos e eficientes.

## Tópicos principais

### [Armazenamento e gerenciamento de estado](/docs/concepts/storage)

Aprenda como persistir dados em seus contratos usando o sistema de armazenamento do Soroban.

### [Autorização e controle de acesso](/docs/concepts/authorization)

Implemente padrões seguros de autenticação e autorização.

### [Eventos e registro](/docs/concepts/events)

Emita eventos e logs para monitoramento e depuração de contratos.

### [Tratamento de erros](/docs/concepts/error-handling)

Estratégias adequadas de tratamento e recuperação de erros.

### [Ciclo de vida do contrato](/docs/patterns/lifecycle-upgrades)

Entenda a implantação, atualizações e gerenciamento do ciclo de vida do contrato.

## Primeiros passos

Comece com:

1. [O que é Soroban?](/docs/concepts/introduction) — Introdução para iniciantes
2. [Melhores práticas do Soroban](/docs/concepts/best-practices) — Regras para novos desenvolvedores
3. [Padrões de armazenamento](/docs/concepts/storage) — Aprenda persistência de dados
4. [Autorização](/docs/concepts/authorization) — Proteja seus contratos
5. [Eventos](/docs/concepts/events) — Monitore a atividade do contrato

## Segurança: chaves, carteiras, RPC e redes

Antes de executar comandos CLI, assinar transações, conectar-se ao RPC ou preparar uma implantação, leia esta seção. Ela se aplica a cada fluxo desta página que envolve chaves, carteiras, RPC ou uma rede.

### Manejo de chaves

- **Nunca comite nem cole chaves secretas ou frases seeds.** Trate-as como senhas: mantenha-as fora do controle de versão, do chat, dos tickets, das capturas de tela e dos logs.
- **Prefira identidades com nome ou uma extensão de carteira.** Use o gerenciamento de chaves secretas do CLI (por exemplo, identidades com nome) ou uma extensão de carteira para assinar, em vez de codficar segredos em scripts ou no histórico do shell.
- **Use chaves distintas por ambiente.** Mantenha identidades de desenvolvimento, testnet e mainnet separadas, assim uma chave de teste comprometida não consegue mover fundos reais.
- **Rotacione qualquer chave que possa ter vazado.** Se uma chave secreta ou frase seed for exposta, mova os ativos para uma nova identidade imediatamente.

### Risco de rede

- **Testnet vs. mainnet.** O testnet 聯 para experimentação e dados descartáveis. O mainnet lida com fundos e usuários reais — trate cada implantação, atualização e transação assinada como uma mudança de produção.
- **Risco de fundos reais.** No mainnet, bugs, endereços errados e verificações de autorização ausentes podem custar ativos reais. Teste primeiro no testnet e revise o comportamento de autorização e armazenamento.
- **Endpoints RPC e públicos não substituem uma operação cuidadosa.** Endpoints RPC públicos podem ser lentos, intermitentes ou não autenticados; use-os para desenvolvimento, mas para qualquer coisa que envolva fundos reais use um provedor RPC confiável e verifique os resultados das transações.

Para a lista de verificação canônica, consulte [Melhores práticas do Soroban](/docs/concepts/best-practices). Consulte também o guia de implantação e mainnet desta documentação antes de publicar nem uma rede pública.

## Recursos

- [Documentação do Soroban](https://developers.stellar.org/docs/build/smart-contracts)
- [Referência do SDK](https://docs.rs/soroban-sdk)
