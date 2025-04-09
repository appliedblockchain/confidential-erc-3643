import { Signer, Wallet } from 'ethers'

export interface Signers {
  deployer: Signer
  tokenIssuer: Signer
  tokenAgent: Signer
  tokenAdmin: Signer
  claimIssuer: Signer
  aliceWallet: Signer
  bobWallet: Signer
  charlieWallet: Signer
  davidWallet: Signer
  anotherWallet: Signer
}

export interface ExtendedAccounts extends Record<string, Wallet | Signer | undefined> {
  deployer: Wallet | Signer
  aliceWallet: Wallet | Signer
  bobWallet: Wallet | Signer
  charlieWallet: Wallet | Signer
  tokenAgent: Wallet | Signer
  claimIssuerSigningKey?: Wallet
  aliceActionKey?: Wallet
}