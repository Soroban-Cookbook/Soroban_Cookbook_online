---
sidebar_position: 1
title: Conceptos fundamentales
description: Conceptos esenciales de Soroban — almacenamiento, autorización, eventos, manejo de errores y ciclo de vida del contrato para contratos inteligentes robustos.
---

# Conceptos fundamentales

Conceptos esenciales para construir contratos inteligentes en Soroban.

## Descripción general

Comprender estos conceptos fundamentales te ayudará a construir contratos Soroban robustos y eficientes.

## Temas clave

### [Almacenamiento y gestión de estado](/docs/concepts/storage)

Aprende cómo persistir datos en tus contratos usando el sistema de almacenamiento de Soroban.

### [Autorización y control de acceso](/docs/concepts/authorization)

Implementa patrones seguros de autenticación y autorización.

### [Eventos y registro](/docs/concepts/events)

Emite eventos y registros para el monitoreo y depuración de contratos.

### [Manejo de errores](/docs/concepts/error-handling)

Estrategias adecuadas de manejo y recuperación de errores.

### [Ciclo de vida del contrato](/docs/patterns/lifecycle-upgrades)

Comprende el despliegue, las actualizaciones y la gestión del ciclo de vida del contrato.

## Primeros pasos

Comienza con:

1. [¿Qué es Soroban?](/docs/concepts/introduction) — Introducción para principiantes
2. [Mejores prácticas de Soroban](/docs/concepts/best-practices) — Reglas para nuevos desarrolladores
3. [Patrones de almacenamiento](/docs/concepts/storage) — Aprende la persistencia de datos
4. [Autorización](/docs/concepts/authorization) — Protege tus contratos
5. [Eventos](/docs/concepts/events) — Monitorea la actividad del contrato

## Seguridad: claves, billeteras, RPC y redes

Antes de ejecutar comandos CLI, firmar transacciones, conectarte a RPC o preparar un despliegue, lee esta sección. Aplica a cada flujo de esta página que toque claves, billeteras, RPC o una red.

### Manejo de claves

- **Nunca cometas ni pegues claves secretas ni frases semilla.** Trátalas como contraseñas: mántenlas fuera del control de versioes, del chat, de los tickets, de las capturas de pantalla y de los logs.
- **Prefiere identidades con nombre o una extensión de billetera.** Usa el manejo de claves secretas del CLI (por ejemplo, identidades con nombre) o una extensión de billetera para firmar, en lugar de codificar secretos en scripts o en el historial del shell.
- **Usa claves distintas por entorno.** Mantén separadas las identidades de desarrollo, testnet y mainnet, así una clave de prueba comprometida no puede mover fondos reales.
- **Rota cualquier clave que pueda haberse filtrado.** Si una clave secreta o frase semilla queda expuesta, mueve los activos a una nueva identidad de inmediato.

### Riesgo de red

- **Testnet vs. mainnet.** Testnet es para experimentar y para datos desechables. Mainnet maneja fondos y usuarios reales — trata cada despliegue, actualización y transacción firmada como un cambio de producción.
- **Riesgo de fondos reales.** En mainnet, los bugs, direcciones incorrectas y las comprobaciones de autorización faltantes pueden costar activos reales. Prueba primero en testnet y revisa el comportamiento de autorización y almacenamiento.
- **Los endpoints RPC y públicos no sustituyen una operación cuidadosa.** Los endpoints RPC públicos pueden ser lentos, intermitentes o no estar autenticados; usalos para desarrollo, pero para cualquier cosa que toque fondos reales usa un proveedor RPC de confianza y verifica los resultados de las transacciones.

Para la lista de verificación canónica, consulta [Mejores prácticas de Soroban](/docs/concepts/best-practices). Consulta también la guía de despliegue y mainnet de esta documentación antes de publicar en una red pública.

## Recursos

- [Documentación de Soroban](https://developers.stellar.org/docs/build/smart-contracts)
- [Referencia del SDK](https://docs.rs/soroban-sdk)
