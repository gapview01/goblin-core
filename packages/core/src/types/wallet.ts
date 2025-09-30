export interface WalletAdapter {
  publicKey: string;
  signTransaction: (tx: unknown) => Promise<unknown>;
}

export interface WalletMetadata {
  label?: string;
  capabilities?: string[];
}
