---
time: 5
sidebar_position: 1
title: Configuración del entorno
description: Configura tu entorno de desarrollo de Soroban — instala Rust, el CLI de Soroban y configura tu sistema para el desarrollo de contratos inteligentes.
---

# Configuración del entorno

Para instrucciones específicas por plataforma, consulta [Configuración en Linux](/docs/getting-started/setup-linux) o [Configuración en Windows](/docs/getting-started/setup-windows).

## Requisitos previos

Antes de comenzar, asegúrate de tener:

- **Rust** - Última versión estable
- **CLI de Soroban** - Interfaz de línea de comandos para Soroban
- **Editor de código** - VS Code o tu editor preferido
- **Git** - Control de versiones

## Pasos de instalación

### 1. Instalar Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verifica la instalación:

```bash
rustc --version
cargo --version
```

### 2. Instalar el CLI de Soroban

```bash
cargo install --locked soroban-cli
```

Verifica la instalación:

```bash
soroban --version
```

### 3. Configurar el objetivo WebAssembly

Agrega el objetivo WebAssembly:

```bash
rustup target add wasm32-unknown-unknown
```

## Verifica tu configuración

Prueba tu entorno con:

```bash
soroban --help
```

Deberías ver la ayuda del CLI de Soroban.

## Próximos pasos

Ahora que tu entorno está listo:

1. [Crea tu primer contrato](./first-contract.md)
2. [Aprende conceptos fundamentales](../concepts/overview)
3. [Explora patrones](../patterns/overview)

## Solución de problemas

### Problemas comunes

**La instalación de Rust falla:**

- Verifica tu conexión a internet
- Asegúrate de tener permisos de escritura
- Intenta la instalación manual desde [rust-lang.org](https://www.rust-lang.org/tools/install)

**No se encuentra el CLI de Soroban:**

- Reinicia tu terminal después de la instalación
- Verifica que el directorio bin de cargo esté en tu PATH
- Verifica con `cargo install --list`

**¿Necesitas ayuda?**

- [Stellar Discord](https://discord.gg/stellardev)
- [Documentación de Soroban](https://developers.stellar.org/docs/build/smart-contracts)

## Preguntas frecuentes

### ¿Cómo instalo Rust para el desarrollo con Soroban?

Puedes instalar Rust ejecutando:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Y verificar con `rustc --version`.

### ¿Cómo instalo el CLI de Soroban?

Puedes instalarlo mediante Cargo:

```bash
cargo install --locked soroban-cli
```

### ¿Por qué necesito el objetivo wasm32-unknown-unknown?

Los contratos inteligentes de Soroban se compilan a WebAssembly (WASM). El objetivo `wasm32-unknown-unknown` le indica al compilador de Rust que genere bytecode WASM en lugar de código de máquina nativo.
