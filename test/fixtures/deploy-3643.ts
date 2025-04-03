import { ethers } from 'hardhat'
import { UCEF3643Contracts, UCEF3643 } from '../..'
import TREX from '@tokenysolutions/t-rex'
import { MockIdentityRegistry, MockCompliance, MockTrexImplementationAuthority } from '../../typechain-types'
import { Signer } from 'ethers'

export async function deployToken3643({
  agent,
  name,
  symbol,
  decimals,
  onchainID,
}: {
  agent: Signer
  name: string
  symbol: string
  decimals: number
  onchainID: string
}) {
  const agentAddress = await agent.getAddress()
  // Deploy mock contracts
  const MockIdentityRegistry = await ethers.getContractFactory('MockIdentityRegistry')
  const mockIdentityRegistry = (await MockIdentityRegistry.deploy()) as unknown as MockIdentityRegistry
  await mockIdentityRegistry.waitForDeployment()

  const MockCompliance = await ethers.getContractFactory('MockCompliance')
  const mockCompliance = (await MockCompliance.deploy()) as unknown as MockCompliance
  await mockCompliance.waitForDeployment()

  // Deploy UCEF3643
  const tokenFactory = await ethers.getContractFactory(
    UCEF3643Contracts.UCEF3643.abi,
    UCEF3643Contracts.UCEF3643.bytecode,
  )
  const token = (await tokenFactory.deploy()) as unknown as UCEF3643
  await token.waitForDeployment()

  // Deploy TrexIAuthority
  const TrexIAuthority = await ethers.getContractFactory('MockTrexImplementationAuthority')
  const trexIAuthority = (await TrexIAuthority.deploy(
    await token.getAddress(),
  )) as unknown as MockTrexImplementationAuthority
  await trexIAuthority.waitForDeployment()

  // Deploy UCEF3643 with proxy
  const TokenProxy = await ethers.getContractFactory(TREX.contracts.TokenProxy.abi, TREX.contracts.TokenProxy.bytecode)
  const tokenProxy_ = (await TokenProxy.deploy(
    await trexIAuthority.getAddress(),
    await mockIdentityRegistry.getAddress(),
    await mockCompliance.getAddress(),
    name,
    symbol,
    decimals,
    onchainID,
  )) as unknown as UCEF3643
  await tokenProxy_.waitForDeployment()

  const tokenProxy = (await ethers.getContractAt(
    UCEF3643Contracts.UCEF3643.abi,
    await tokenProxy_.getAddress(),
  )) as unknown as UCEF3643

  // Register and verify agent identity
  await mockIdentityRegistry.registerIdentity(agentAddress, 1, true)
  await mockIdentityRegistry.setVerified(agentAddress, true)

  // Grant agent role to our test agent
  await tokenProxy.addAgent(agentAddress)

  // Set up mock to allow minting
  await mockCompliance.setCanTransfer(ethers.ZeroAddress, true)

  // Unpause the token
  await tokenProxy.connect(agent).unpause()

  return { token: tokenProxy, mockIdentityRegistry, mockCompliance, trexIAuthority }
}
