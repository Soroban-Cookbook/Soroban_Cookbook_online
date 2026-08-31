---
time: 5
sidebar_position: 1
title: Configuração do ambiente
description: Configure seu ambiente de desenvolvimento Soroban — instale Rust, o CLI do Soroban e configure seu sistema para desenvolvimento de contratos inteligentes.
---

# Configuração do ambiente

Para instruções específicas por plataforma, veja [Configuração no Linux](/docs/getting-started/setup-linux) ou [Configuração no Windows](/docs/getting-started/setup-windows).

## Pré-requisitos

Antes de começar, certifique-se de ter:

- **Rust** - Última versão estável
- **CLI do Soroban** - Interface de linha de comando para o Soroban
- **Editor de código** - VS Code ou seu editor preferido
- **Git** - Controle de versão

## Etapas de instalação

### 1. Instalar o Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verifique a instalação:

```bash
rustc --version
cargo --version
```

### 2. Instalar o CLI do Soroban

```bash
cargo install --locked soroban-cli
```

Verifique a instalação:

```bash
soroban --version
```

### 3. Configurar o alvo WebAssembly

Adicione o alvo WebAssembly:

```bash
rustup target add wasm32-unknown-unknown
```

## Verifique sua configuração

Teste seu ambiente com:

```bash
soroban --help
```

Você deverá ver a saída de ajuda do CLI do Soroban.

## Próximos passos

Agora que seu ambiente está pronto:

1. [Crie seu primeiro contrato](./first-contract.md)
2. [Aprenda os conceitos principais](../concepts/overview)
3. [Explore os padrões](../patterns/overview)

## Solução de problemas

### Problemas comuns

**A instalação do Rust falha:**

- Verifique sua conexão com a internet
- Certifique-se de ter permissões de escrita
- Tente a instalação manual em [rust-lang.org](https://www.rust-lang.org/tools/install)

**CLI do Soroban não encontrado:**

- Reinicie seu terminal após a instalação
- Verifique se o diretório bin do cargo está no seu PATH
- Verifique com `cargo install --list`

**Precisa de ajuda?**

- [Stellar Discord](https://discord.gg/stellardev)
- [Documentação do Soroban](https://developers.stellar.org/docs/build/smart-contracts)

## Perguntas frequentes

### Como instalo o Rust para desenvolvimento com Soroban?

Você pode instalar o Rust executando:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

E verificar com `rustc --version`.

### Como instalo o CLI do Soroban?

Você pode instalá-lo via Cargo:

```bash
cargo install --locked soroban-cli
```

### Por que preciso do alvo wasm32-unknown-unknown?

Os contratos inteligentes do Soroban são compilados para WebAssembly (WASM). O alvo `wasm32-unknown-unknown` instrui o compilador Rust a gerar bytecode WASM em vez de código de máquina nativo.
