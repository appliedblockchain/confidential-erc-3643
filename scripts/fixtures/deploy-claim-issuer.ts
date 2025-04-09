import { ethers } from 'hardhat'
import pc from 'picocolors'
import OnchainID from '@onchain-id/solidity'
import { ClaimIssuer } from '../../typechain-types'
import { ImportedSuite, deployContractWithAbi, waitTx } from '../utils'

export async function deployClaimIssuer(data: ImportedSuite) {
  console.log(pc.green('Deploying claim issuer, identities and claims...'))

  const { claimTopicsRegistry, trustedIssuersRegistry } = data.suite
  const { deployer } = data.accounts

  const claimIssuerSigningKey = ethers.Wallet.createRandom()
  data.accounts.claimIssuerSigningKey = claimIssuerSigningKey

  console.log(pc.yellow('7/15 Adding Claim Topic...'))
  const claimTopics = [ethers.id('CLAIM_TOPIC')]
  if ((await claimTopicsRegistry.getClaimTopics()).length === 0) {
    await waitTx(await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0]))
  }

  const claimIssuerContract = await deployContractWithAbi<ClaimIssuer>(OnchainID.contracts.ClaimIssuer, deployer, [
    await deployer.getAddress(),
  ])
  data.suite.claimIssuerContract = claimIssuerContract

  console.log(pc.yellow('8/15 Adding Claim Issuer Key...'))
  await claimIssuerContract
    .connect(deployer)
    .addKey(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [claimIssuerSigningKey.address])),
      3,
      1,
    )

  console.log(pc.yellow('9/15 Adding Trusted Issuer...'))
  await waitTx(
    await trustedIssuersRegistry
      .connect(deployer)
      .addTrustedIssuer(await claimIssuerContract.getAddress(), claimTopics),
  )

  console.log(pc.green('Claim issuer deployed successfully!'))

  return data
}
