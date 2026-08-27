/**
 * Soroban Remote Compilation Service Client
 * Provides interfaces and API handlers for server-side compilation of Soroban contracts.
 */

export interface CompilationRequest {
  contractName: string;
  sourceCode: string;
  cargoToml?: string;
  sorobanSdkVersion?: string;
}

export interface CompilationResponse {
  success: boolean;
  wasmBase64?: string;
  hash?: string;
  abi?: Record<string, unknown>;
  buildLogs?: string;
  error?: string;
}

/**
 * Sends contract source code to a remote compilation server to build and optimize
 * WASM bytecode for deployment.
 */
export async function compileContractRemote(
  request: CompilationRequest,
  apiEndpoint = 'https://api.sorobancookbook.org/v1/compile',
): Promise<CompilationResponse> {
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Server compilation failed [HTTP ${response.status}]: ${errorText}`,
      };
    }

    const data: CompilationResponse = await response.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network request failed: ${message}`,
    };
  }
}
