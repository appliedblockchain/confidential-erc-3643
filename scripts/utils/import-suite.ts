import { Wallet, Signer, BaseContract } from 'ethers'
import { ethers, network } from 'hardhat'
import { NetworkName } from '@appliedblockchain/silentdatarollup-core'
import { SilentDataRollupProvider } from '@appliedblockchain/silentdatarollup-ethers-provider'
import {
  ClaimTopicsRegistry,
  TrustedIssuersRegistry,
  IdentityRegistryStorage,
  DefaultCompliance,
  IdentityRegistry,
  Token,
  TREXImplementationAuthority,
  TREXFactory,
  IdFactory,
  ImplementationAuthority,
  ClaimIssuer,
  Identity,
} from '../../typechain-types'

interface Suite {
  claimIssuerContract?: ClaimIssuer
  claimTopicsRegistry: ClaimTopicsRegistry
  trustedIssuersRegistry: TrustedIssuersRegistry
  identityRegistryStorage: IdentityRegistryStorage
  defaultCompliance: DefaultCompliance
  identityRegistry: IdentityRegistry
  tokenOID: BaseContract // Identity contract
  token: Token
}

interface Authorities {
  identityImplementationAuthority: ImplementationAuthority
  trexImplementationAuthority: TREXImplementationAuthority
}

interface Factories {
  identityFactory: IdFactory
  trexFactory: TREXFactory
}

interface Implementations {
  identityImplementation: BaseContract // Identity contract
  claimTopicsRegistryImplementation: ClaimTopicsRegistry
  trustedIssuersRegistryImplementation: TrustedIssuersRegistry
  identityRegistryStorageImplementation: IdentityRegistryStorage
  identityRegistryImplementation: IdentityRegistry
  modularComplianceImplementation: BaseContract // ModularCompliance contract
  tokenImplementation: Token
}

interface Identities {
  aliceIdentity: Identity
  bobIdentity: Identity
  charlieIdentity: Identity
}

export interface ImportedSuite {
  accounts: Record<string, Wallet | Signer>
  suite: Suite
  authorities: Authorities
  factories: Factories
  implementations: Implementations
  identities?: Identities
}

function getContractFactory<T extends BaseContract>(name: string) {
  return ethers.getContractFactory(name) as unknown as Promise<T>
}

async function getSignersFromAccounts(accounts: any): Promise<Record<string, Wallet | Signer>> {
  const signers: Record<string, Wallet | Signer> = {}
  for (const account of accounts) {
    const [name, details] = Object.entries(account)[0] as [string, { address: string; privateKey?: string }]
    if (details.privateKey) {
      const url = (network.config as any).url as string
      const provider = new SilentDataRollupProvider({
        rpcUrl: url,
        network: NetworkName.TESTNET,
        chainId: network.config.chainId,
        privateKey: details.privateKey,
      })
      signers[name] = new ethers.Wallet(details.privateKey, provider as never)
    } else {
      signers[name] = await ethers.getSigner(details.address)
    }
  }

  return signers
}

/**
 * Import a suite from a JSON file and return the suite object with signers and contracts loaded
 */
export async function importSuite(filePath: string): Promise<ImportedSuite> {
  const fs = require('fs')
  const path = require('path')
  const { ethers } = require('hardhat')

  // Read the suite deployment JSON file
  const suiteJson = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  // Get contract factories
  const [
    ClaimTopicsRegistry,
    TrustedIssuersRegistry,
    IdentityRegistryStorage,
    DefaultCompliance,
    IdentityRegistry,
    Token,
    TREXImplementationAuthority,
    TREXFactory,
    IdFactory,
    ImplementationAuthority,
    ClaimIssuer,
    Identity,
  ] = await Promise.all([
    getContractFactory<ClaimTopicsRegistry>('ClaimTopicsRegistry'),
    getContractFactory<TrustedIssuersRegistry>('TrustedIssuersRegistry'),
    getContractFactory<IdentityRegistryStorage>('IdentityRegistryStorage'),
    getContractFactory<DefaultCompliance>('DefaultCompliance'),
    getContractFactory<IdentityRegistry>('IdentityRegistry'),
    getContractFactory<Token>('UCEF3643'),
    getContractFactory<TREXImplementationAuthority>('TREXImplementationAuthority'),
    getContractFactory<TREXFactory>('TREXFactory'),
    getContractFactory<IdFactory>('IdFactory'),
    getContractFactory<ImplementationAuthority>('ImplementationAuthority'),
    getContractFactory<ClaimIssuer>('ClaimIssuer'),
    getContractFactory<Identity>('Identity'),
  ])

  // Get signers from accounts
  const signers = await getSignersFromAccounts(suiteJson.accounts)

  const hasClaimIssuer = !!suiteJson.suite.claimIssuerContract

  // Load contracts
  const suite: Suite = {
    claimIssuerContract: hasClaimIssuer ? await ClaimIssuer.attach(suiteJson.suite.claimIssuerContract) as ClaimIssuer : undefined,
    claimTopicsRegistry: await ClaimTopicsRegistry.attach(suiteJson.suite.claimTopicsRegistry) as ClaimTopicsRegistry,
    trustedIssuersRegistry: await TrustedIssuersRegistry.attach(suiteJson.suite.trustedIssuersRegistry) as TrustedIssuersRegistry,
    identityRegistryStorage: await IdentityRegistryStorage.attach(suiteJson.suite.identityRegistryStorage) as IdentityRegistryStorage,
    defaultCompliance: await DefaultCompliance.attach(suiteJson.suite.defaultCompliance) as DefaultCompliance,
    identityRegistry: await IdentityRegistry.attach(suiteJson.suite.identityRegistry) as IdentityRegistry,
    tokenOID: await ethers.getContractAt('Identity', suiteJson.suite.tokenOID),
    token: await Token.attach(suiteJson.suite.token) as Token,
  }

  const authorities: Authorities = {
    identityImplementationAuthority: await ImplementationAuthority.attach(
      suiteJson.authorities.identityImplementationAuthority,
    ) as ImplementationAuthority,
    trexImplementationAuthority: await TREXImplementationAuthority.attach(
      suiteJson.authorities.trexImplementationAuthority,
    ) as TREXImplementationAuthority,
  }

  const factories: Factories = {
    identityFactory: await IdFactory.attach(suiteJson.factories.identityFactory) as IdFactory,
    trexFactory: await TREXFactory.attach(suiteJson.factories.trexFactory) as TREXFactory,
  }

  const implementations: Implementations = {
    identityImplementation: await ethers.getContractAt('Identity', suiteJson.implementations.identityImplementation),
    claimTopicsRegistryImplementation: await ClaimTopicsRegistry.attach(
      suiteJson.implementations.claimTopicsRegistryImplementation,
    ) as ClaimTopicsRegistry,
    trustedIssuersRegistryImplementation: await TrustedIssuersRegistry.attach(
      suiteJson.implementations.trustedIssuersRegistryImplementation,
    ) as TrustedIssuersRegistry,
    identityRegistryStorageImplementation: await IdentityRegistryStorage.attach(
      suiteJson.implementations.identityRegistryStorageImplementation,
    ) as IdentityRegistryStorage,
    identityRegistryImplementation: await IdentityRegistry.attach(
      suiteJson.implementations.identityRegistryImplementation,
    ) as IdentityRegistry,
    modularComplianceImplementation: await ethers.getContractAt(
      'ModularCompliance',
      suiteJson.implementations.modularComplianceImplementation,
    ),
    tokenImplementation: await Token.attach(suiteJson.implementations.tokenImplementation) as Token,
  }

  const hasIdentities = !!suiteJson.identities
  let identities: Identities | undefined
  if (hasIdentities) {
    identities = {
      aliceIdentity: await Identity.attach(suiteJson.identities.aliceIdentity) as Identity,
      bobIdentity: await Identity.attach(suiteJson.identities.bobIdentity) as Identity,
      charlieIdentity: await Identity.attach(suiteJson.identities.charlieIdentity) as Identity,
    }
  }

  return {
    accounts: signers,
    suite,
    authorities,
    factories,
    implementations,
    identities,
  }
}
