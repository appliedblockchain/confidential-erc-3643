import { BaseContract, ContractTransactionResponse, Signer } from 'ethers'
import { ethers, network } from 'hardhat'
import { NetworkName } from '@appliedblockchain/silentdatarollup-core'
import { SilentDataRollupProvider } from '@appliedblockchain/silentdatarollup-ethers-provider'
import OnchainID from '@onchain-id/solidity'
import { Identity } from '../..'

export async function deployContract<T extends BaseContract>(
  name: string,
  signer: Signer,
  args: any[] = [],
  contractName = name,
) {
  const factory = await ethers.getContractFactory(name, signer)
  const contract = await factory.deploy(...args)

  await contract.waitForDeployment()

  return ethers.getContractAt(contractName, await contract.getAddress(), signer) as unknown as Promise<T>
}

export async function deployContractWithAbi<T extends BaseContract>(
  artifacts: { abi: any; bytecode: any; contractName: string },
  signer: Signer,
  args: any[] = [],
  returnArtifacts?: { abi: any; bytecode: any; contractName: string },
) {
  const { abi, bytecode } = artifacts
  const factory = new ethers.ContractFactory(abi, bytecode, signer)
  const contract = await factory.deploy(...args)

  await contract.waitForDeployment()

  return ethers.getContractAt(returnArtifacts?.abi || abi, await contract.getAddress(), signer) as unknown as Promise<T>
}

export async function deployIdentityProxy(implementationAuthority: string, managementKey: string, signer: Signer) {
  return deployContractWithAbi<Identity>(
    OnchainID.contracts.IdentityProxy,
    signer,
    [implementationAuthority, managementKey],
    OnchainID.contracts.Identity,
  )
}

export async function waitTx(tx: ContractTransactionResponse) {
  return tx.wait()
}

export function createRandomWallet() {
  let wallet = ethers.Wallet.createRandom()
  if (network.name === 'silentdata') {
    const url = (network.config as any).url as string
    const provider = new SilentDataRollupProvider({
      rpcUrl: url,
      network: NetworkName.TESTNET,
      chainId: network.config.chainId,
      privateKey: wallet.privateKey,
    })
    wallet = wallet.connect(provider as any)
  } else {
    wallet = wallet.connect(ethers.provider)
  }

  return wallet
}

export function createWallet(privateKey: string) {
  let wallet = new ethers.Wallet(privateKey)
  if (network.name === 'silentdata') {
    const url = (network.config as any).url as string
    const provider = new SilentDataRollupProvider({
      rpcUrl: url,
      network: NetworkName.TESTNET,
      chainId: network.config.chainId,
      privateKey: wallet.privateKey,
    })
    wallet = wallet.connect(provider as any)
  } else {
    wallet = wallet.connect(ethers.provider)
  }

  return wallet
}
